import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import type { Floor, Room, Desk } from "../../types";
import { WorkScreen } from "./WorkScreen";
import { useOfficeStore } from "../../stores/officeStore";

// ══════════════════════════════════════════════════════════════════════════════
// FloorContent — Room furniture for the active floor.
//
// Performance: InstancedMesh for desks and chairs.
//   - All desk surfaces   → 1 InstancedMesh
//   - All desk legs        → 1 InstancedMesh (4 legs per desk baked into matrices)
//   - All chair seats      → 1 InstancedMesh
//   - All chair backrests  → 1 InstancedMesh
//   - All chair bases      → 1 InstancedMesh
//   - All chair stems      → 1 InstancedMesh
//   - All chair armrests   → 1 InstancedMesh (2 per chair)
//   - Monitors, keyboards, mice share 1 InstancedMesh each
//
// Meeting tables, plants, server racks are few — kept as simple meshes.
// ══════════════════════════════════════════════════════════════════════════════

export const CHAIR_OFFSET_Z = 0.8;

// ── Shared materials (module-level singletons) ──────────────────────────────

const deskSurfaceMat = new THREE.MeshStandardMaterial({
  color: "#d4c4a8",
  roughness: 0.4,
  metalness: 0.1,
});

const deskLegMat = new THREE.MeshStandardMaterial({
  color: "#a0a0a0",
  roughness: 0.6,
  metalness: 0.3,
});

const chairDarkMat = new THREE.MeshStandardMaterial({
  color: "#404040",
  roughness: 0.7,
});

const chairBaseMat = new THREE.MeshStandardMaterial({
  color: "#505050",
  roughness: 0.5,
  metalness: 0.5,
});

const chairStemMat = new THREE.MeshStandardMaterial({
  color: "#404040",
  roughness: 0.4,
  metalness: 0.6,
});

const chairArmMat = new THREE.MeshStandardMaterial({
  color: "#505050",
  roughness: 0.6,
  metalness: 0.3,
});

const monitorStandMat = new THREE.MeshStandardMaterial({
  color: "#606060",
  roughness: 0.5,
  metalness: 0.4,
});

const keyboardMat = new THREE.MeshStandardMaterial({
  color: "#303030",
  roughness: 0.6,
  metalness: 0.2,
});

const mouseMat = new THREE.MeshStandardMaterial({
  color: "#2a2a2a",
  roughness: 0.5,
  metalness: 0.2,
});

const meetingTableTopMat = new THREE.MeshStandardMaterial({
  color: "#c4b090",
  roughness: 0.35,
  metalness: 0.15,
});

const meetingTableLegMat = new THREE.MeshStandardMaterial({
  color: "#808080",
  roughness: 0.5,
  metalness: 0.3,
});

const plantPotMat = new THREE.MeshStandardMaterial({
  color: "#b08060",
  roughness: 0.8,
});

const plantLeafMat = new THREE.MeshStandardMaterial({
  color: "#3a7040",
  roughness: 0.9,
});

const serverRackMat = new THREE.MeshStandardMaterial({
  color: "#2a2a3a",
  roughness: 0.4,
  metalness: 0.6,
});

// ── Shared geometries ───────────────────────────────────────────────────────

const deskSurfaceGeo = new THREE.BoxGeometry(1.4, 0.05, 0.7);
const deskLegGeo = new THREE.BoxGeometry(0.04, 0.75, 0.04);
const chairSeatGeo = new THREE.BoxGeometry(0.48, 0.05, 0.48);
const chairBackGeo = new THREE.BoxGeometry(0.46, 0.5, 0.04);
const chairBaseGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.03, 10);
const chairStemGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.38, 6);
const chairArmGeo = new THREE.BoxGeometry(0.04, 0.04, 0.3);
const monitorStandGeo = new THREE.BoxGeometry(0.04, 0.2, 0.04);
const keyboardGeo = new THREE.BoxGeometry(0.35, 0.015, 0.12);
const mouseGeo = new THREE.BoxGeometry(0.06, 0.012, 0.09);

// ── Helper: collect all desks from a floor ──────────────────────────────────

