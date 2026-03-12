import { create } from 'zustand';
import type {
  OfficeStore,
  Floor,
  Room,
  Desk,
  Agent,
  AgentStatus,
  AgentAppearance,
  ViewMode,
  Vec3,
  Anchor,
  Meeting,
  MovementState,
  UserAvatarState,
  QualityTier,
  ScreenContentType,
  AppMode,
} from '../types';

// ─── Theme & Layout constants ──────────────────────────────────
export type OfficeTheme = 'violet' | 'blue' | 'warm';
export type OfficeLayout = 'standard' | 'open' | 'compact';

export const THEME_COLORS: Record<OfficeTheme, {
  floor: string; floorAccent: string; wall: string;
  desk: string; chair: string; ambient: string;
  lightColor: string;
}> = {
  violet: {
    floor: '#ede5f8', floorAccent: '#ddd5eb', wall: '#e8e0f5',
    desk: '#d0c0e0', chair: '#8070a0', ambient: '#e0d0f0',
    lightColor: '#fff0e8',
  },
  blue: {
    floor: '#e5edf8', floorAccent: '#d5dde8', wall: '#e0e8f5',
    desk: '#c0cfe0', chair: '#607aa0', ambient: '#d0e0f0',
    lightColor: '#f8f0ff',
  },
  warm: {
    floor: '#f0ebe0', floorAccent: '#e0d8c8', wall: '#ece4d8',
    desk: '#d8c8a0', chair: '#8a7060', ambient: '#f0e8d0',
    lightColor: '#fff8e0',
  },
};

export const DESK_LAYOUTS: Record<OfficeLayout, {
  position: [number, number, number];
  rotation: [number, number, number];
}[]> = {
  standard: [
    { position: [-6, 0, -5.5], rotation: [0, 0, 0] },
    { position: [-3, 0, -5.5], rotation: [0, 0, 0] },
    { position: [0, 0, -5.5], rotation: [0, 0, 0] },
    { position: [3, 0, -5.5], rotation: [0, 0, 0] },
    { position: [6, 0, -5.5], rotation: [0, 0, 0] },
    { position: [-6, 0, -1.5], rotation: [0, Math.PI, 0] },
    { position: [-3, 0, -1.5], rotation: [0, Math.PI, 0] },
    { position: [0, 0, -1.5], rotation: [0, Math.PI, 0] },
    { position: [3, 0, -1.5], rotation: [0, Math.PI, 0] },
    { position: [6, 0, -1.5], rotation: [0, Math.PI, 0] },
  ],
  open: [
    { position: [-5, 0, -5], rotation: [0, Math.PI / 4, 0] },
    { position: [0, 0, -6], rotation: [0, 0, 0] },
    { position: [5, 0, -5], rotation: [0, -Math.PI / 4, 0] },
    { position: [-5, 0, 2], rotation: [0, Math.PI * 0.75, 0] },
    { position: [0, 0, 0], rotation: [0, Math.PI / 2, 0] },
    { position: [5, 0, 2], rotation: [0, -Math.PI * 0.75, 0] },
  ],
  compact: [
    { position: [-5, 0, -5.5], rotation: [0, 0, 0] },
    { position: [-2.5, 0, -5.5], rotation: [0, 0, 0] },
    { position: [0, 0, -5.5], rotation: [0, 0, 0] },
    { position: [2.5, 0, -5.5], rotation: [0, 0, 0] },
    { position: [-5, 0, -2], rotation: [0, Math.PI, 0] },
    { position: [-2.5, 0, -2], rotation: [0, Math.PI, 0] },
    { position: [0, 0, -2], rotation: [0, Math.PI, 0] },
    { position: [2.5, 0, -2], rotation: [0, Math.PI, 0] },
  ],
};

// ─── ID helpers ─────────────────────────────────────────────────
let _uid = 0;
const uid = (prefix: string) => `${prefix}-${++_uid}`;

// ─── Desk factory ───────────────────────────────────────────────
interface DeskInput {
  label: string;
  position: Vec3;
  rotation?: number;
  assignedAgentId?: string | null;
}

