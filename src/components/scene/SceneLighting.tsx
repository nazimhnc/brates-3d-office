import { useMemo } from "react";
import { useOfficeStore } from "../../stores/officeStore";
import type { QualityTier } from "../../types";

// ══════════════════════════════════════════════════════════════════════════════
// SceneLighting — Quality-tier-aware lighting for the 3D office.
//
// Lights:
//   1 directional (key)   — shadow-casting, shadow map scaled by quality tier
//   1 directional (fill)  — no shadow, soft fill from opposite side
//   1 ambient             — baseline illumination
//
// No point lights — they're expensive per-pixel on weak GPUs.
// ══════════════════════════════════════════════════════════════════════════════

function shadowMapSize(tier: QualityTier): number {
  switch (tier) {
    case "low":
      return 0; // shadows disabled
    case "medium":
      return 512;
    case "high":
      return 1024;
  }
}

interface SceneLightingProps {
  floorY: number;
}

export function SceneLighting({ floorY }: SceneLightingProps) {
  const qualityTier = useOfficeStore((s) => s.qualityTier);
  const smSize = useMemo(() => shadowMapSize(qualityTier), [qualityTier]);
  const castShadow = smSize > 0;

  return (
    <>
      {/* Ambient — baseline fill */}
      <ambientLight intensity={0.4} color="#f0e8ff" />

      {/* Key light — shadow-casting directional */}
      <directionalLight
        position={[12, 20 + floorY, 8]}
        intensity={0.8}
        color="#fff8f0"
        castShadow={castShadow}
        shadow-mapSize-width={smSize || undefined}
        shadow-mapSize-height={smSize || undefined}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.001}
      />

      {/* Fill light — no shadow, opposite side */}
      <directionalLight
        position={[-8, 12 + floorY, -6]}
        intensity={0.25}
        color="#e8e0f8"
      />
    </>
  );
}

export default SceneLighting;
