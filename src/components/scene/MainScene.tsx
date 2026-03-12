import { useMemo, useCallback } from "react";
import { Environment, AdaptiveDpr, AdaptiveEvents, ContactShadows } from "@react-three/drei";

import { useOfficeStore } from "../../stores/officeStore";
import { HumanAvatar, DEFAULT_HUMAN_APPEARANCE } from "../humans/HumanAvatar";
import type { AvatarAnimation } from "../humans/AvatarAnimations";
import { CameraController } from "./CameraController";
import { ClickHandler } from "./ClickHandler";
import { PostProcessing } from "./PostProcessing";
import type { Agent, Floor, Room, AgentStatus } from "../../types";

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

function DeskWithChair({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Desktop surface */}
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

      {/* Monitor */}
      <mesh position={[0, 1.0, -0.25]} castShadow>
        <boxGeometry args={[0.5, 0.32, 0.02]} />
        <meshStandardMaterial
          color="#1a1a2e"
          roughness={0.2}
          emissive="#203080"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Monitor stand */}
      <mesh position={[0, 0.87, -0.25]} castShadow>
        <boxGeometry args={[0.04, 0.2, 0.04]} />
        <meshStandardMaterial color="#606060" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Chair */}
      <group position={[0, 0, 0.55]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.45, 0.05, 0.45]} />
          <meshStandardMaterial color="#404040" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.72, -0.2]} castShadow>
          <boxGeometry args={[0.44, 0.5, 0.04]} />
          <meshStandardMaterial color="#404040" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.03, 10]} />
          <meshStandardMaterial color="#505050" roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.33, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
          <meshStandardMaterial color="#404040" roughness={0.4} metalness={0.6} />
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
  return (
    <group position={[room.position[0], yOffset, room.position[2]]}>
      {/* Room floor tint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[room.size[0], room.size[1]]} />
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

      {/* Meeting table for meeting rooms */}
      {room.type === 'meeting-room' && (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.72, 0]} castShadow>
            <cylinderGeometry args={[1.2, 1.2, 0.05, 20]} />
            <meshStandardMaterial color="#c4b090" roughness={0.35} metalness={0.15} />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <cylinderGeometry args={[0.06, 0.3, 0.72, 10]} />
            <meshStandardMaterial color="#808080" roughness={0.5} metalness={0.3} />
          </mesh>
        </group>
      )}

      {/* Plants for lounge/kitchen */}
      {(room.type === 'lounge' || room.type === 'kitchen') && (
        <group position={[room.size[0] / 3, 0, room.size[1] / 3]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.15, 0.12, 0.4, 10]} />
            <meshStandardMaterial color="#b08060" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <sphereGeometry args={[0.28, 8, 8]} />
            <meshStandardMaterial color="#3a7040" roughness={0.9} />
          </mesh>
        </group>
      )}

      {/* Server rack for server room */}
      {room.type === 'server-room' && (
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[0.7, 1.8, 0.5]} />
            <meshStandardMaterial color="#2a2a3a" roughness={0.4} metalness={0.6} />
          </mesh>
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

function BuildingStructure({ floors, activeFloorId }: {
  floors: Floor[];
  activeFloorId: string | null;
}) {
  return (
    <group>
      {/* Exterior columns */}
      {[
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
        return (
          <group key={floor.id}>
            <FloorPlate floor={floor} yOffset={y} isActive={isActive} />
            {/* Render room furniture only for active floor */}
            {isActive && floor.rooms.map((room) => (
              <RoomFurniture key={room.id} room={room} yOffset={y} />
            ))}
          </group>
        );
      })}

      {/* Roof */}
      <mesh position={[0, floors.length * FLOOR_HEIGHT + 0.05, 0]} receiveShadow>
        <boxGeometry args={[FLOOR_SIZE + 0.3, 0.1, FLOOR_SIZE + 0.3]} />
        <meshStandardMaterial color="#b4b0a8" roughness={0.6} />
      </mesh>
    </group>
  );
}

// ── Agent Avatars ───────────────────────────────────────────────────────────

function AgentLayer({
  agents,
  floorY,
}: {
  agents: Agent[];
  floorY: number;
}) {
  const selectedAgentId = useOfficeStore((s) => s.selectedAgentId);
  const selectAgent = useOfficeStore((s) => s.selectAgent);

  const handleAgentClick = useCallback(
    (agentId: string) => {
      selectAgent(selectedAgentId === agentId ? null : agentId);
    },
    [selectedAgentId, selectAgent],
  );

  return (
    <group>
      {agents.map((agent) => (
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
          position={[agent.position[0], floorY + 0.05, agent.position[2]]}
          animation={statusToAnimation(agent.status)}
          name={agent.name}
          role={agent.role}
          selected={selectedAgentId === agent.id}
          onClick={() => handleAgentClick(agent.id)}
        />
      ))}
    </group>
  );
}

// ── Main Scene ──────────────────────────────────────────────────────────────

export function MainScene() {
  const floors = useOfficeStore((s) => s.floors);
  const agents = useOfficeStore((s) => s.agents);
  const selectedFloorId = useOfficeStore((s) => s.selectedFloorId);
  const viewingFloorLevel = useOfficeStore((s) => s.viewingFloorLevel);

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
