// ============================================================
// BRATES 3D Office — Type Definitions
// ============================================================

/** Agent operational status */
export type AgentStatus = 'working' | 'idle' | 'meeting' | 'break';

/** Camera viewing mode */
export type CameraMode = 'orbit' | 'top-down';

/** Gender for agent appearance */
export type Gender = 'male' | 'female';

/** Desk assignment within a floor */
export interface DeskAssignment {
  deskId: string;
  position: { x: number; y: number; z: number };
}

/** Agent appearance configuration */
export interface AgentAppearance {
  gender: Gender;
  skinColor: string;
  hairColor: string;
  hairStyle: string;
  shirtColor: string;
  pantsColor: string;
  shoeColor: string;
}

/** An AI agent working in the 3D office */
export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  floorId: string;
  desk: DeskAssignment | null;
  appearance: AgentAppearance;
  avatarColor: string;   // fallback color for avatar circle
}

/** A floor in the office building */
export interface Floor {
  id: string;
  name: string;
  level: number;         // 0-based floor index (ground = 0)
  color: string;         // theme color for the floor
  agentIds: string[];    // IDs of agents assigned to this floor
}

/** The complete office store state */
export interface OfficeState {
  floors: Floor[];
  agents: Agent[];
  selectedFloorId: string | null;
  selectedAgentId: string | null;
  cameraMode: CameraMode;
  viewingFloorLevel: number;
  sidebarOpen: boolean;
}

/** Office store actions */
export interface OfficeActions {
  addFloor: () => void;
  removeFloor: (id: string) => void;
  renameFloor: (id: string, name: string) => void;
  moveAgent: (agentId: string, targetFloorId: string) => void;
  selectFloor: (id: string | null) => void;
  selectAgent: (id: string | null) => void;
  setCameraMode: (mode: CameraMode) => void;
  setViewingFloor: (level: number) => void;
  toggleSidebar: () => void;
  setAgentStatus: (agentId: string, status: AgentStatus) => void;
}

/** Combined store type */
export type OfficeStore = OfficeState & OfficeActions;
