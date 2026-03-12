import { create } from 'zustand';
import type {
  OfficeStore,
  Floor,
  Room,
  Desk,
  Agent,
  AgentStatus,
  ViewMode,
  Vec3,
} from '../types';

// ─── Theme & Layout constants (consumed by MainScene) ──────────
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
  // Standard: two facing rows, 3.0 units apart on X, 3.5 units between rows on Z
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
  // Open: angled desks with ample spacing
  open: [
    { position: [-5, 0, -5], rotation: [0, Math.PI / 4, 0] },
    { position: [0, 0, -6], rotation: [0, 0, 0] },
    { position: [5, 0, -5], rotation: [0, -Math.PI / 4, 0] },
    { position: [-5, 0, 2], rotation: [0, Math.PI * 0.75, 0] },
    { position: [0, 0, 0], rotation: [0, Math.PI / 2, 0] },
    { position: [5, 0, 2], rotation: [0, -Math.PI * 0.75, 0] },
  ],
  // Compact: tighter rows but still 2.5 units on X, 3.0 on Z
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

// Floor IDs (stable so agents can reference them)
const GROUND_FLOOR_ID = 'floor-ground';
const FIRST_FLOOR_ID = 'floor-first';

// Agent IDs (stable so desks can reference them)
const AGENT_IDS = {
  ada: 'agent-ada',
  marcus: 'agent-marcus',
  priya: 'agent-priya',
  omar: 'agent-omar',
  elena: 'agent-elena',
  james: 'agent-james',
} as const;

// ── Chair offset constant (must match CHAIR_OFFSET_Z in MainScene) ──
const CHAIR_OFFSET_Z = 0.8;

/** Compute the world-space chair position for a desk. */
function chairPosition(deskPos: Vec3, rotation: number): Vec3 {
  // Chair is at local [0, 0, +CHAIR_OFFSET_Z], rotated by desk rotation around Y
  const cz = CHAIR_OFFSET_Z * Math.cos(rotation);
  const cx = CHAIR_OFFSET_Z * Math.sin(rotation);
  // Note: rotation around Y means local +Z maps to [sin(r), 0, cos(r)] but
  // Three.js Y-rotation: x' = x*cos + z*sin, z' = -x*sin + z*cos
  // For local offset [0, 0, OFFSET]: x' = OFFSET*sin(r), z' = OFFSET*cos(r)
  return [deskPos[0] + cx, 0, deskPos[2] + cz];
}