interface DeskInfo {
  desk: Desk;
  roomPos: [number, number, number];
}

function collectDesks(floor: Floor): DeskInfo[] {
  const result: DeskInfo[] = [];
  for (const room of floor.rooms) {
    for (const desk of room.furniture.desks) {
      result.push({
        desk,
        roomPos: [room.position[0], room.position[1], room.position[2]],
      });
    }
  }
  return result;
}

// ── Helper: set instanced mesh matrix ───────────────────────────────────────

const _tmpObj = new THREE.Object3D();

function setInstanceMatrix(
  mesh: THREE.InstancedMesh,
  index: number,
  x: number,
  y: number,
  z: number,
  rotY: number = 0,
  sx: number = 1,
  sy: number = 1,
  sz: number = 1
) {
  _tmpObj.position.set(x, y, z);
  _tmpObj.rotation.set(0, rotY, 0);
  _tmpObj.scale.set(sx, sy, sz);
  _tmpObj.updateMatrix();
  mesh.setMatrixAt(index, _tmpObj.matrix);
}

// ══════════════════════════════════════════════════════════════════════════════
// InstancedDesks — all desks + chairs for the active floor in ~10 draw calls.
// ══════════════════════════════════════════════════════════════════════════════

function InstancedDesks({
  desks,
  yOffset,
}: {
  desks: DeskInfo[];
  yOffset: number;
}) {
  const count = desks.length;
  if (count === 0) return null;

  // Refs for each instanced mesh type
  const surfaceRef = useRef<THREE.InstancedMesh>(null);
  const legRef = useRef<THREE.InstancedMesh>(null);
  const seatRef = useRef<THREE.InstancedMesh>(null);
  const backRef = useRef<THREE.InstancedMesh>(null);
  const baseRef = useRef<THREE.InstancedMesh>(null);
  const stemRef = useRef<THREE.InstancedMesh>(null);
  const armRef = useRef<THREE.InstancedMesh>(null);
  const standRef = useRef<THREE.InstancedMesh>(null);
  const kbRef = useRef<THREE.InstancedMesh>(null);
  const mouseRef = useRef<THREE.InstancedMesh>(null);

  // Leg positions in desk local space (4 per desk)
  const LEG_OFFSETS: [number, number, number][] = [
    [-0.6, 0.375, -0.3],
    [0.6, 0.375, -0.3],
    [-0.6, 0.375, 0.3],
    [0.6, 0.375, 0.3],
  ];

  // Arm offsets in chair local space (2 per chair)
  const ARM_OFFSETS: [number, number][] = [
    [-0.26, 0.58],
    [0.26, 0.58],
  ];

  useEffect(() => {
    desks.forEach((info, i) => {
      const { desk, roomPos } = info;
      // Desk world position relative to room
      const dx = desk.position[0] - roomPos[0];
      const dz = desk.position[2] - roomPos[2];
      // Absolute X/Z
      const ax = roomPos[0] + dx;
      const az = roomPos[2] + dz;
      const rot = desk.rotation;

      // We need to transform local offsets by the desk rotation
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      const tr = (lx: number, lz: number): [number, number] => [
        ax + lx * cosR - lz * sinR,
        az + lx * sinR + lz * cosR,
      ];

      // Desk surface
      if (surfaceRef.current) {
        const [wx, wz] = tr(0, 0);
        setInstanceMatrix(surfaceRef.current, i, wx, yOffset + 0.75, wz, rot);
      }

      // Monitor stand
      if (standRef.current) {
        const [sx, sz] = tr(0, -0.2);
        setInstanceMatrix(standRef.current, i, sx, yOffset + 0.87, sz, rot);
      }

      // Keyboard
      if (kbRef.current) {
        const [kx, kz] = tr(0, 0.15);
        setInstanceMatrix(kbRef.current, i, kx, yOffset + 0.78, kz, rot);
      }

      // Mouse
      if (mouseRef.current) {
        const [mx, mz] = tr(0.28, 0.15);
        setInstanceMatrix(mouseRef.current, i, mx, yOffset + 0.78, mz, rot);
      }

      // Chair components (at CHAIR_OFFSET_Z in desk local space)
      const [cx, cz] = tr(0, CHAIR_OFFSET_Z);

      if (seatRef.current)
        setInstanceMatrix(seatRef.current, i, cx, yOffset + 0.45, cz, rot);
      if (backRef.current) {
        const [bx, bz] = tr(0, CHAIR_OFFSET_Z + 0.22);
        setInstanceMatrix(backRef.current, i, bx, yOffset + 0.72, bz, rot);
      }
      if (baseRef.current)
        setInstanceMatrix(baseRef.current, i, cx, yOffset + 0.05, cz, rot);
      if (stemRef.current)
        setInstanceMatrix(stemRef.current, i, cx, yOffset + 0.25, cz, rot);

      // Desk legs (4 per desk)
      if (legRef.current) {
        LEG_OFFSETS.forEach((offset, j) => {
          const [lx, lz] = tr(offset[0], offset[2]);
          setInstanceMatrix(
            legRef.current!,
            i * 4 + j,
            lx,
            yOffset + offset[1],
            lz,
            rot
          );
        });
      }

      // Chair armrests (2 per chair)
      if (armRef.current) {
        ARM_OFFSETS.forEach((offset, j) => {
          const [arx, arz] = tr(offset[0], CHAIR_OFFSET_Z);
          setInstanceMatrix(
            armRef.current!,
            i * 2 + j,
            arx,
            yOffset + offset[1],
            arz,
            rot
          );
        });
      }
    });

    // Mark all for GPU update
    [surfaceRef, legRef, seatRef, backRef, baseRef, stemRef, armRef, standRef, kbRef, mouseRef].forEach((ref) => {
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    });
  }, [desks, yOffset]);

  // Get agent info for screens
  const agents = useOfficeStore((s) => s.agents);

  // Build screen data for desks that have assigned agents
  const screenData = useMemo(() => {
    return desks
      .map((info) => {
        const agent = info.desk.assignedAgentId
          ? agents.find((a) => a.id === info.desk.assignedAgentId)
          : null;
        if (!agent) return null;

        const { desk, roomPos } = info;
        const dx = desk.position[0] - roomPos[0];
        const dz = desk.position[2] - roomPos[2];
        const ax = roomPos[0] + dx;
        const az = roomPos[2] + dz;
        const rot = desk.rotation;
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        // Monitor screen position in world space (at Z=-0.2 local)
        const mx = ax + 0 * cosR - (-0.2) * sinR;
        const mz = az + 0 * sinR + (-0.2) * cosR;

        return {
          key: desk.id,
          position: [mx, yOffset + 1.0, mz] as [number, number, number],
          rotation: rot,
          contentType: agent.screenContent,
        };
      })
      .filter(Boolean) as {
      key: string;
      position: [number, number, number];
      rotation: number;
      contentType: import("../../types").ScreenContentType;
    }[];
  }, [desks, agents, yOffset]);

  return (
    <>
      {/* Desk surfaces — 1 draw call */}
      <instancedMesh
        ref={surfaceRef}
        args={[deskSurfaceGeo, deskSurfaceMat, count]}
        castShadow
        receiveShadow
      />

      {/* Desk legs — 4 per desk */}
      <instancedMesh
        ref={legRef}
        args={[deskLegGeo, deskLegMat, count * 4]}
        castShadow
      />

      {/* Monitor stands */}
      <instancedMesh
        ref={standRef}
        args={[monitorStandGeo, monitorStandMat, count]}
        castShadow
      />

      {/* Keyboards */}
      <instancedMesh
        ref={kbRef}
        args={[keyboardGeo, keyboardMat, count]}
      />

      {/* Mice */}
      <instancedMesh
        ref={mouseRef}
        args={[mouseGeo, mouseMat, count]}
      />

      {/* Chair seats */}
      <instancedMesh
        ref={seatRef}
        args={[chairSeatGeo, chairDarkMat, count]}
        castShadow
      />

      {/* Chair backrests */}
      <instancedMesh
        ref={backRef}
        args={[chairBackGeo, chairDarkMat, count]}
        castShadow
      />

      {/* Chair bases */}
      <instancedMesh
        ref={baseRef}
        args={[chairBaseGeo, chairBaseMat, count]}
      />

      {/* Chair stems */}
      <instancedMesh
        ref={stemRef}
        args={[chairStemGeo, chairStemMat, count]}
      />

      {/* Chair armrests — 2 per chair */}
      <instancedMesh
        ref={armRef}
        args={[chairArmGeo, chairArmMat, count * 2]}
      />

      {/* Work screens — one Canvas2D texture per assigned desk */}
      {screenData.map((sd) => (
        <group key={sd.key} position={sd.position} rotation={[0, sd.rotation, 0]}>
          <WorkScreen
            contentType={sd.contentType}
            position={[0, 0, 0]}
          />
        </group>
      ))}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RoomExtras — non-desk furniture (meeting tables, plants, server racks).
// Few instances — simple meshes are fine.
// ══════════════════════════════════════════════════════════════════════════════

function RoomExtras({
  room,
  yOffset,
}: {
  room: Room;
  yOffset: number;
}) {
  return (
    <group position={[room.position[0], yOffset, room.position[2]]}>
      {/* Meeting table */}
      {room.type === "meeting-room" && (
        <group position={[0, 0, 1.5]}>
          <mesh position={[0, 0.72, 0]} material={meetingTableTopMat} castShadow>
            <cylinderGeometry args={[1.0, 1.0, 0.05, 20]} />
          </mesh>
          <mesh position={[0, 0.36, 0]} material={meetingTableLegMat}>
            <cylinderGeometry args={[0.06, 0.3, 0.72, 10]} />
          </mesh>
        </group>
      )}

      {/* Plants for lounge/kitchen */}
      {(room.type === "lounge" || room.type === "kitchen") && (
        <>
          <group position={[room.size[0] / 2 - 0.5, 0, room.size[1] / 2 - 0.5]}>
            <mesh position={[0, 0.2, 0]} material={plantPotMat}>
              <cylinderGeometry args={[0.15, 0.12, 0.4, 10]} />
            </mesh>
            <mesh position={[0, 0.55, 0]} material={plantLeafMat}>
              <sphereGeometry args={[0.28, 8, 8]} />
            </mesh>
          </group>
          <group position={[-room.size[0] / 2 + 0.5, 0, room.size[1] / 2 - 0.5]}>
            <mesh position={[0, 0.2, 0]} material={plantPotMat}>
              <cylinderGeometry args={[0.13, 0.1, 0.35, 10]} />
            </mesh>
            <mesh position={[0, 0.5, 0]} material={plantLeafMat}>
              <sphereGeometry args={[0.24, 8, 8]} />
            </mesh>
          </group>
        </>
      )}

      {/* Server racks */}
      {room.type === "server-room" && (
        <group position={[room.size[0] / 2 - 0.8, 0, -room.size[1] / 2 + 0.5]}>
          <mesh position={[0, 0.9, 0]} material={serverRackMat} castShadow>
            <boxGeometry args={[0.7, 1.8, 0.5]} />
          </mesh>
          <mesh position={[-1.0, 0.9, 0]} material={serverRackMat} castShadow>
            <boxGeometry args={[0.7, 1.8, 0.5]} />
          </mesh>
          {/* LEDs */}
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

// ══════════════════════════════════════════════════════════════════════════════
// FloorContent — main export.
// Renders instanced desks + room extras for the active floor.
// ══════════════════════════════════════════════════════════════════════════════

interface FloorContentProps {
  floor: Floor;
  yOffset: number;
}

export function FloorContent({ floor, yOffset }: FloorContentProps) {
  const desks = useMemo(() => collectDesks(floor), [floor]);

  return (
    <group>
      {/* Instanced desks + chairs + work screens */}
      <InstancedDesks desks={desks} yOffset={yOffset} />

      {/* Per-room extras (meeting tables, plants, server racks) */}
      {floor.rooms.map((room) => (
        <RoomExtras key={room.id} room={room} yOffset={yOffset} />
      ))}
    </group>
  );
}

export default FloorContent;