const makeDesk = (input: DeskInput): Desk => ({
  id: uid('desk'),
  label: input.label,
  position: input.position,
  rotation: input.rotation ?? 0,
  assignedAgentId: input.assignedAgentId ?? null,
});

// ─── Room factory ───────────────────────────────────────────────
interface RoomInput {
  name: string;
  type: Room['type'];
  position: Vec3;
  size: [number, number];
  desks: DeskInput[];
}

const makeRoom = (input: RoomInput): Room => ({
  id: uid('room'),
  name: input.name,
  type: input.type,
  position: input.position,
  size: input.size,
  furniture: {
    desks: input.desks.map(makeDesk),
  },
});

// ─── Default data ───────────────────────────────────────────────

const GROUND_FLOOR_ID = 'floor-ground';
const FIRST_FLOOR_ID = 'floor-first';

const AGENT_IDS = {
  ada: 'agent-ada',
  marcus: 'agent-marcus',
  priya: 'agent-priya',
  omar: 'agent-omar',
  elena: 'agent-elena',
  james: 'agent-james',
} as const;

// ── Chair offset constant ──
const CHAIR_OFFSET_Z = 0.8;

/** Compute the world-space chair position for a desk. */
export function chairPosition(deskPos: Vec3, rotation: number): Vec3 {
  const cz = CHAIR_OFFSET_Z * Math.cos(rotation);
  const cx = CHAIR_OFFSET_Z * Math.sin(rotation);
  return [deskPos[0] + cx, 0, deskPos[2] + cz];
}

// ── Default appearance factory ──
function defaultAppearance(overrides: Partial<AgentAppearance>): AgentAppearance {
  return {
    skinColor: '#e8b89a',
    hairColor: '#3a2520',
    shirtColor: '#2c3e6b',
    pantsColor: '#34404f',
    shoeColor: '#1a1a2e',
    hairStyle: 'short',
    eyeColor: '#4a6741',
    glasses: false,
    beardStyle: 'none',
    height: 1.0,
    ...overrides,
  };
}

// ── Screen content by role ──
export function screenForRole(role: string): ScreenContentType {
  const r = role.toLowerCase();
  if (r.includes('engineer') || r.includes('devops')) return 'code';
  if (r.includes('design')) return 'design';
  if (r.includes('ai')) return 'terminal';
  if (r.includes('architect')) return 'dashboard';
  return 'code';
}

// ── Ground Floor rooms ──
const groundFloorRooms: Room[] = [
  makeRoom({
    name: 'Main Office',
    type: 'open-office',
    position: [-3, 0, -3],
    size: [10, 8],
    desks: [
      { label: 'Desk A1', position: [-6, 0, -5], rotation: 0, assignedAgentId: AGENT_IDS.ada },
      { label: 'Desk A2', position: [-3, 0, -5], rotation: 0, assignedAgentId: AGENT_IDS.marcus },
      { label: 'Desk A3', position: [-6, 0, -1.5], rotation: Math.PI, assignedAgentId: null },
      { label: 'Desk A4', position: [-3, 0, -1.5], rotation: Math.PI, assignedAgentId: AGENT_IDS.priya },
    ],
  }),
  makeRoom({
    name: 'Meeting Room Alpha',
    type: 'meeting-room',
    position: [5, 0, -3],
    size: [6, 6],
    desks: [
      { label: 'Conf A', position: [4, 0, -5], rotation: 0 },
      { label: 'Conf B', position: [7, 0, -5], rotation: 0 },
    ],
  }),
  makeRoom({
    name: 'Kitchen',
    type: 'kitchen',
    position: [5, 0, 5],
    size: [5, 4],
    desks: [],
  }),
  makeRoom({
    name: 'Lounge',
    type: 'lounge',
    position: [-4, 0, 5],
    size: [6, 4],
    desks: [
      { label: 'Hot Desk L1', position: [-5, 0, 4.5], rotation: 0 },
    ],
  }),
];

