import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useOfficeStore } from "../../stores/officeStore";

const FLOOR_HEIGHT = 4;
const ORBIT_TARGET_Y_OFFSET = 1.5;
const TOPDOWN_HEIGHT = 25;
const CAMERA_LERP_SPEED = 2.5;
const TARGET_LERP_SPEED = 3.0;

export function CameraController() {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();

  const cameraMode = useOfficeStore((s) => s.cameraMode);
  const viewingFloorLevel = useOfficeStore((s) => s.viewingFloorLevel);
  const selectedAgentId = useOfficeStore((s) => s.selectedAgentId);

  const targetOrbitCenter = useRef(new THREE.Vector3(0, 0, 0));

  // Update targets when floor/mode changes
  useEffect(() => {
    const floorY = viewingFloorLevel * FLOOR_HEIGHT;

    if (cameraMode === "top-down") {
      targetOrbitCenter.current.set(0, floorY, 0);
    } else {
      targetOrbitCenter.current.set(0, floorY + ORBIT_TARGET_Y_OFFSET, 0);
    }
  }, [cameraMode, viewingFloorLevel]);

  useFrame((_, dt) => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current as unknown as {
      target: THREE.Vector3;
      update: () => void;
      enableRotate: boolean;
      maxPolarAngle: number;
      minPolarAngle: number;
      maxDistance: number;
      minDistance: number;
    };

    const floorY = viewingFloorLevel * FLOOR_HEIGHT;
    const lerpDt = Math.min(dt * CAMERA_LERP_SPEED, 1);
    const targetLerpDt = Math.min(dt * TARGET_LERP_SPEED, 1);

    // Smoothly lerp orbit target
    controls.target.lerp(targetOrbitCenter.current, targetLerpDt);

    if (cameraMode === "top-down") {
      const topdownPos = new THREE.Vector3(0, floorY + TOPDOWN_HEIGHT, 0.01);
      camera.position.lerp(topdownPos, lerpDt);
      controls.enableRotate = false;
      controls.maxPolarAngle = 0.01;
      controls.minPolarAngle = 0;
    } else {
      controls.enableRotate = true;
      controls.maxPolarAngle = Math.PI / 2.1;
      controls.minPolarAngle = Math.PI / 12;

      // Gently guide camera Y to match floor
      if (!selectedAgentId) {
        const defaultY = floorY + 12;
        const currentY = camera.position.y;
        if (Math.abs(currentY - defaultY) > 1) {
          camera.position.y = THREE.MathUtils.lerp(currentY, defaultY, lerpDt * 0.5);
        }
      }
    }

    controls.maxDistance = cameraMode === "top-down" ? TOPDOWN_HEIGHT + 5 : 40;
    controls.minDistance = cameraMode === "top-down" ? TOPDOWN_HEIGHT - 5 : 5;
    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableDamping
      dampingFactor={0.08}
      panSpeed={0.8}
      rotateSpeed={0.6}
      maxPolarAngle={cameraMode === "top-down" ? 0.01 : Math.PI / 2.1}
      minPolarAngle={cameraMode === "top-down" ? 0 : Math.PI / 12}
      minDistance={5}
      maxDistance={40}
      makeDefault
    />
  );
}

export default CameraController;
