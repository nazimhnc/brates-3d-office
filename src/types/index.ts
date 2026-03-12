// ─── Geometry / Spatial ──────────────────────────────────────────
export type Vec3 = [x: number, y: number, z: number];

// ─── Agent ──────────────────────────────────────────────────────
export type AgentStatus = 'idle' | 'working' | 'meeting' | 'break' | 'away' | 'offline';
export type AgentGender = 'male' | 'female';

export interface AgentAppearance {
  skinColor: string;      // hex
  hairColor: string;      // hex
  shirtColor: string;     // hex
  pantsColor: string;     // hex
  hairStyle: 'short' | 'medium' | 'long' | 'bun' | 'buzz';
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  gender: AgentGender;
  status: AgentStatus;
  avatarColor: string;    // hex – used for avatar circle background
  appearance: AgentAppearance;
  floorId: string;
  deskId: string | null;
  position: Vec3;
}

// ─── Furniture ──────────────────────────────────────────────────
export interface Desk {
  id: string;
  label: string;
  position: Vec3;
  rotation: number;         // Y-axis rotation in radians
  assignedAgentId: string | null;
}

export interface RoomFurniture {
  desks: Desk[];
}

// ─── Room ───────────────────────────────────────────────────────
export type RoomType =
  | 'open-office'
  | 'meeting-room'
  | 'lounge'
  | 'server-room'
  | 'kitchen'
  | 'executive';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  position: Vec3;           // room center relative to floor origin
  size: [width: number, depth: number];
  furniture: RoomFurniture;
}

// ─── Floor ──────────────────────────────────────────────────────
export interface Floor {
  id: string;
  name: string;
  level: number;            // 0 = ground, 1 = first, etc.
  rooms: Room[];
  color: string;            // hex – tint for the floor plane / UI indicators
  floorColor: string;       // hex – alias used by UI panels
}

// ─── Camera ─────────────────────────────────────────────────────
export type CameraMode = 'orbit' | 'top-down';

// ─── Store (describes the shape other agents will consume) ──────
export interface OfficeStoreState {
  // Data
  floors: Floor[];
  agents: Agent[];

  // Selection
  selectedFloorId: string | null;
  selectedAgentId: string | null;

  // Camera / View
  cameraMode: CameraMode;
  viewingFloorLevel: number;

  // UI
  sidebarOpen: boolean;
}

export interface OfficeStoreActions {
  // Floor CRUD
  addFloor: () => void;
  removeFloor: (id: string) => void;
  renameFloor: (id: string, name: string) => void;

  // Agent actions
  moveAgent: (agentId: string, targetFloorId: string) => void;
  assignAgentToDesk: (agentId: string, deskId: string) => void;
  selectAgent: (id: string | null) => void;
  setAgentStatus: (agentId: string, status: AgentStatus) => void;

  // Navigation
  selectFloor: (id: string | null) => void;
  setCameraMode: (mode: CameraMode) => void;
  setViewingFloor: (level: number) => void;

  // UI
  toggleSidebar: () => void;
}

export type OfficeStore = OfficeStoreState & OfficeStoreActions;