// ── First Floor rooms ──
const firstFloorRooms: Room[] = [
  makeRoom({
    name: 'Engineering Bay',
    type: 'open-office',
    position: [-3, 0, -3],
    size: [10, 8],
    desks: [
      { label: 'Eng B1', position: [-6, 0, -5], rotation: 0, assignedAgentId: AGENT_IDS.omar },
      { label: 'Eng B2', position: [-3, 0, -5], rotation: 0, assignedAgentId: AGENT_IDS.elena },
      { label: 'Eng B3', position: [-6, 0, -1.5], rotation: Math.PI, assignedAgentId: AGENT_IDS.james },
    ],
  }),
  makeRoom({
    name: 'War Room',
    type: 'meeting-room',
    position: [5, 0, -3],
    size: [6, 6],
    desks: [
      { label: 'War A', position: [4, 0, -5], rotation: 0 },
      { label: 'War B', position: [7, 0, -5], rotation: 0 },
    ],
  }),
  makeRoom({
    name: 'Server Room',
    type: 'server-room',
    position: [5, 0, 5],
    size: [5, 4],
    desks: [],
  }),
];

// ── Default floors ──
const defaultFloors: Floor[] = [
  {
    id: GROUND_FLOOR_ID,
    name: 'Ground Floor',
    level: 0,
    rooms: groundFloorRooms,
    color: '#8b5cf6',
    floorColor: '#8b5cf6',
  },
  {
    id: FIRST_FLOOR_ID,
    name: 'First Floor',
    level: 1,
    rooms: firstFloorRooms,
    color: '#3b82f6',
    floorColor: '#3b82f6',
  },
];

// ── Default agents ──
const defaultAgents: Agent[] = [
  {
    id: AGENT_IDS.ada,
    name: 'Ada Chen',
    role: 'Architect',
    gender: 'female',
    status: 'working',
    avatarColor: '#6c5ce7',
    appearance: defaultAppearance({
      skinColor: '#c68642',
      hairColor: '#1a1a2e',
      shirtColor: '#6c5ce7',
      pantsColor: '#2d3436',
      shoeColor: '#4a3060',
      hairStyle: 'long',
      eyeColor: '#3d2b1f',
      glasses: true,
      height: 1.03,
    }),
    floorId: GROUND_FLOOR_ID,
    deskId: null,
    position: chairPosition([-6, 0, -5], 0),
    movementState: 'stationary',
    targetPosition: null,
    facingAngle: Math.PI,
    screenContent: 'dashboard',
    currentTask: 'System Architecture',
  },
  {
    id: AGENT_IDS.marcus,
    name: 'Marcus Johnson',
    role: 'Backend Engineer',
    gender: 'male',
    status: 'working',
    avatarColor: '#00b894',
    appearance: defaultAppearance({
      skinColor: '#8d5524',
      hairColor: '#0a0a0a',
      shirtColor: '#00b894',
      pantsColor: '#1a1a2e',
      shoeColor: '#2d1b00',
      hairStyle: 'buzz',
      eyeColor: '#1a0e00',
      beardStyle: 'full',
      height: 1.07,
    }),
    floorId: GROUND_FLOOR_ID,
    deskId: null,
    position: chairPosition([-3, 0, -5], 0),
    movementState: 'stationary',
    targetPosition: null,
    facingAngle: Math.PI,
    screenContent: 'code',
    currentTask: 'API Endpoints',
  },
  {
    id: AGENT_IDS.priya,
    name: 'Priya Sharma',
    role: 'AI Engineer',
    gender: 'female',
    status: 'idle',
    avatarColor: '#fd79a8',
    appearance: defaultAppearance({
      skinColor: '#c68642',
      hairColor: '#2d1b00',
      shirtColor: '#fd79a8',
      pantsColor: '#636e72',
      shoeColor: '#1a1a1a',
      hairStyle: 'curly',
      eyeColor: '#3d2b1f',
      height: 0.95,
    }),
    floorId: GROUND_FLOOR_ID,
    deskId: null,
    position: chairPosition([-3, 0, -1.5], Math.PI),
    movementState: 'stationary',
    targetPosition: null,
    facingAngle: 0,
    screenContent: 'terminal',
    currentTask: 'Model Training',
  },
  {
    id: AGENT_IDS.omar,
    name: 'Omar Hassan',
    role: 'Frontend Engineer',
    gender: 'male',
    status: 'working',
    avatarColor: '#0984e3',
    appearance: defaultAppearance({
      skinColor: '#e0ac69',
      hairColor: '#2d1b00',
      shirtColor: '#0984e3',
      pantsColor: '#2d3436',
      shoeColor: '#1a1a2e',
      hairStyle: 'medium',
      eyeColor: '#4a3728',
      beardStyle: 'stubble',
      height: 1.01,
    }),
    floorId: FIRST_FLOOR_ID,
    deskId: null,
    position: chairPosition([-6, 0, -5], 0),
    movementState: 'stationary',
    targetPosition: null,
    facingAngle: Math.PI,
    screenContent: 'code',
    currentTask: 'UI Components',
  },
  {
    id: AGENT_IDS.elena,
    name: 'Elena Rossi',
    role: 'Designer',
    gender: 'female',
    status: 'meeting',
    avatarColor: '#e17055',
    appearance: defaultAppearance({
      skinColor: '#f1c27d',
      hairColor: '#b5651d',
      shirtColor: '#e17055',
      pantsColor: '#0984e3',
      shoeColor: '#d63031',
      hairStyle: 'ponytail',
      eyeColor: '#4a8b5c',
      height: 1.0,
    }),
    floorId: FIRST_FLOOR_ID,
    deskId: null,
    position: chairPosition([-3, 0, -5], 0),
    movementState: 'stationary',
    targetPosition: null,
    facingAngle: Math.PI,
    screenContent: 'design',
    currentTask: 'Landing Page',
  },
  {
    id: AGENT_IDS.james,
    name: 'James Park',
    role: 'DevOps',
    gender: 'male',
    status: 'break',
    avatarColor: '#74b9ff',
    appearance: defaultAppearance({
      skinColor: '#ffdbac',
      hairColor: '#d4a574',
      shirtColor: '#74b9ff',
      pantsColor: '#636e72',
      shoeColor: '#2d3436',
      hairStyle: 'short',
      eyeColor: '#5a4e3a',
      glasses: true,
      beardStyle: 'short',
      height: 0.96,
    }),
    floorId: FIRST_FLOOR_ID,
    deskId: null,
    position: chairPosition([-6, 0, -1.5], Math.PI),
    movementState: 'stationary',
    targetPosition: null,
    facingAngle: 0,
    screenContent: 'terminal',
    currentTask: 'CI/CD Pipeline',
  },
];

