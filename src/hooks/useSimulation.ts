/**
 * useSimulation.ts -- React hook that drives the simulation tick loop.
 *
 * Call ONCE inside MainScene.  It accumulates elapsed time inside
 * `useFrame` and fires a simulation tick every `tickInterval` ms
 * when the simulation is running.
 *
 * The tick function returns an array of commands that this hook
 * dispatches to the store one by one.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useOfficeStore } from '../stores/officeStore.ts';
import { tick, DEFAULT_SIM_CONFIG } from '../systems/simulation.ts';
import type { SimCommand } from '../systems/simulation.ts';

export function useSimulation(): void {
  const elapsedRef = useRef(0);

  useFrame((_state, delta) => {
    const store = useOfficeStore.getState();
    if (!store.simulationRunning) return;

    // Accumulate time in ms.
    elapsedRef.current += delta * 1000;

    if (elapsedRef.current < DEFAULT_SIM_CONFIG.tickInterval) return;

    // Reset accumulator (allow drift rather than stacking).
    elapsedRef.current = 0;

    const commands = tick({
      agents: store.agents,
      anchors: store.anchors,
      floors: store.floors,
      meetings: store.meetings,
      now: Date.now(),
      config: DEFAULT_SIM_CONFIG,
    });

    dispatchCommands(commands, store);
  });
}

// ─── Command dispatcher ─────────────────────────────────────────

function dispatchCommands(
  commands: SimCommand[],
  store: ReturnType<typeof useOfficeStore.getState>,
): void {
  for (const cmd of commands) {
    switch (cmd.kind) {
      case 'set-target':
        store.setAgentTarget(cmd.agentId, cmd.target);
        break;

      case 'set-status':
        store.setAgentStatus(cmd.agentId, cmd.status);
        break;

      case 'push-event':
        store.pushEvent({
          type: cmd.type,
          agentIds: cmd.agentIds,
          floorId: cmd.floorId,
          anchorId: cmd.anchorId,
          data: cmd.data,
        });
        break;

      case 'start-meeting':
        store.startMeeting(
          cmd.title,
          cmd.organizerId,
          cmd.participantIds,
          cmd.anchorId,
          cmd.floorId,
        );
        break;

      case 'end-meeting':
        store.endMeeting(cmd.meetingId);
        break;

      case 'remove-meeting':
        // The store's endMeeting sets status to 'dispersing'.
        // A full removal would need a dedicated store action.
        // For now we re-use endMeeting which is idempotent for
        // meetings already dispersing -- they get filtered on
        // the next tick's phase 1.
        store.endMeeting(cmd.meetingId);
        break;
    }
  }
}
