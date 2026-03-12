// ══════════════════════════════════════════════════════════════════════════════
// EditorScene — Clean studio scene for character customization.
//
// Renders a single HumanAvatar on a neutral background with orbit controls.
// No office, no simulation, no other agents.
// ══════════════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";
import { useOfficeStore } from "../../stores/officeStore";
import { HumanAvatar, DEFAULT_HUMAN_APPEARANCE } from "../humans/HumanAvatar";

const groundMaterial = new THREE.MeshStandardMaterial({
  color: "#e8e4f0",
  roughness: 0.95,
});

export function EditorScene() {
  const agents = useOfficeStore((s) => s.agents);
  const selectedAgentId = useOfficeStore((s) => s.selectedAgentId);

  const agent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? agents[0] ?? null,
    [agents, selectedAgentId],
  );

  const appearance = useMemo(() => {
    if (!agent) return DEFAULT_HUMAN_APPEARANCE;
    return {
      ...DEFAULT_HUMAN_APPEARANCE,
      bodyType: agent.gender,
      skinTone: agent.appearance.skinColor,
      hairColor: agent.appearance.hairColor,
      hairStyle:
        agent.appearance.hairStyle === "medium"
          ? ("short" as const)
          : agent.appearance.hairStyle,
      shirtColor: agent.appearance.shirtColor,
      pantsColor: agent.appearance.pantsColor,
      shoeColor: agent.appearance.shoeColor,
      height: agent.appearance.height,
      eyeColor: agent.appearance.eyeColor,
    };
  }, [agent]);

  return (
    <>
      {/* Neutral background */}
      <color attach="background" args={["#e8e0f5"]} />
      <fog attach="fog" args={["#e8e0f5", 8, 20]} />
      <Environment preset="city" background={false} />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3, 4, -2]} intensity={0.4} />

      {/* Ground disc */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        material={groundMaterial}
        receiveShadow
      >
        <circleGeometry args={[3, 48]} />
      </mesh>

      {/* Contact shadow */}
      <ContactShadows
        position={[0, 0.005, 0]}
        opacity={0.35}
        scale={6}
        blur={2.5}
        far={3}
        resolution={256}
        color="#3a2060"
      />

      {/* The character */}
      {agent && (
        <HumanAvatar
          appearance={appearance}
          position={[0, 0, 0]}
          rotation={0}
          animation="idle"
          name={agent.name}
          role={agent.role}
        />
      )}

      {/* Orbit controls centered on character */}
      <OrbitControls
        target={[0, 0.85, 0]}
        enablePan={false}
        enableDamping
        dampingFactor={0.1}
        minDistance={2}
        maxDistance={6}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.1}
        rotateSpeed={0.6}
        makeDefault
      />
    </>
  );
}

export default EditorScene;
