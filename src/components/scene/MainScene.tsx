import { useMemo, useCallback } from "react";
import { Environment, AdaptiveDpr, AdaptiveEvents, ContactShadows } from "@react-three/drei";

import { useOfficeStore } from "../../stores/officeStore";
import { HumanAvatar, DEFAULT_HUMAN_APPEARANCE } from "../humans/HumanAvatar";
import type { AvatarAnimation } from "../humans/AvatarAnimations";
import { CameraController } from "./CameraController";
import { ClickHandler } from "./ClickHandler";
import { PostProcessing } from "./PostProcessing";
import type { Agent, Floor, Room, AgentStatus, ViewMode } from "../../types";

// ── Constants ────────────────────────────────────────────────────────────────

const FLOOR_SIZE = 20;
const FLOOR_HEIGHT = 4;
const WALL_HEIGHT = 3.2;
const WALL_THICKNESS = 0.12;

// ── Status -> Animation mapping ─────────────────────────────────────────────

function statusToAnimation(status: AgentStatus): AvatarAnimation {
  switch (status) {
    case "working": return "type";
    case "meeting": return "idle";
    case "break": return "idle";
    case "idle":
    default: return "idle";
  }
}

// ── Floor Plate ──────────────────────────────────────────────────────────────

function FloorPlate({
  floor,
  yOffset,
  isActive,
}: {
  floor: Floor;
  yOffset: number;
  isActive: boolean;
}) {
  const opacity = isActive ? 1 : 0.25;

  return (
    <group position={[0, yOffset, 0]}>
      {/* Main floor slab */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <meshStandardMaterial
          color={floor.color}
          roughness={0.7}
          metalness={0.05}
          transparent={!isActive}
          opacity={opacity}
        />
      </mesh>

      {/* Grid pattern overlay */}
      {isActive && (
        <gridHelper
          args={[FLOOR_SIZE, FLOOR_SIZE, "#d0d0d0", "#e0e0e0"]}
          position={[0, 0.01, 0]}
        />
      )}

      {/* Walls */}
      <Walls yOffset={0} wallColor="#e8e4e0" opacity={opacity} />

      {/* Floor label (visible when not active) */}
      {!isActive && (
        <mesh position={[0, WALL_HEIGHT / 2, FLOOR_SIZE / 2 + 0.1]}>
          <boxGeometry args={[3, 0.5, 0.05]} />
          <meshStandardMaterial color={floor.color} roughness={0.3} />
        </mesh>
      )}
    </group>
  );
}

// ── Interior Floor Plate (no walls, no labels — just the slab + grid) ────────

function InteriorFloorPlate({
  floor,
  yOffset,
}: {
  floor: Floor;
  yOffset: number;
}) {
  return (
    <group position={[0, yOffset, 0]}>
      {/* Main floor slab */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
        <meshStandardMaterial
          color={floor.color}
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      {/* Grid pattern overlay */}
      <gridHelper
        args={[FLOOR_SIZE, FLOOR_SIZE, "#d0d0d0", "#e0e0e0"]}
        position={[0, 0.01, 0]}
      />
    </group>
  );
}

// ── Walls ────────────────────────────────────────────────────────────────────

function Walls({
  yOffset,
  wallColor,
  opacity,
}: {
  yOffset: number;
  wallColor: string;
  opacity: number;
}) {
  const halfSize = FLOOR_SIZE / 2;
  const wallY = yOffset + WALL_HEIGHT / 2;

  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, wallY, -halfSize]} receiveShadow castShadow>
        <boxGeometry args={[FLOOR_SIZE, WALL_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} transparent opacity={opacity} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-halfSize, wallY, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[FLOOR_SIZE, WALL_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} transparent opacity={opacity} />
      </mesh>

      {/* Right wall (glass - semi-transparent) */}
      <mesh position={[halfSize, wallY, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[FLOOR_SIZE, WALL_HEIGHT, WALL_THICKNESS]} />
        <meshStandardMaterial
          color="#b0d0e8"
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={Math.min(opacity, 0.3)}
        />
      </mesh>
    </group>
  );
}

// ── Desk with Chair ─────────────────────────────────────────────────────────

// Chair offset from desk center (local +Z). Avatars should sit here.
export const CHAIR_OFFSET_Z = 0.8;

function DeskWithChair({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation: number;
}) {
  // Layout (all in local space, before rotation):
  //   Desk surface at Y=0.75, centered at Z=0
  //   Monitor at Z=-0.2 (far edge), facing +Z toward the chair
  //   Keyboard at Z=+0.15 (near edge)
  //   Chair at Z=+0.8 (clearly behind desk, no overlap)
  //   Avatar should be placed at desk.position offset by [0,0,+0.8] rotated by desk rotation
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Desktop surface — Y=0.75 */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.05, 0.7]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Desk legs */}
      {[
        [-0.6, 0.375, -0.3],
        [0.6, 0.375, -0.3],
        [-0.6, 0.375, 0.3],
        [0.6, 0.375, 0.3],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <boxGeometry args={[0.04, 0.75, 0.04]} />
          <meshStandardMaterial color="#a0a0a0" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}

      {/* Monitor — far edge of desk, screen faces +Z toward chair */}
      <mesh position={[0, 1.0, -0.2]} castShadow>
        <boxGeometry args={[0.5, 0.32, 0.02]} />
        <meshStandardMaterial
          color="#1a1a2e"
          roughness={0.2}
          emissive="#203080"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Monitor stand */}
      <mesh position={[0, 0.87, -0.2]} castShadow>
        <boxGeometry args={[0.04, 0.2, 0.04]} />
        <meshStandardMaterial color="#606060" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Keyboard on desk surface */}
      <mesh position={[0, 0.78, 0.15]}>
        <boxGeometry args={[0.35, 0.015, 0.12]} />
        <meshStandardMaterial color="#303030" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Mouse */}
      <mesh position={[0.28, 0.78, 0.15]}>
        <boxGeometry args={[0.06, 0.012, 0.09]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Chair — at Z=+0.8, well behind the desk, seat at Y=0.45 */}
      <group position={[0, 0, CHAIR_OFFSET_Z]}>
        {/* Chair base (star base on floor) */}
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.03, 10]} />
          <meshStandardMaterial color="#505050" roughness={0.5} metalness={0.5} />
        </mesh>
        {/* Chair stem */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.38, 6]} />
          <meshStandardMaterial color="#404040" roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Chair seat — Y=0.45 */}
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.48, 0.05, 0.48]} />
          <meshStandardMaterial color="#404040" roughness={0.7} />
        </mesh>
        {/* Chair backrest — faces away from desk (+Z side) */}
        <mesh position={[0, 0.72, 0.22]} castShadow>
          <boxGeometry args={[0.46, 0.5, 0.04]} />
          <meshStandardMaterial color="#404040" roughness={0.7} />
        </mesh>
        {/* Chair armrests */}
        <mesh position={[-0.26, 0.58, 0]}>
          <boxGeometry args={[0.04, 0.04, 0.3]} />
          <meshStandardMaterial color="#505050" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0.26, 0.58, 0]}>
          <boxGeometry args={[0.04, 0.04, 0.3]} />
          <meshStandardMaterial color="#505050" roughness={0.6} metalness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

