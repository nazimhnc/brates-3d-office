import { useMemo } from "react";
import {
  EffectComposer,
  Bloom,
  Vignette,
  SSAO,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

// ══════════════════════════════════════════════════════════════════════════════
// PostProcessing — Subtle cinematic post-processing for the 3D office.
//
// Effects (all deliberately restrained for a professional look):
//   1. SSAO   — Subtle screen-space ambient occlusion for depth in corners
//   2. Bloom  — Gentle bloom for emissive materials (LEDs, desk lamps, halos)
//   3. Vignette — Soft darkening at edges for cinematic framing
//
// Performance:
//   - All effects use half-resolution where supported
//   - SSAO uses minimal samples for mobile-friendly performance
//   - Bloom threshold is high — only truly bright emissives trigger it
// ══════════════════════════════════════════════════════════════════════════════

interface PostProcessingProps {
  /** Enable/disable all post-processing (for performance toggle) */
  enabled?: boolean;
  /** Enable ambient occlusion */
  ssao?: boolean;
  /** Enable bloom for emissive materials */
  bloom?: boolean;
  /** Enable edge vignette */
  vignette?: boolean;
}

function SSAOEffect({ blendFunction }: { blendFunction: BlendFunction }) {
  return (
    <SSAO
      blendFunction={blendFunction}
      samples={16}
      radius={5}
      intensity={18}
      luminanceInfluence={0.5}
      worldDistanceThreshold={20}
      worldDistanceFalloff={5}
      worldProximityThreshold={0.4}
      worldProximityFalloff={0.2}
    />
  );
}

function BloomEffect({ blendFunction }: { blendFunction: BlendFunction }) {
  return (
    <Bloom
      blendFunction={blendFunction}
      intensity={0.35}
      luminanceThreshold={0.8}
      luminanceSmoothing={0.4}
      mipmapBlur
      radius={0.6}
    />
  );
}

function VignetteEffect({ blendFunction }: { blendFunction: BlendFunction }) {
  return (
    <Vignette
      blendFunction={blendFunction}
      offset={0.35}
      darkness={0.45}
    />
  );
}

export function PostProcessing({
  enabled = true,
  ssao: enableSSAO = true,
  bloom: enableBloom = true,
  vignette: enableVignette = true,
}: PostProcessingProps) {
  const normalBlend = useMemo(() => BlendFunction.NORMAL, []);
  const multiplyBlend = useMemo(() => BlendFunction.MULTIPLY, []);

  if (!enabled) return null;

  return (
    <EffectComposer multisampling={0}>
      {enableSSAO ? <SSAOEffect blendFunction={multiplyBlend} /> : <></>}
      {enableBloom ? <BloomEffect blendFunction={normalBlend} /> : <></>}
      {enableVignette ? <VignetteEffect blendFunction={normalBlend} /> : <></>}
    </EffectComposer>
  );
}

export default PostProcessing;
