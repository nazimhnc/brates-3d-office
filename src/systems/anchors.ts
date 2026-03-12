/**
 * anchors.ts -- Anchor query & occupancy utilities.
 *
 * Pure functions that operate on Anchor[] arrays.  No store access --
 * the caller reads from the store and passes data in.
 */

import type { Anchor, AnchorType } from '../types/index.ts';

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