// ── Room Furniture ──────────────────────────────────────────────────────────

function RoomFurniture({
  room,
  yOffset,
}: {
  room: Room;
  yOffset: number;
}) {
  // Room floor tint dimensions — slightly larger than room.size to give padding
  const tintW = room.size[0] + 1;
  const tintD = room.size[1] + 1;

  return (
    <group position={[room.position[0], yOffset, room.position[2]]}>
      {/* Room floor tint — properly sized to room bounds */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[tintW, tintD]} />
        <meshStandardMaterial
          color={room.type === 'lounge' ? '#e8ddd0' : room.type === 'kitchen' ? '#d0e0d0' : '#e0dce0'}
          roughness={0.8}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Desks */}
      {room.furniture.desks.map((desk) => (
        <DeskWithChair
          key={desk.id}
          position={[
            desk.position[0] - room.position[0],
            0,
            desk.position[2] - room.position[2],
          ]}
          rotation={desk.rotation}
        />
      ))}

      {/* Meeting table for meeting rooms — offset to center of room, away from desk area */}
      {room.type === 'meeting-room' && (
        <group position={[0, 0, 1.5]}>
          <mesh position={[0, 0.72, 0]} castShadow>
            <cylinderGeometry args={[1.0, 1.0, 0.05, 20]} />
            <meshStandardMaterial color="#c4b090" roughness={0.35} metalness={0.15} />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <cylinderGeometry args={[0.06, 0.3, 0.72, 10]} />
            <meshStandardMaterial color="#808080" roughness={0.5} metalness={0.3} />
          </mesh>
        </group>
      )}

      {/* Plants for lounge/kitchen — placed in far corner, away from walkways */}
      {(room.type === 'lounge' || room.type === 'kitchen') && (
        <>
          {/* Corner plant 1 */}
          <group position={[room.size[0] / 2 - 0.5, 0, room.size[1] / 2 - 0.5]}>
            <mesh position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.15, 0.12, 0.4, 10]} />
              <meshStandardMaterial color="#b08060" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.55, 0]}>
              <sphereGeometry args={[0.28, 8, 8]} />
              <meshStandardMaterial color="#3a7040" roughness={0.9} />
            </mesh>
          </group>
          {/* Corner plant 2 */}
          <group position={[-room.size[0] / 2 + 0.5, 0, room.size[1] / 2 - 0.5]}>
            <mesh position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.13, 0.1, 0.35, 10]} />
              <meshStandardMaterial color="#a07050" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
              <sphereGeometry args={[0.24, 8, 8]} />
              <meshStandardMaterial color="#3a7040" roughness={0.9} />
            </mesh>
          </group>
        </>
      )}

      {/* Server rack for server room — pushed to back wall corner */}
      {room.type === 'server-room' && (
        <group position={[room.size[0] / 2 - 0.8, 0, -room.size[1] / 2 + 0.5]}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[0.7, 1.8, 0.5]} />
            <meshStandardMaterial color="#2a2a3a" roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Second rack beside it */}
          <mesh position={[-1.0, 0.9, 0]} castShadow>
            <boxGeometry args={[0.7, 1.8, 0.5]} />
            <meshStandardMaterial color="#2a2a3a" roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Blinking LEDs */}
          {[0.4, 0.6, 0.8, 1.0, 1.2].map((y, i) => (
            <mesh key={i} position={[-0.3, y, 0.26]}>
              <boxGeometry args={[0.04, 0.02, 0.01]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? "#00ff60" : "#ff4040"}
                emissive={i % 2 === 0 ? "#00ff60" : "#ff4040"}
                emissiveIntensity={2}
              />
            </mesh>
          ))}
          {[0.5, 0.7, 0.9, 1.1].map((y, i) => (
            <mesh key={`led2-${i}`} position={[-1.3, y, 0.26]}>
              <boxGeometry args={[0.04, 0.02, 0.01]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? "#00ff60" : "#ffaa00"}
                emissive={i % 2 === 0 ? "#00ff60" : "#ffaa00"}
                emissiveIntensity={2}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

// ── Scene Lighting ──────────────────────────────────────────────────────────

function SceneLighting({ floorY }: { floorY: number }) {
  return (
    <>
      <ambientLight intensity={0.4} color="#f0e8ff" />

      <directionalLight
        position={[12, 20 + floorY, 8]}
        intensity={0.8}
        color="#fff8f0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.001}
      />

      <directionalLight
        position={[-8, 12 + floorY, -6]}
        intensity={0.25}
        color="#e8e0f8"
      />

      {/* Office ceiling lights */}
      <pointLight
        position={[-4, 3.0 + floorY, -4]}
        intensity={0.4}
        color="#fff8f0"
        distance={10}
        decay={2}
      />
      <pointLight
        position={[4, 3.0 + floorY, 0]}
        intensity={0.4}
        color="#fff8f0"
        distance={10}
        decay={2}
      />
    </>
  );
}

// ── Ground Environment ──────────────────────────────────────────────────────

function GroundEnvironment() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#ddd8e5" roughness={0.95} />
      </mesh>
    </>
  );
}

// ── Building Structure ──────────────────────────────────────────────────────

function BuildingStructure({ floors, activeFloorId, viewMode }: {
  floors: Floor[];
  activeFloorId: string | null;
  viewMode: ViewMode;
}) {
  const isInterior = viewMode === 'interior';

  return (
    <group>
      {/* Exterior columns — hidden in interior mode */}
      {!isInterior && [
        [-FLOOR_SIZE / 2, -FLOOR_SIZE / 2],
        [-FLOOR_SIZE / 2, FLOOR_SIZE / 2],
        [FLOOR_SIZE / 2, -FLOOR_SIZE / 2],
        [FLOOR_SIZE / 2, FLOOR_SIZE / 2],
      ].map(([x, z], i) => {
        const h = floors.length * FLOOR_HEIGHT + 0.5;
        return (
          <mesh key={i} position={[x, h / 2, z]} castShadow>
            <boxGeometry args={[0.2, h, 0.2]} />
            <meshStandardMaterial color="#a8a4a0" roughness={0.4} metalness={0.15} />
          </mesh>
        );
      })}

      {/* Floor plates */}
      {floors.map((floor) => {
        const y = floor.level * FLOOR_HEIGHT;
        const isActive = floor.id === activeFloorId;

        // In interior mode, skip non-active floors entirely
        if (isInterior && !isActive) return null;

        return (
          <group key={floor.id}>
            {/* In interior mode, render floor slab only (no walls) */}
            {isInterior ? (
              <InteriorFloorPlate floor={floor} yOffset={y} />
            ) : (
              <FloorPlate floor={floor} yOffset={y} isActive={isActive} />
            )}
            {/* Render room furniture only for active floor */}
            {isActive && floor.rooms.map((room) => (
              <RoomFurniture key={room.id} room={room} yOffset={y} />
            ))}
          </group>
        );
      })}

      {/* Roof — hidden in interior mode */}
      {!isInterior && (
        <mesh position={[0, floors.length * FLOOR_HEIGHT + 0.05, 0]} receiveShadow>
          <boxGeometry args={[FLOOR_SIZE + 0.3, 0.1, FLOOR_SIZE + 0.3]} />
          <meshStandardMaterial color="#b4b0a8" roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}

// ── Find desk rotation for an agent ──────────────────────────────────────────

function findDeskRotation(floors: Floor[], agent: Agent): number {
  for (const floor of floors) {
    if (floor.id !== agent.floorId) continue;
    for (const room of floor.rooms) {
      for (const desk of room.furniture.desks) {
        if (desk.assignedAgentId === agent.id) {
          return desk.rotation;
        }
      }
    }
  }
  return 0;
}

// ── Agent Avatars ───────────────────────────────────────────────────────────
// NOTE: Agent positions in the store are ALREADY at the chair position
// (computed via chairPosition() in officeStore). The AgentLayer does NOT
// add any further offset — it only adds facing rotation.

function AgentLayer({
  agents,
  floorY,
}: {
  agents: Agent[];
  floorY: number;
}) {
  const selectedAgentId = useOfficeStore((s) => s.selectedAgentId);
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const floors = useOfficeStore((s) => s.floors);

  const handleAgentClick = useCallback(
    (agentId: string) => {
      selectAgent(selectedAgentId === agentId ? null : agentId);
    },
    [selectedAgentId, selectAgent],
  );

  return (
    <group>
      {agents.map((agent) => {
        const anim = statusToAnimation(agent.status);

        // Get the desk rotation so the avatar faces the monitor
        const deskRotation = findDeskRotation(floors, agent);
        // Avatar faces toward the desk: desk local -Z = rotation + PI
        const avatarRotation = deskRotation + Math.PI;

        return (
          <HumanAvatar
            key={agent.id}
            appearance={{
              ...DEFAULT_HUMAN_APPEARANCE,
              bodyType: agent.gender,
              skinTone: agent.appearance.skinColor,
              hairColor: agent.appearance.hairColor,
              hairStyle: agent.appearance.hairStyle === 'medium' ? 'short' : agent.appearance.hairStyle,
              shirtColor: agent.appearance.shirtColor,
              pantsColor: agent.appearance.pantsColor,
            }}
            position={[agent.position[0], floorY, agent.position[2]]}
            rotation={avatarRotation}
            animation={anim}
            name={agent.name}
            role={agent.role}
            selected={selectedAgentId === agent.id}
            onClick={() => handleAgentClick(agent.id)}
          />
        );
      })}
    </group>
  );
}

// ── Main Scene ──────────────────────────────────────────────────────────────

export function MainScene() {
  const floors = useOfficeStore((s) => s.floors);
  const agents = useOfficeStore((s) => s.agents);
  const selectedFloorId = useOfficeStore((s) => s.selectedFloorId);
  const viewingFloorLevel = useOfficeStore((s) => s.viewingFloorLevel);
  const viewMode = useOfficeStore((s) => s.viewMode);

  // Get agents on the currently viewed floor
  const activeFloor = useMemo(
    () => floors.find((f) => f.id === selectedFloorId) ?? floors[0],
    [floors, selectedFloorId],
  );
  const floorAgents = useMemo(
    () => agents.filter((a) => a.floorId === activeFloor?.id),
    [agents, activeFloor],
  );

  const floorY = viewingFloorLevel * FLOOR_HEIGHT;

  return (
    <>
      {/* Performance */}
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />

      {/* Atmosphere */}
      <fog attach="fog" args={["#e8e0f5", 30, 80]} />
      <color attach="background" args={["#f0eaf8"]} />

      {/* Environment (lightweight) */}
      <Environment preset="city" background={false} />

      {/* Lighting */}
      <SceneLighting floorY={floorY} />

      {/* Contact shadows */}
      <ContactShadows
        position={[0, floorY + 0.01, 0]}
        opacity={0.3}
        scale={FLOOR_SIZE}
        blur={2}
        far={4}
        resolution={256}
        color="#3a2060"
      />

      {/* Ground */}
      <GroundEnvironment />

      {/* Building */}
      <BuildingStructure
        floors={floors}
        activeFloorId={selectedFloorId}
        viewMode={viewMode}
      />

      {/* Agents on active floor */}
      <AgentLayer agents={floorAgents} floorY={floorY} />

      {/* Interaction */}
      <ClickHandler />
      <CameraController />

      {/* Post-processing (lightweight for performance) */}
      <PostProcessing enabled={false} />
    </>
  );
}

export default MainScene;
