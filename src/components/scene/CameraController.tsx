import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useOfficeStore } from "../../stores/officeStore";

const FLOOR_HEIGHT = 4;
const ORBIT_TARGET_Y_OFFSET = 1.5;
const TOPDOWN_HEIGHT = 25;
const TARGET_LERP_SPEED = 3.0;

export function CameraController() {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const { camera } = useThree();

  const cameraMode = useOfficeStore((s) => s.cameraMode);
  const viewMode = useOfficeStore((s) => s.viewMode);
  const viewingFloorLevel = useOfficeStore((s) => s.viewingFloorLevel);

  const targetOrbitCenter = useRef(new THREE.Vector3(0, 0, 0));
  const prevViewMode = useRef(viewMode);
  const prevFloorLevel = useRef(viewingFloorLevel);

  // Only reposition camera on MODE SWITCH or FLOOR CHANGE — not every frame
  useEffect(() => {
    const floorY = viewingFloorLevel * FLOOR_HEIGHT;

    if (cameraMode === "top-down") {
      targetOrbitCenter.current.set(0, floorY, 0);
      camera.position.set(0, floorY + TOPDOWN_HEIGHT, 0.01);
    } else if (viewMode === "interior") {
      targetOrbitCenter.current.set(0, floorY + 1.0, 0);
      // Only snap camera when switching TO interior (not every render)
      if (prevViewMode.current !== "interior" || prevFloorLevel.current !== viewingFloorLevel) {
        camera.position.set(8, floorY + 1.7, 8);
      }
    } else {
      targetOrbitCenter.current.set(0, floorY + ORBIT_TARGET_Y_OFFSET, 0);
      // Only snap camera when switching TO exterior
      if (prevViewMode.current !== "exterior" || prevFloorLevel.current !== viewingFloorLevel) {
        camera.position.set(20, floorY + 12, 20);
      }
    }

    prevViewMode.current = viewMode;
    prevFloorLevel.current = viewingFloorLevel;
  }, [cameraMode, viewMode, viewingFloorLevel, camera]);

  // Smooth orbit target only — DO NOT touch camera.position (let user control it freely)
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

    const targetLerpDt = Math.min(dt * TARGET_LERP_SPEED, 1);

    // Smoothly move orbit center — this is fine, it's just where you rotate around
    controls.target.lerp(targetOrbitCenter.current, targetLerpDt);

    // Set limits based on mode but DON'T force camera position
    if (cameraMode === "top-down") {
      controls.enableRotate = false;
      controls.maxPolarAngle = 0.01;
      controls.minPolarAngle = 0;
      controls.maxDistance = TOPDOWN_HEIGHT + 5;
      controls.minDistance = TOPDOWN_HEIGHT - 5;
    } else if (viewMode === "interior") {
      controls.enableRotate = true;
      controls.maxPolarAngle = Math.PI * 0.9;
      controls.minPolarAngle = Math.PI / 20;
      controls.maxDistance = 20;
      controls.minDistance = 1;
    } else {
      controls.enableRotate = true;
      controls.maxPolarAngle = Math.PI / 2.1;
      controls.minPolarAngle = Math.PI / 12;
      controls.maxDistance = 50;
      controls.minDistance = 5;
    }

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
      maxPolarAngle={Math.PI / 2.1}
      minPolarAngle={Math.PI / 12}
      minDistance={1}
      maxDistance={50}
      makeDefault
    />
  );
}

export default CameraController;
