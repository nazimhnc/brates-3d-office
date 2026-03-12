/**
 * movement.ts -- Pure movement math (no React, no store).
 *
 * Every walking agent calls `interpolateMovement` once per frame.
 * The result is a new position, whether the agent has arrived, and the
 * facing angle derived from the movement direction.
 */

import type { Vec3 } from '../types/index.ts';

// ─── Constants ──────────────────────────────────────────────────
/** Walking speed in world-units per second. */
export const MOVEMENT_SPEED = 2.5;

/** Distance at which an agent snaps to its target and is considered arrived. */
export const ARRIVAL_THRESHOLD = 0.15;

// ─── Reusable scratch values (avoid per-frame allocation) ───────
let _dx = 0;
let _dz = 0;
let _dist = 0;
let _step = 0;

// ─── Core functions ─────────────────────────────────────────────

/**
 * Compute the facing angle (radians, Y-axis rotation) from one XZ point
 * to another.  Returns `fallback` when the two points overlap.
 */
export function computeFacingAngle(
  from: Vec3,
  to: Vec3,
  fallback = 0,
): number {
  _dx = to[0] - from[0];
  _dz = to[2] - from[2];
  _dist = Math.sqrt(_dx * _dx + _dz * _dz);
  if (_dist < 1e-6) return fallback;
  return Math.atan2(_dx, _dz);
}

export interface MovementResult {
  position: Vec3;
  arrived: boolean;
  facingAngle: number;
}

/**
 * Move `current` toward `target` at a constant `speed` (units/sec).
 *
 * - Linear interpolation capped by `speed * dt` so the agent never
 *   overshoots.
 * - When the remaining distance drops below `ARRIVAL_THRESHOLD` the
 *   agent snaps to `target` and `arrived` is set to `true`.
 * - `dt` is the frame delta in **seconds** (e.g. 0.016 for 60 fps).
 */
export function interpolateMovement(
  current: Vec3,
  target: Vec3,
  speed: number,
  dt: number,
): MovementResult {
  _dx = target[0] - current[0];
  _dz = target[2] - current[2];
  _dist = Math.sqrt(_dx * _dx + _dz * _dz);

  // Already close enough -- snap to target.
  if (_dist < ARRIVAL_THRESHOLD) {
    return {
      position: [target[0], target[1], target[2]],
      arrived: true,
      facingAngle: computeFacingAngle(current, target, 0),
    };
  }

  _step = speed * dt;

  // Clamp step so we never overshoot.
  if (_step >= _dist) {
    return {
      position: [target[0], target[1], target[2]],
      arrived: true,
      facingAngle: Math.atan2(_dx, _dz),
    };
  }

  // Normalize direction and advance.
  const ratio = _step / _dist;
  const newX = current[0] + _dx * ratio;
  const newZ = current[2] + _dz * ratio;

  return {
    position: [newX, current[1], newZ],
    arrived: false,
    facingAngle: Math.atan2(_dx, _dz),
  };
}

/**
 * Euclidean distance on the XZ plane between two points.
 */
export function distanceXZ(a: Vec3, b: Vec3): number {
  _dx = a[0] - b[0];
  _dz = a[2] - b[2];
  return Math.sqrt(_dx * _dx + _dz * _dz);
}