// ── Ground Floor rooms ──────────────────────────────────────────
// Desk spacing: 3.0 units apart on X, 3.5 units between facing rows on Z.
// Row 1 (rotation=0, faces -Z, chair at +Z): desks at Z=-4.5
// Row 2 (rotation=PI, faces +Z, chair at -Z): desks at Z=-1.0
// Gap between chair rows: (-4.5+0.8) to (-1.0-0.8) = -3.7 to -1.8 = 1.9 units clear
const groundFloorRooms: Room[] = [
  makeRoom({
    name: 'Main Office',
    type: 'open-office',
    position: [-3, 0, -3],
    size: [10, 8],
    desks: [
      // Row 1: facing the back wall (rotation=0), chairs behind at +Z
      { label: 'Desk A1', position: [-6, 0, -5], rotation: 0, assignedAgentId: AGENT_IDS.ada },
      { label: 'Desk A2', position: [-3, 0, -5], rotation: 0, assignedAgentId: AGENT_IDS.marcus },
      // Row 2: facing forward (rotation=PI), chairs behind at -Z
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

// ── First Floor rooms ───────────────────────────────────────────
const firstFloorRooms: Room[] = [
  makeRoom({
    name: 'Engineering Bay',
    type: 'open-office',
    position: [-3, 0, -3],
    size: [10, 8],
    desks: [
      // Row 1: facing back wall (rotation=0)
      { label: 'Eng B1', position: [-6, 0, -5], rotation: 0, assignedAgentId: AGENT_IDS.omar },
      { label: 'Eng B2', position: [-3, 0, -5], rotation: 0, assignedAgentId: AGENT_IDS.elena },
      // Row 2: facing forward (rotation=PI)
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

// ── Default floors ──────────────────────────────────────────────
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

// ── Default agents ──────────────────────────────────────────────
// Agent positions are at the CHAIR position (offset from desk center).
// Desk A1 [-6,0,-5] rot=0  → chair at [-6, 0, -5 + 0.8] = [-6, 0, -4.2]
// Desk A2 [-3,0,-5] rot=0  → chair at [-3, 0, -4.2]
// Desk A4 [-3,0,-1.5] rot=PI → chair at [-3, 0, -1.5 - 0.8] = [-3, 0, -2.3]
// Desk B1 [-6,0,-5] rot=0  → chair at [-6, 0, -4.2]
// Desk B2 [-3,0,-5] rot=0  → chair at [-3, 0, -4.2]
// Desk B3 [-6,0,-1.5] rot=PI → chair at [-6, 0, -2.3]
const defaultAgents: Agent[] = [
  {
    id: AGENT_IDS.ada,
    name: 'Ada Chen',
    role: 'Architect',
    gender: 'female',
    status: 'working',
    avatarColor: '#6c5ce7',
    appearance: {
      skinColor: '#c68642',
      hairColor: '#1a1a2e',
      shirtColor: '#6c5ce7',
      pantsColor: '#2d3436',
      hairStyle: 'long',
    },
    floorId: GROUND_FLOOR_ID,
    deskId: null,
    position: chairPosition([-6, 0, -5], 0),        // Desk A1
  },
  {
    id: AGENT_IDS.marcus,
    name: 'Marcus Johnson',
    role: 'Backend Engineer',
    gender: 'male',
    status: 'working',
    avatarColor: '#00b894',
    appearance: {
      skinColor: '#8d5524',
      hairColor: '#0a0a0a',
      shirtColor: '#00b894',
      pantsColor: '#2d3436',
      hairStyle: 'short',
    },
    floorId: GROUND_FLOOR_ID,
    deskId: null,
    position: chairPosition([-3, 0, -5], 0),        // Desk A2
  },
  {
    id: AGENT_IDS.priya,
    name: 'Priya Sharma',
    role: 'AI Engineer',
    gender: 'female',
    status: 'idle',
    avatarColor: '#fd79a8',
    appearance: {
      skinColor: '#c68642',
      hairColor: '#2d1b00',
      shirtColor: '#fd79a8',
      pantsColor: '#636e72',
      hairStyle: 'bun',
    },
    floorId: GROUND_FLOOR_ID,
    deskId: null,
    position: chairPosition([-3, 0, -1.5], Math.PI), // Desk A4
  },
  {
    id: AGENT_IDS.omar,
    name: 'Omar Hassan',
    role: 'Frontend Engineer',
    gender: 'male',
    status: 'working',
    avatarColor: '#0984e3',
    appearance: {
      skinColor: '#e0ac69',
      hairColor: '#2d1b00',
      shirtColor: '#0984e3',
      pantsColor: '#2d3436',
      hairStyle: 'buzz',
    },
    floorId: FIRST_FLOOR_ID,
    deskId: null,
    position: chairPosition([-6, 0, -5], 0),        // Desk B1
  },
  {
    id: AGENT_IDS.elena,
    name: 'Elena Rossi',
    role: 'Designer',
    gender: 'female',
    status: 'meeting',
    avatarColor: '#e17055',
    appearance: {
      skinColor: '#f1c27d',
      hairColor: '#b5651d',
      shirtColor: '#e17055',
      pantsColor: '#2d3436',
      hairStyle: 'medium',
    },
    floorId: FIRST_FLOOR_ID,
    deskId: null,
    position: chairPosition([-3, 0, -5], 0),        // Desk B2
  },
  {
    id: AGENT_IDS.james,
    name: 'James Park',
    role: 'DevOps',
    gender: 'male',
    status: 'break',
    avatarColor: '#74b9ff',
    appearance: {
      skinColor: '#ffdbac',
      hairColor: '#d4a574',
      shirtColor: '#74b9ff',
      pantsColor: '#636e72',
      hairStyle: 'short',
    },
    floorId: FIRST_FLOOR_ID,
    deskId: null,
    position: chairPosition([-6, 0, -1.5], Math.PI), // Desk B3
  },
];

// ─── Wire up deskIds ────────────────────────────────────────────
// After desks are created with uid(), find each agent's desk and
// set the deskId on the agent.
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

// ─── Extended store type with theme/layout/getActiveFloor ────────
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
  // ── State ───────────────────────────────────────────────────
  floors: defaultFloors,
  agents: defaultAgents,
  selectedFloorId: GROUND_FLOOR_ID,
  selectedAgentId: null,
  cameraMode: 'orbit',
  viewMode: 'exterior' as ViewMode,
  viewingFloorLevel: 0,
  sidebarOpen: true,
  theme: 'violet' as OfficeTheme,
  layout: 'standard' as OfficeLayout,

  // ── Floor CRUD ──────────────────────────────────────────────
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
      if (state.floors.length <= 1) return state; // keep at least 1 floor
      const removedFloor = state.floors.find((f) => f.id === id);
      const floors = state.floors
        .filter((f) => f.id !== id)
        .map((f, i) => ({ ...f, level: i })); // re-index levels

      // Move agents from removed floor to first remaining floor
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

  // ── Agent actions ───────────────────────────────────────────
  moveAgent: (agentId, targetFloorId) =>
    set((state) => {
      const agent = state.agents.find((a) => a.id === agentId);
      const targetFloor = state.floors.find((f) => f.id === targetFloorId);
      if (!agent || !targetFloor) return state;

      // Unassign from current desk
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

      // Find first empty desk on target floor — place agent at chair position
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

      // Assign to new desk in floors copy
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

      // Desk already occupied by someone else
      if (desk.assignedAgentId && desk.assignedAgentId !== agentId) return state;

      // Unassign agent from any current desk, then assign to new desk
      const floors = state.floors.map((floor) => ({
        ...floor,
        rooms: floor.rooms.map((room) => ({
          ...room,
          furniture: {
            ...room.furniture,
            desks: room.furniture.desks.map((d) => {
              if (d.assignedAgentId === agentId) {
                return { ...d, assignedAgentId: null };
              }
              if (d.id === deskId) {
                return { ...d, assignedAgentId: agentId };
              }
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

  // ── Navigation ──────────────────────────────────────────────
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

  // ── UI ──────────────────────────────────────────────────────
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // ── Theme & Layout ────────────────────────────────────────
  setTheme: (theme) => set({ theme }),
  setLayout: (layout) => set({ layout }),

  // ── Derived ───────────────────────────────────────────────
  getActiveFloor: () => {
    const level = get().viewingFloorLevel;
    return { yOffset: level * FLOOR_HEIGHT, level };
  },
}));
