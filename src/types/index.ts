// ─── Geometry / Spatial ──────────────────────────────────────────
export type Vec3 = [x: number, y: number, z: number];

// ─── Agent ──────────────────────────────────────────────────────
export type AgentStatus = 'idle' | 'working' | 'meeting' | 'break' | 'away' | 'offline';
export type AgentGender = 'male' | 'female';
export type FaceShape = 'round' | 'angular' | 'heart' | 'square' | 'oval';

// Movement
export type MovementState = 'stationary' | 'walking' | 'arriving';

export interface AgentAppearance {
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
  shoeColor: string;
  hairStyle: 'short' | 'medium' | 'long' | 'bun' | 'buzz' | 'ponytail' | 'curly';
  eyeColor: string;
  glasses: boolean;
  beardStyle: 'none' | 'stubble' | 'short' | 'full';
  height: number;         // 0.9 – 1.1 multiplier
  faceShape: FaceShape;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  gender: AgentGender;
  status: AgentStatus;
  avatarColor: string;
  appearance: AgentAppearance;
  floorId: string;
  deskId: string | null;
  position: Vec3;
  // Movement
  movementState: MovementState;
  targetPosition: Vec3 | null;
  facingAngle: number;      // radians — direction agent faces
  // Work screen
  screenContent: ScreenContentType;
  currentTask: string;      // short label shown on screen
}

// ─── Work Screen ────────────────────────────────────────────────
export type ScreenContentType =
  | 'code'
  | 'design'
  | 'terminal'
  | 'chat'
  | 'dashboard'
  | 'document'
  | 'idle'
  | 'meeting-notes'
  | 'off';

// ─── Simulation Events ─────────────────────────────────────────
export type SimEventType =
  | 'meeting-called'
  | 'meeting-ended'
  | 'peer-chat-start'
  | 'peer-chat-end'
  | 'task-handoff'
  | 'break-start'
  | 'break-end'
  | 'return-to-desk'
  | 'escalation'
  | 'approval';

export interface SimEvent {
  id: string;
  type: SimEventType;
  agentIds: string[];
  anchorId?: string;
  floorId: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

// ─── Anchors (positions agents can move to) ─────────────────────
export type AnchorType =
  | 'desk-chair'
  | 'meeting-spot'
  | 'kitchen-spot'
  | 'lounge-spot'
  | 'hallway-point'
  | 'interaction-point';

export interface Anchor {
  id: string;
  type: AnchorType;
  position: Vec3;
  rotation: number;
  floorId: string;
  /** How many agents can use this anchor simultaneously */
  capacity: number;
  /** IDs of agents currently at this anchor */
  occupantIds: string[];
}

// ─── Meetings ───────────────────────────────────────────────────
export type MeetingStatus = 'gathering' | 'in-progress' | 'dispersing';

export interface Meeting {
  id: string;
  title: string;
  anchorId: string;
  floorId: string;
  organizerId: string;
  participantIds: string[];
  status: MeetingStatus;
  startedAt: number;
}

// ─── Furniture ──────────────────────────────────────────────────
export interface Desk {
  id: string;
  label: string;
  position: Vec3;
  rotation: number;
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
  position: Vec3;
  size: [width: number, depth: number];
  furniture: RoomFurniture;
}

// ─── Floor ──────────────────────────────────────────────────────
export interface Floor {
  id: string;
  name: string;
  level: number;
  rooms: Room[];
  color: string;
  floorColor: string;
}

// ─── Camera ─────────────────────────────────────────────────────
export type CameraMode = 'orbit' | 'top-down';
export type ViewMode = 'interior' | 'exterior';
export type UserCameraMode = 'orbit' | 'first-person' | 'third-person';

// ─── User Avatar ────────────────────────────────────────────────
export interface UserAvatarState {
  enabled: boolean;
  position: Vec3;
  rotation: number;
  appearance: AgentAppearance;
  cameraMode: UserCameraMode;
  /** Speed in units/second */
  moveSpeed: number;
}

// ─── Quality Tier ───────────────────────────────────────────────
export type QualityTier = 'low' | 'medium' | 'high';

// ─── App Mode ──────────────────────────────────────────────────
export type AppMode = 'office' | 'editor';

// ─── Store (describes the shape other agents will consume) ──────
export interface OfficeStoreState {
  appMode: AppMode;
  // Data
  floors: Floor[];
  agents: Agent[];
  anchors: Anchor[];

  // Selection
  selectedFloorId: string | null;
  selectedAgentId: string | null;

  // Camera / View
  cameraMode: CameraMode;
  viewMode: ViewMode;
  viewingFloorLevel: number;

  // User
  userAvatar: UserAvatarState;

  // Simulation
  events: SimEvent[];
  meetings: Meeting[];
  simulationRunning: boolean;

  // Quality
  qualityTier: QualityTier;

  // UI
  sidebarOpen: boolean;
  activePanel: 'roster' | 'customize' | 'build' | null;
}

export interface OfficeStoreActions {
  // App mode
  setAppMode: (mode: AppMode) => void;

  // Floor CRUD
  addFloor: () => void;
  removeFloor: (id: string) => void;
  renameFloor: (id: string, name: string) => void;

  // Agent actions
  moveAgent: (agentId: string, targetFloorId: string) => void;
  assignAgentToDesk: (agentId: string, deskId: string) => void;
  selectAgent: (id: string | null) => void;
  setAgentStatus: (agentId: string, status: AgentStatus) => void;
  updateAgentAppearance: (agentId: string, appearance: Partial<AgentAppearance>) => void;

  // Movement
  setAgentTarget: (agentId: string, target: Vec3) => void;
  updateAgentPosition: (agentId: string, position: Vec3, state: MovementState) => void;
  setAgentFacing: (agentId: string, angle: number) => void;

  // Simulation
  pushEvent: (event: Omit<SimEvent, 'id' | 'timestamp'>) => void;
  startMeeting: (title: string, organizerId: string, participantIds: string[], anchorId: string, floorId: string) => void;
  endMeeting: (meetingId: string) => void;
  toggleSimulation: () => void;

  // User
  setUserPosition: (position: Vec3) => void;
  setUserRotation: (rotation: number) => void;
  setUserCameraMode: (mode: UserCameraMode) => void;
  toggleUserAvatar: () => void;

  // Navigation
  selectFloor: (id: string | null) => void;
  setCameraMode: (mode: CameraMode) => void;
  setViewMode: (mode: ViewMode) => void;
  setViewingFloor: (level: number) => void;

  // Quality
  setQualityTier: (tier: QualityTier) => void;

  // UI
  toggleSidebar: () => void;
  setActivePanel: (panel: OfficeStoreState['activePanel']) => void;
}

export type OfficeStore = OfficeStoreState & OfficeStoreActions;