// ── Default anchors (meeting spots, interaction points) ──
const defaultAnchors: Anchor[] = [
  // Ground floor meeting room spots (around the circular table)
  {
    id: 'anchor-gf-meet-1', type: 'meeting-spot',
    position: [4.5, 0, -2], rotation: Math.PI / 2,
    floorId: GROUND_FLOOR_ID, capacity: 1, occupantIds: [],
  },
  {
    id: 'anchor-gf-meet-2', type: 'meeting-spot',
    position: [6.5, 0, -2], rotation: -Math.PI / 2,
    floorId: GROUND_FLOOR_ID, capacity: 1, occupantIds: [],
  },
  {
    id: 'anchor-gf-meet-3', type: 'meeting-spot',
    position: [5.5, 0, -1], rotation: Math.PI,
    floorId: GROUND_FLOOR_ID, capacity: 1, occupantIds: [],
  },
  {
    id: 'anchor-gf-meet-4', type: 'meeting-spot',
    position: [5.5, 0, -3], rotation: 0,
    floorId: GROUND_FLOOR_ID, capacity: 1, occupantIds: [],
  },
  // Kitchen interaction spot
  {
    id: 'anchor-gf-kitchen', type: 'kitchen-spot',
    position: [5, 0, 5], rotation: 0,
    floorId: GROUND_FLOOR_ID, capacity: 3, occupantIds: [],
  },
  // Lounge spot
  {
    id: 'anchor-gf-lounge', type: 'lounge-spot',
    position: [-4, 0, 5], rotation: 0,
    floorId: GROUND_FLOOR_ID, capacity: 4, occupantIds: [],
  },
  // Hallway interaction point (between rooms)
  {
    id: 'anchor-gf-hall', type: 'interaction-point',
    position: [0, 0, 1], rotation: 0,
    floorId: GROUND_FLOOR_ID, capacity: 2, occupantIds: [],
  },
  // First floor meeting spots
  {
    id: 'anchor-f1-meet-1', type: 'meeting-spot',
    position: [4.5, 0, -2], rotation: Math.PI / 2,
    floorId: FIRST_FLOOR_ID, capacity: 1, occupantIds: [],
  },
  {
    id: 'anchor-f1-meet-2', type: 'meeting-spot',
    position: [6.5, 0, -2], rotation: -Math.PI / 2,
    floorId: FIRST_FLOOR_ID, capacity: 1, occupantIds: [],
  },
  {
    id: 'anchor-f1-meet-3', type: 'meeting-spot',
    position: [5.5, 0, -1], rotation: Math.PI,
    floorId: FIRST_FLOOR_ID, capacity: 1, occupantIds: [],
  },
  {
    id: 'anchor-f1-hall', type: 'interaction-point',
    position: [0, 0, 1], rotation: 0,
    floorId: FIRST_FLOOR_ID, capacity: 2, occupantIds: [],
  },
];

