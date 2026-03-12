// ══════════════════════════════════════════════════════════════════════════════
// useUserControls — WASD keyboard + mouse movement for the user avatar.
//
// Manages keyboard state in a ref (no re-renders), updates the store position
// each frame via useFrame. Movement direction is relative to camera in FP mode,
// relative to avatar rotation in TP mode. Clamps position to floor bounds.
// ══════════════════════════════════════════════════════════════════════════════

import { useRef, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useOfficeStore } from "../stores/officeStore";

// ── Constants ────────────────────────────────────────────────────────────────

const FLOOR_HALF = 9; // FLOOR_SIZE=20, clamp to ±9
const FLOOR_HEIGHT = 4;
const SPRINT_MULTIPLIER = 2.0;
const MOUSE_SENSITIVITY = 0.002;

// ── Keyboard state (plain object, no React state) ────────────────────────────

interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
}

// Reusable THREE objects — allocated once, never per-frame
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _movement = new THREE.Vector3();

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useUserControls(): { isMoving: boolean } {
  const { gl, camera } = useThree();
  const keys = useRef<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  });
  const isMovingRef = useRef(false);
  const isPointerLocked = useRef(false);
  const yawRef = useRef(0); // accumulated yaw from mouse in FP mode

  // Store selectors (non-reactive refs for hot-path)
  const getState = useOfficeStore.getState;

  // ── Keyboard handlers ────────────────────────────────────────────────────

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't capture keys when typing in input fields
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;

    const state = getState();
    if (!state.userAvatar.enabled) return;

    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        keys.current.forward = true;
        e.preventDefault();
        break;
      case "KeyS":
      case "ArrowDown":
        keys.current.backward = true;
        e.preventDefault();
        break;
      case "KeyA":
      case "ArrowLeft":
        keys.current.left = true;
        e.preventDefault();
        break;
      case "KeyD":
      case "ArrowRight":
        keys.current.right = true;
        e.preventDefault();
        break;
      case "ShiftLeft":
      case "ShiftRight":
        keys.current.sprint = true;
        break;
    }
  }, [getState]);

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        keys.current.forward = false;
        break;
      case "KeyS":
      case "ArrowDown":
        keys.current.backward = false;
        break;
      case "KeyA":
      case "ArrowLeft":
        keys.current.left = false;
        break;
      case "KeyD":
      case "ArrowRight":
        keys.current.right = false;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        keys.current.sprint = false;
        break;
    }
  }, []);

  // ── Pointer lock for first-person mouse look ─────────────────────────────

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isPointerLocked.current) return;
    const state = getState();
    if (!state.userAvatar.enabled) return;
    if (state.userAvatar.cameraMode !== "first-person") return;

    yawRef.current -= e.movementX * MOUSE_SENSITIVITY;
    // Update store rotation
    state.setUserRotation(yawRef.current);
  }, [getState]);

  const onPointerLockChange = useCallback(() => {
    isPointerLocked.current = document.pointerLockElement === gl.domElement;
  }, [gl.domElement]);

  const onCanvasClick = useCallback(() => {
    const state = getState();
    if (
      state.userAvatar.enabled &&
      state.userAvatar.cameraMode === "first-person" &&
      !isPointerLocked.current
    ) {
      gl.domElement.requestPointerLock();
    }
  }, [getState, gl.domElement]);

  // ── Event listener setup ─────────────────────────────────────────────────

  useEffect(() => {
    const canvas = gl.domElement;

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    canvas.addEventListener("click", onCanvasClick);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      canvas.removeEventListener("click", onCanvasClick);

      // Release pointer lock on unmount
      if (document.pointerLockElement === canvas) {
        document.exitPointerLock();
      }
    };
  }, [gl.domElement, onKeyDown, onKeyUp, onMouseMove, onPointerLockChange, onCanvasClick]);

  // ── Per-frame position update ────────────────────────────────────────────

  useFrame((_, dt) => {
    const state = getState();
    if (!state.userAvatar.enabled) {
      isMovingRef.current = false;
      return;
    }

    const k = keys.current;
    const hasInput =
      k.forward || k.backward || k.left || k.right;

    if (!hasInput) {
      isMovingRef.current = false;
      return;
    }

    const cameraMode = state.userAvatar.cameraMode;
    const speed =
      state.userAvatar.moveSpeed * (k.sprint ? SPRINT_MULTIPLIER : 1.0);
    const floorY = state.viewingFloorLevel * FLOOR_HEIGHT;

    // Compute forward/right vectors
    if (cameraMode === "first-person") {
      // In FP: forward is based on avatar rotation (yaw)
      const yaw = state.userAvatar.rotation;
      _forward.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
      _right.set(_forward.z, 0, -_forward.x); // perpendicular on XZ plane
    } else if (cameraMode === "third-person") {
      // In TP: forward is based on avatar rotation
      const yaw = state.userAvatar.rotation;
      _forward.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
      _right.set(_forward.z, 0, -_forward.x);
    } else {
      // Orbit mode: forward is camera's -Z projected onto XZ plane
      camera.getWorldDirection(_forward);
      _forward.y = 0;
      _forward.normalize();
      _right.set(_forward.z, 0, -_forward.x);
    }

    // Build movement vector
    _movement.set(0, 0, 0);
    if (k.forward) _movement.add(_forward);
    if (k.backward) _movement.sub(_forward);
    if (k.right) _movement.add(_right);
    if (k.left) _movement.sub(_right);

    if (_movement.lengthSq() < 0.001) {
      isMovingRef.current = false;
      return;
    }

    _movement.normalize().multiplyScalar(speed * dt);

    // Current position
    const pos = state.userAvatar.position;
    let nx = pos[0] + _movement.x;
    let nz = pos[2] + _movement.z;

    // Clamp to floor bounds
    nx = Math.max(-FLOOR_HALF, Math.min(FLOOR_HALF, nx));
    nz = Math.max(-FLOOR_HALF, Math.min(FLOOR_HALF, nz));

    state.setUserPosition([nx, floorY, nz]);

    // Update facing direction in TP and orbit modes (face movement direction)
    if (cameraMode === "third-person" || cameraMode === "orbit") {
      const angle = Math.atan2(-_movement.x, -_movement.z);
      state.setUserRotation(angle);
    }

    isMovingRef.current = true;
  });

  return { isMoving: isMovingRef.current };
}
