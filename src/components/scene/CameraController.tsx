// ══════════════════════════════════════════════════════════════════════════════
// CameraController — Multi-mode camera system for the 3D office.
//
// Supports four camera modes:
//   1. Orbit (existing)      — OrbitControls, user drags to rotate around office
//   2. Top-down (existing)   — Fixed top camera, no rotation
//   3. First-person (new)    — Camera at avatar eye level, pointer-lock mouse look
//   4. Third-person (new)    — Camera follows behind avatar, smooth follow
//
// FP/TP modes are only active when the user avatar is enabled.
// OrbitControls are NOT rendered in FP/TP modes to avoid input conflicts.
// ══════════════════════════════════════════════════════════════════════════════

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useOfficeStore } from "../../stores/officeStore";

// ── Constants ────────────────────────────────────────────────────────────────

const FLOOR_HEIGHT = 4;
const ORBIT_TARGET_Y_OFFSET = 1.5;
const TOPDOWN_HEIGHT = 25;
const TARGET_LERP_SPEED = 3.0;

// First-person
const FP_EYE_HEIGHT = 1.65; // eye level above floor

// Third-person
const TP_OFFSET = new THREE.Vector3(0, 3, 5); // behind and above
const TP_FOLLOW_SPEED = 5.0; // lerp speed for camera follow
const TP_LOOK_HEIGHT = 1.2; // look at avatar chest height

// ── Reusable THREE objects (no per-frame allocations) ────────────────────────

const _targetPos = new THREE.Vector3();
const _desiredCam = new THREE.Vector3();
const _lookAt = new THREE.Vector3();

// ══════════════════════════════════════════════════════════════════════════════
// Orbit / Top-Down controller — existing behavior preserved exactly
// ══════════════════════════════════════════════════════════════════════════════

function OrbitCameraController() {
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
      if (
        prevViewMode.current !== "interior" ||
        prevFloorLevel.current !== viewingFloorLevel
      ) {
        camera.position.set(8, floorY + 1.7, 8);
      }
    } else {
      targetOrbitCenter.current.set(
        0,
        floorY + ORBIT_TARGET_Y_OFFSET,
        0,
      );
      if (
        prevViewMode.current !== "exterior" ||
        prevFloorLevel.current !== viewingFloorLevel
      ) {
        camera.position.set(20, floorY + 12, 20);
      }
    }

    prevViewMode.current = viewMode;
    prevFloorLevel.current = viewingFloorLevel;
  }, [cameraMode, viewMode, viewingFloorLevel, camera]);

  // Smooth orbit target only — DO NOT touch camera.position
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
    controls.target.lerp(targetOrbitCenter.current, targetLerpDt);

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

// ══════════════════════════════════════════════════════════════════════════════
// First-Person camera — no OrbitControls, camera at avatar eye height
// ══════════════════════════════════════════════════════════════════════════════

function FirstPersonCamera() {
  const { camera } = useThree();
  const pitchRef = useRef(0);
  const getState = useOfficeStore.getState;

  // Set initial camera orientation
  useEffect(() => {
    const state = getState();
    const pos = state.userAvatar.position;
    const floorY = state.viewingFloorLevel * FLOOR_HEIGHT;
    const eyeY = floorY + FP_EYE_HEIGHT;
    camera.position.set(pos[0], eyeY, pos[2]);
    pitchRef.current = 0;
  }, [camera, getState]);

  // Handle pitch from mouse movement
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (document.pointerLockElement == null) return;
      pitchRef.current -= e.movementY * 0.002;
      // Clamp pitch to avoid flipping
      pitchRef.current = Math.max(
        -Math.PI / 2.2,
        Math.min(Math.PI / 2.2, pitchRef.current),
      );
    }

    document.addEventListener("mousemove", onMouseMove);
    return () => document.removeEventListener("mousemove", onMouseMove);
  }, []);

  useFrame(() => {
    const state = getState();
    const pos = state.userAvatar.position;
    const yaw = state.userAvatar.rotation;
    const floorY = state.viewingFloorLevel * FLOOR_HEIGHT;
    const eyeY = floorY + FP_EYE_HEIGHT;

    // Position camera at avatar eye level
    camera.position.set(pos[0], eyeY, pos[2]);

    // Apply yaw + pitch via Euler rotation
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitchRef.current, yaw, 0);
  });

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// Third-Person camera — follows behind avatar with smooth lerp
// ══════════════════════════════════════════════════════════════════════════════

function ThirdPersonCamera() {
  const { camera } = useThree();
  const getState = useOfficeStore.getState;

  // Initialize camera behind avatar
  useEffect(() => {
    const state = getState();
    const pos = state.userAvatar.position;
    const yaw = state.userAvatar.rotation;
    const floorY = state.viewingFloorLevel * FLOOR_HEIGHT;

    // Compute desired position: rotate offset by avatar's yaw
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    const offsetX = TP_OFFSET.x * cosY + TP_OFFSET.z * sinY;
    const offsetZ = -TP_OFFSET.x * sinY + TP_OFFSET.z * cosY;

    camera.position.set(
      pos[0] + offsetX,
      floorY + TP_OFFSET.y,
      pos[2] + offsetZ,
    );
  }, [camera, getState]);

  useFrame((_, dt) => {
    const state = getState();
    const pos = state.userAvatar.position;
    const yaw = state.userAvatar.rotation;
    const floorY = state.viewingFloorLevel * FLOOR_HEIGHT;

    // Target: avatar position at floor level
    _targetPos.set(pos[0], floorY, pos[2]);

    // Desired camera position: offset rotated by avatar yaw
    const sinY = Math.sin(yaw);
    const cosY = Math.cos(yaw);
    const offsetX = TP_OFFSET.x * cosY + TP_OFFSET.z * sinY;
    const offsetZ = -TP_OFFSET.x * sinY + TP_OFFSET.z * cosY;

    _desiredCam.set(
      pos[0] + offsetX,
      floorY + TP_OFFSET.y,
      pos[2] + offsetZ,
    );

    // Smooth follow
    const lerpFactor = Math.min(dt * TP_FOLLOW_SPEED, 1);
    camera.position.lerp(_desiredCam, lerpFactor);

    // Look at avatar chest
    _lookAt.set(pos[0], floorY + TP_LOOK_HEIGHT, pos[2]);
    camera.lookAt(_lookAt);
  });

  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// Main CameraController — switches between sub-controllers
// ══════════════════════════════════════════════════════════════════════════════

export function CameraController() {
  const avatarEnabled = useOfficeStore((s) => s.userAvatar.enabled);
  const userCameraMode = useOfficeStore((s) => s.userAvatar.cameraMode);

  // Determine which camera mode to use
  const useFirstPerson =
    avatarEnabled && userCameraMode === "first-person";
  const useThirdPerson =
    avatarEnabled && userCameraMode === "third-person";

  // If user avatar is active in FP or TP mode, use those controllers
  // Otherwise fall back to the existing orbit/top-down system
  if (useFirstPerson) {
    return <FirstPersonCamera />;
  }

  if (useThirdPerson) {
    return <ThirdPersonCamera />;
  }

  // Default: orbit / top-down with OrbitControls
  return <OrbitCameraController />;
}

export default CameraController;