// ── Wire up deskIds ──
function wireAgentDesks(floors: Floor[], agents: Agent[]): void {
  for (const floor of floors) {
    for (const room of floor.rooms) {
      for (const desk of room.furniture.desks) {
        if (desk.assignedAgentId) {
          const agent = agents.find((a) => a.id === desk.assignedAgentId);
          if (agent) {
            agent.deskId = desk.id;
          }
        }
      }
    }
  }
}

wireAgentDesks(defaultFloors, defaultAgents);

// ─── Helpers ────────────────────────────────────────────────────
function findDesk(
  floors: Floor[],
  deskId: string,
): { floor: Floor; room: Room; desk: Desk } | null {
  for (const floor of floors) {
    for (const room of floor.rooms) {
      const desk = room.furniture.desks.find((d) => d.id === deskId);
      if (desk) return { floor, room, desk };
    }
  }
  return null;
}

// ─── Default user avatar ─────────────────────────────────────────
const defaultUserAvatar: UserAvatarState = {
  enabled: false,
  position: [0, 0, 3],
  rotation: 0,
  appearance: defaultAppearance({
    skinColor: '#e8c8a0',
    hairColor: '#2a1a10',
    shirtColor: '#4a4a6a',
    pantsColor: '#2a2a3a',
    shoeColor: '#1a1a1a',
    hairStyle: 'short',
    height: 1.02,
  }),
  cameraMode: 'orbit',
  moveSpeed: 4.0,
};

// ─── Extended store type ────────────────────────────────────────
interface OfficeStoreExtended extends OfficeStore {
  theme: OfficeTheme;
  layout: OfficeLayout;
  setTheme: (theme: OfficeTheme) => void;
  setLayout: (layout: OfficeLayout) => void;
  getActiveFloor: () => { yOffset: number; level: number };
}

const FLOOR_HEIGHT = 4;

