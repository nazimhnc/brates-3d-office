import { useMemo } from "react";
import * as THREE from "three";
import type { Floor, ViewMode } from "../../types";

// ══════════════════════════════════════════════════════════════════════════════
// BuildingShell — Floor plates, walls, columns, and roof.
//
// Performance:
//   - Shared materials created ONCE at module level, reused by all instances.
//   - Single floor mesh per floor (no overlapping planes / z-fighting).
//   - Interior mode: only active floor slab + grid, no walls/columns/roof.
// ══════════════════════════════════════════════════════════════════════════════

const FLOOR_SIZE = 20;
const FLOOR_HEIGHT = 4;
const WALL_HEIGHT = 3.2;
const WALL_THICKNESS = 0.12;

// ── Shared materials (module-level singletons) ──────────────────────────────

const wallMaterial = new THREE.MeshStandardMaterial({
  color: "#e8e4e0",
  roughness: 0.85,
});

const wallMaterialTransparent = new THREE.MeshStandardMaterial({
  color: "#e8e4e0",
  roughness: 0.85,
  transparent: true,
  opacity: 0.25,
});

const glassMaterial = new THREE.MeshStandardMaterial({
  color: "#b0d0e8",
  roughness: 0.1,
  metalness: 0.1,
  transparent: true,
  opacity: 0.3,
});

const glassMaterialFaded = new THREE.MeshStandardMaterial({
  color: "#b0d0e8",
  roughness: 0.1,
  metalness: 0.1,
  transparent: true,
  opacity: 0.25,
});

const columnMaterial = new THREE.MeshStandardMaterial({
  color: "#a8a4a0",
  roughness: 0.4,
  metalness: 0.15,
});

const roofMaterial = new THREE.MeshStandardMaterial({
  color: "#b4b0a8",
  roughness: 0.6,
});

const groundMaterial = new THREE.MeshStandardMaterial({
  color: "#ddd8e5",
  roughness: 0.95,
});

const labelMaterial = new THREE.MeshStandardMaterial({
  roughness: 0.3,
});

// ── Wall group (3 walls — back, left, glass right) ─────────────────────────

function Walls({ isActive }: { isActive: boolean }) {
  const halfSize = FLOOR_SIZE / 2;
  const wallY = WALL_HEIGHT / 2;

  const opaque = isActive ? wallMaterial : wallMaterialTransparent;
  const glass = isActive ? glassMaterial : glassMaterialFaded;

  return (
    <group>
      {/* Back wall */}
      <mesh
        position={[0, wallY, -halfSize]}
        material={opaque}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[FLOOR_SIZE, WALL_HEIGHT, WALL_THICKNESS]} />
      </mesh>

      {/* Left wall */}
      <mesh
        position={[-halfSize, wallY, 0]}
        rotation={[0, Math.PI / 2, 0]}
        material={opaque}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[FLOOR_SIZE, WALL_HEIGHT, WALL_THICKNESS]} />
      </mesh>

      {/* Right wall (glass) */}
      <mesh
        position={[halfSize, wallY, 0]}
        rotation={[0, Math.PI / 2, 0]}
        material={glass}
      >
        <boxGeometry args={[FLOOR_SIZE, WALL_HEIGHT, WALL_THICKNESS]} />
      </mesh>
    </group>
  );
}

// ── Floor plate (exterior mode) ─────────────────────────────────────────────

