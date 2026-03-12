/**
 * anchors.ts -- Anchor query & occupancy utilities.
 *
 * Pure functions that operate on Anchor[] arrays.  No store access --
 * the caller reads from the store and passes data in.
 */

import type { Anchor, AnchorType, Vec3 } from '../types/index.ts';

// ─── Query helpers ──────────────────────────────────────────────

/**
 * Find the first anchor of `type` on `floorId` that still has room
 * (occupantIds.length < capacity).  Returns `null` if nothing is
 * available.
 */
export function findAvailableAnchor(
  anchors: Anchor[],
  floorId: string,
  type: AnchorType,
): Anchor | null {
  for (const a of anchors) {
    if (
      a.floorId === floorId &&
      a.type === type &&
      a.occupantIds.length < a.capacity
    ) {
      return a;
    }
  }
  return null;
}

/**
 * Collect up to `count` meeting-spot anchors on `floorId` that are
 * currently unoccupied (occupantIds is empty).
 *
 * This is used when scheduling a new meeting -- each participant gets
 * their own meeting-spot anchor.
 */
export function getAnchorsForMeeting(
  anchors: Anchor[],
  floorId: string,
  count: number,
): Anchor[] {
  const result: Anchor[] = [];
  for (const a of anchors) {
    if (
      a.floorId === floorId &&
      a.type === 'meeting-spot' &&
      a.occupantIds.length === 0
    ) {
      result.push(a);
      if (result.length >= count) break;
    }
  }
  return result;
}

/**
 * Find all anchors of the given types on a floor that have spare capacity.
 */
export function findAvailableAnchorsOfTypes(
  anchors: Anchor[],
  floorId: string,
  types: AnchorType[],
): Anchor[] {
  return anchors.filter(
    (a) =>
      a.floorId === floorId &&
      types.includes(a.type) &&
      a.occupantIds.length < a.capacity,
  );
}

// ─── Spatial distribution ────────────────────────────────────────

/**
 * Compute an offset position for the Nth occupant at an anchor.
 *
 * - 1 occupant:  stand at center.
 * - 2 occupants: face each other across the anchor (±radius on X).
 * - 3+ occupants: distribute evenly around a circle.
 */
export function computeOccupantOffset(
  anchorPosition: Vec3,
  occupantIndex: number,
  totalOccupants: number,
  radius = 0.7,
): Vec3 {
  if (totalOccupants <= 1) {
    return [anchorPosition[0], anchorPosition[1], anchorPosition[2]];
  }

  const angle = (2 * Math.PI * occupantIndex) / totalOccupants;
  return [
    anchorPosition[0] + radius * Math.cos(angle),
    anchorPosition[1],
    anchorPosition[2] + radius * Math.sin(angle),
  ];
}

// ─── Occupancy mutations ────────────────────────────────────────
// These return a NEW Anchor object (immutable update friendly).

/**
 * Add `agentId` to the anchor's occupant list.
 * Returns a shallow copy with the updated occupantIds.
 * No-ops (returns same reference) if the agent is already occupying.
 */
export function occupyAnchor(anchor: Anchor, agentId: string): Anchor {
  if (anchor.occupantIds.includes(agentId)) return anchor;
  return {
    ...anchor,
    occupantIds: [...anchor.occupantIds, agentId],
  };
}

/**
 * Remove `agentId` from the anchor's occupant list.
 * Returns a shallow copy with the updated occupantIds.
 * No-ops if the agent was not occupying.
 */
export function vacateAnchor(anchor: Anchor, agentId: string): Anchor {
  if (!anchor.occupantIds.includes(agentId)) return anchor;
  return {
    ...anchor,
    occupantIds: anchor.occupantIds.filter((id) => id !== agentId),
  };
}