// ─── Store ──────────────────────────────────────────────────────
export const useOfficeStore = create<OfficeStoreExtended>((set, get) => ({
  // ── State ─────────────────────────────────────────────────
  appMode: 'office' as AppMode,
  floors: defaultFloors,
  agents: defaultAgents,
  anchors: defaultAnchors,
  selectedFloorId: GROUND_FLOOR_ID,
  selectedAgentId: null,
  cameraMode: 'orbit',
  viewMode: 'exterior' as ViewMode,
  viewingFloorLevel: 0,
  sidebarOpen: true,
  theme: 'violet' as OfficeTheme,
  layout: 'standard' as OfficeLayout,

  // User
  userAvatar: defaultUserAvatar,

  // Simulation
  events: [],
  meetings: [],
  simulationRunning: true,

  // Quality
  qualityTier: 'medium' as QualityTier,

  // UI
  activePanel: null,

  // ── App mode ─────────────────────────────────────────────
  setAppMode: (mode) => set({ appMode: mode }),

  // ── Floor CRUD ────────────────────────────────────────────
  addFloor: () =>
    set((state) => {
      const nextLevel = state.floors.length;
      const hues = ['#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];
      const newFloor: Floor = {
        id: uid('floor'),
        name: `Floor ${nextLevel}`,
        level: nextLevel,
        rooms: [
          makeRoom({
            name: 'Open Space',
            type: 'open-office',
            position: [-4, 0, -2],
            size: [8, 6],
            desks: [
              { label: 'Desk 1', position: [-6, 0, -3], rotation: 0 },
              { label: 'Desk 2', position: [-4, 0, -3], rotation: 0 },
            ],
          }),
          makeRoom({
            name: 'Meeting Room',
            type: 'meeting-room',
            position: [4, 0, -2],
            size: [5, 5],
            desks: [
              { label: 'Conf 1', position: [3, 0, -3], rotation: 0 },
            ],
          }),
        ],
        color: hues[nextLevel % hues.length],
        floorColor: hues[nextLevel % hues.length],
      };
      return { floors: [...state.floors, newFloor] };
    }),

  removeFloor: (id) =>
    set((state) => {
      if (state.floors.length <= 1) return state;
      const removedFloor = state.floors.find((f) => f.id === id);
      const floors = state.floors
        .filter((f) => f.id !== id)
        .map((f, i) => ({ ...f, level: i }));

      let agents = state.agents;
      if (removedFloor && floors.length > 0) {
        agents = state.agents.map((a) =>
          a.floorId === id
            ? { ...a, floorId: floors[0].id, deskId: null, position: [0, 0, 0] as Vec3 }
            : a,
        );
      }

      return {
        floors,
        agents,
        selectedFloorId:
          state.selectedFloorId === id ? floors[0]?.id ?? null : state.selectedFloorId,
        viewingFloorLevel: Math.min(state.viewingFloorLevel, floors.length - 1),
      };
    }),

  renameFloor: (id, name) =>
    set((state) => ({
      floors: state.floors.map((f) => (f.id === id ? { ...f, name } : f)),
    })),

  // ── Agent actions ─────────────────────────────────────────
  moveAgent: (agentId, targetFloorId) =>
    set((state) => {
      const agent = state.agents.find((a) => a.id === agentId);
      const targetFloor = state.floors.find((f) => f.id === targetFloorId);
      if (!agent || !targetFloor) return state;

      const floors = state.floors.map((floor) => ({
        ...floor,
        rooms: floor.rooms.map((room) => ({
          ...room,
          furniture: {
            ...room.furniture,
            desks: room.furniture.desks.map((desk) =>
              desk.assignedAgentId === agentId
                ? { ...desk, assignedAgentId: null }
                : desk,
            ),
          },
        })),
      }));

      let newDeskId: string | null = null;
      let newPosition: Vec3 = [0, 0, 0];
      for (const room of targetFloor.rooms) {
        for (const desk of room.furniture.desks) {
          if (!desk.assignedAgentId) {
            newDeskId = desk.id;
            newPosition = chairPosition(desk.position, desk.rotation);
            break;
          }
        }
        if (newDeskId) break;
      }

      const updatedFloors = newDeskId
        ? floors.map((floor) => ({
            ...floor,
            rooms: floor.rooms.map((room) => ({
              ...room,
              furniture: {
                ...room.furniture,
                desks: room.furniture.desks.map((desk) =>
                  desk.id === newDeskId
                    ? { ...desk, assignedAgentId: agentId }
                    : desk,
                ),
              },
            })),
          }))
        : floors;

      const agents = state.agents.map((a) =>
        a.id === agentId
          ? { ...a, floorId: targetFloorId, deskId: newDeskId, position: newPosition }
          : a,
      );

      return { floors: updatedFloors, agents };
    }),

  assignAgentToDesk: (agentId, deskId) =>
    set((state) => {
      const result = findDesk(state.floors, deskId);
      if (!result) return state;

      const { desk } = result;
      if (desk.assignedAgentId && desk.assignedAgentId !== agentId) return state;

      const floors = state.floors.map((floor) => ({
        ...floor,
        rooms: floor.rooms.map((room) => ({
          ...room,
          furniture: {
            ...room.furniture,
            desks: room.furniture.desks.map((d) => {
              if (d.assignedAgentId === agentId) return { ...d, assignedAgentId: null };
              if (d.id === deskId) return { ...d, assignedAgentId: agentId };
              return d;
            }),
          },
        })),
      }));

      const agents = state.agents.map((a) =>
        a.id === agentId
          ? {
              ...a,
              floorId: result.floor.id,
              deskId,
              position: chairPosition(desk.position, desk.rotation),
            }
          : a,
      );

      return { floors, agents };
    }),

  selectAgent: (id) => set({ selectedAgentId: id }),

  setAgentStatus: (agentId: string, status: AgentStatus) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, status } : a,
      ),
    })),

  updateAgentAppearance: (agentId: string, appearance: Partial<AgentAppearance>) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId
          ? { ...a, appearance: { ...a.appearance, ...appearance } }
          : a,
      ),
    })),

  // ── Movement ──────────────────────────────────────────────
  setAgentTarget: (agentId: string, target: Vec3) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId
          ? { ...a, targetPosition: target, movementState: 'walking' as MovementState }
          : a,
      ),
    })),

  updateAgentPosition: (agentId: string, position: Vec3, movState: MovementState) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId
          ? {
              ...a,
              position,
              movementState: movState,
              targetPosition: movState === 'stationary' ? null : a.targetPosition,
            }
          : a,
      ),
    })),

  setAgentFacing: (agentId: string, angle: number) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, facingAngle: angle } : a,
      ),
    })),

  // ── Simulation ────────────────────────────────────────────
  pushEvent: (eventData) =>
    set((state) => ({
      events: [
        ...state.events.slice(-49), // keep last 50 events
        {
          ...eventData,
          id: uid('evt'),
          timestamp: Date.now(),
        },
      ],
    })),

  startMeeting: (title, organizerId, participantIds, anchorId, floorId) =>
    set((state) => {
      const meeting: Meeting = {
        id: uid('meeting'),
        title,
        anchorId,
        floorId,
        organizerId,
        participantIds,
        status: 'gathering',
        startedAt: Date.now(),
      };
      return { meetings: [...state.meetings, meeting] };
    }),

  endMeeting: (meetingId: string) =>
    set((state) => ({
      meetings: state.meetings.map((m) =>
        m.id === meetingId ? { ...m, status: 'dispersing' as const } : m,
      ),
    })),

  toggleSimulation: () =>
    set((state) => ({ simulationRunning: !state.simulationRunning })),

  // ── User ──────────────────────────────────────────────────
  setUserPosition: (position) =>
    set((state) => ({
      userAvatar: { ...state.userAvatar, position },
    })),

  setUserRotation: (rotation) =>
    set((state) => ({
      userAvatar: { ...state.userAvatar, rotation },
    })),

  setUserCameraMode: (mode) =>
    set((state) => ({
      userAvatar: { ...state.userAvatar, cameraMode: mode },
    })),

  toggleUserAvatar: () =>
    set((state) => ({
      userAvatar: { ...state.userAvatar, enabled: !state.userAvatar.enabled },
    })),

  // ── Navigation ────────────────────────────────────────────
  selectFloor: (id) => {
    if (id === null) {
      set({ selectedFloorId: null });
      return;
    }
    const floor = get().floors.find((f) => f.id === id);
    if (floor) {
      set({ selectedFloorId: id, viewingFloorLevel: floor.level });
    }
  },

  setCameraMode: (mode) => set({ cameraMode: mode }),
  setViewMode: (mode) => set({ viewMode: mode }),

  setViewingFloor: (level) => {
    const floor = get().floors.find((f) => f.level === level);
    set({
      viewingFloorLevel: level,
      selectedFloorId: floor?.id ?? get().selectedFloorId,
    });
  },

  // ── Quality ───────────────────────────────────────────────
  setQualityTier: (tier) => set({ qualityTier: tier }),

  // ── UI ────────────────────────────────────────────────────
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActivePanel: (panel) => set({ activePanel: panel }),

  // ── Theme & Layout ────────────────────────────────────────
  setTheme: (theme) => set({ theme }),
  setLayout: (layout) => set({ layout }),

  // ── Derived ───────────────────────────────────────────────
  getActiveFloor: () => {
    const level = get().viewingFloorLevel;
    return { yOffset: level * FLOOR_HEIGHT, level };
  },
}));