function FloorPlate({
  floor,
  yOffset,
  isActive,
}: {
  floor: Floor;
  yOffset: number;
  isActive: boolean;
}) {
  // Per-floor color material — memoized so each floor gets a stable instance
  const floorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: floor.color,
        roughness: 0.7,
        metalness: 0.05,
        transparent: !isActive,
        opacity: isActive ? 1 : 0.25,
      }),
    [floor.color, isActive]
  );

  const floorLabelMat = useMemo(() => {
    const m = labelMaterial.clone();
    m.color = new THREE.Color(floor.color);
    return m;
  }, [floor.color]);

  return (
    <group position={[0, yOffset, 0]}>
      {/* Single floor slab — no overlapping planes */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        material={floorMat}
        receiveShadow
      >
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
      </mesh>

      {/* Grid overlay for active floor */}
      {isActive && (
        <gridHelper
          args={[FLOOR_SIZE, FLOOR_SIZE, "#d0d0d0", "#e0e0e0"]}
          position={[0, 0.01, 0]}
        />
      )}

      {/* Walls */}
      <Walls isActive={isActive} />

      {/* Floor label (inactive floors only) */}
      {!isActive && (
        <mesh
          position={[0, WALL_HEIGHT / 2, FLOOR_SIZE / 2 + 0.1]}
          material={floorLabelMat}
        >
          <boxGeometry args={[3, 0.5, 0.05]} />
        </mesh>
      )}
    </group>
  );
}

// ── Interior floor plate (no walls, no label) ──────────────────────────────

function InteriorFloorPlate({
  floor,
  yOffset,
}: {
  floor: Floor;
  yOffset: number;
}) {
  const floorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: floor.color,
        roughness: 0.7,
        metalness: 0.05,
      }),
    [floor.color]
  );

  return (
    <group position={[0, yOffset, 0]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        material={floorMat}
        receiveShadow
      >
        <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
      </mesh>

      <gridHelper
        args={[FLOOR_SIZE, FLOOR_SIZE, "#d0d0d0", "#e0e0e0"]}
        position={[0, 0.01, 0]}
      />
    </group>
  );
}

// ── Columns ─────────────────────────────────────────────────────────────────

const COLUMN_CORNERS: [number, number][] = [
  [-FLOOR_SIZE / 2, -FLOOR_SIZE / 2],
  [-FLOOR_SIZE / 2, FLOOR_SIZE / 2],
  [FLOOR_SIZE / 2, -FLOOR_SIZE / 2],
  [FLOOR_SIZE / 2, FLOOR_SIZE / 2],
];

function Columns({ totalHeight }: { totalHeight: number }) {
  return (
    <>
      {COLUMN_CORNERS.map(([x, z], i) => (
        <mesh
          key={i}
          position={[x, totalHeight / 2, z]}
          material={columnMaterial}
          castShadow
        >
          <boxGeometry args={[0.2, totalHeight, 0.2]} />
        </mesh>
      ))}
    </>
  );
}

// ── Ground environment ──────────────────────────────────────────────────────

function GroundPlane() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.05, 0]}
      material={groundMaterial}
      receiveShadow
    >
      <planeGeometry args={[100, 100]} />
    </mesh>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BuildingShell — main export
// ══════════════════════════════════════════════════════════════════════════════

interface BuildingShellProps {
  floors: Floor[];
  activeFloorId: string | null;
  viewMode: ViewMode;
}

export function BuildingShell({
  floors,
  activeFloorId,
  viewMode,
}: BuildingShellProps) {
  const isInterior = viewMode === "interior";
  const columnH = floors.length * FLOOR_HEIGHT + 0.5;

  return (
    <group>
      {/* Ground — hidden in interior */}
      {!isInterior && <GroundPlane />}

      {/* Exterior columns — hidden in interior */}
      {!isInterior && <Columns totalHeight={columnH} />}

      {/* Floor plates */}
      {floors.map((floor) => {
        const y = floor.level * FLOOR_HEIGHT;
        const isActive = floor.id === activeFloorId;

        // Interior mode: skip non-active floors entirely
        if (isInterior && !isActive) return null;

        return isInterior ? (
          <InteriorFloorPlate key={floor.id} floor={floor} yOffset={y} />
        ) : (
          <FloorPlate
            key={floor.id}
            floor={floor}
            yOffset={y}
            isActive={isActive}
          />
        );
      })}

      {/* Roof — hidden in interior */}
      {!isInterior && (
        <mesh
          position={[0, floors.length * FLOOR_HEIGHT + 0.05, 0]}
          material={roofMaterial}
          receiveShadow
        >
          <boxGeometry args={[FLOOR_SIZE + 0.3, 0.1, FLOOR_SIZE + 0.3]} />
        </mesh>
      )}
    </group>
  );
}

export default BuildingShell;
