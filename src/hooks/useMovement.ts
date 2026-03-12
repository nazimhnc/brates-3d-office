/**
 * useMovement.ts -- Per-frame movement interpolation hook.
 *
 * Call ONCE inside MainScene.  Each frame it iterates over every
 * agent whose `movementState === 'walking'` and advances them
 * toward their `targetPosition` at a constant speed.
 *
 * Performance:
 *   - O(n) per frame where n = number of agents (only walking agents
 *     do real work).
 *   - Zero allocations per frame (the Vec3 tuple comes from
 *     interpolateMovement which reuses scratch vars internally and
 *     only allocates the small result object).
 */

import { useFrame } from '@react-three/fiber';
import { useOfficeStore } from '../stores/officeStore.ts';
import {
  interpolateMovement,
  MOVEMENT_SPEED,
} from '../systems/movement.ts';

export function useMovement(): void {
  useFrame((_state, delta) => {
    // Cap delta to avoid huge jumps when the tab loses focus.
    const dt = Math.min(delta, 0.1);

    const store = useOfficeStore.getState();
    if (!store.simulationRunning) return;

    const { agents } = store;

    for (const agent of agents) {
      if (agent.movementState !== 'walking' || agent.targetPosition === null) {
        continue;
      }

      const result = interpolateMovement(
        agent.position,
        agent.targetPosition,
        MOVEMENT_SPEED,
        dt,
      );

      if (result.arrived) {
        store.updateAgentPosition(agent.id, result.position, 'stationary');
      } else {
        store.updateAgentPosition(agent.id, result.position, 'walking');
      }

      store.setAgentFacing(agent.id, result.facingAngle);
    }
  });
}
