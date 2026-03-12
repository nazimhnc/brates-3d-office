/**
 * simulation.ts -- Deterministic tick-based behaviour scheduler.
 *
 * The simulation runs every `tickInterval` ms.  Each tick inspects
 * the current office state and may:
 *
 *   1. End meetings / chats / breaks whose duration has elapsed.
 *   2. Randomly schedule new meetings, peer chats, or breaks among
 *      agents that are currently "working".
 *
 * All state mutations go through store actions -- this module never
 * mutates state directly.
 *
 * The `tick()` function is the only export a consumer needs; it
 * receives the full store snapshot and returns an array of *commands*
 * the caller dispatches to the store.
 */

import type {
  Agent,
  AgentStatus,
  Anchor,
  Floor,
  Meeting,
  SimEventType,
  Vec3,
} from '../types/index.ts';

import { getAnchorsForMeeting, findAvailableAnchorsOfTypes } from './anchors.ts';

// ─── Config ─────────────────────────────────────────────────────

export interface SimulationConfig {
  /** Probability per tick of starting a meeting (0..1). */
  meetingChance: number;
  /** Probability per tick of starting a peer chat (0..1). */
  peerChatChance: number;
  /** Probability per tick of starting a break (0..1). */
  breakChance: number;
  /** How long a meeting lasts (ms). */
  meetingDuration: number;
  /** How long a peer chat lasts (ms). */
  chatDuration: number;
  /** How long a break lasts (ms). */
  breakDuration: number;
  /** Time between ticks (ms). */
  tickInterval: number;
}

export const DEFAULT_SIM_CONFIG: SimulationConfig = {
  meetingChance: 0.03,
  peerChatChance: 0.05,
  breakChance: 0.02,
  meetingDuration: 20_000,
  chatDuration: 10_000,
  breakDuration: 12_000,
  tickInterval: 3_000,
};

// ─── Command types ──────────────────────────────────────────────
// tick() returns an array of these; the caller dispatches them to the
// store so we keep this module free of Zustand imports.

export type SimCommand =
  | { kind: 'set-target'; agentId: string; target: Vec3 }
  | { kind: 'set-status'; agentId: string; status: AgentStatus }
  | { kind: 'push-event'; type: SimEventType; agentIds: string[]; floorId: string; anchorId?: string; data?: Record<string, unknown> }
  | { kind: 'start-meeting'; title: string; organizerId: string; participantIds: string[]; anchorId: string; floorId: string }
  | { kind: 'end-meeting'; meetingId: string }
  | { kind: 'remove-meeting'; meetingId: string };

// ─── Internal tracking ──────────────────────────────────────────
// Peer chats and breaks are lighter than meetings -- we track them
// locally rather than as full Meeting objects.

interface ActiveChat {
  agentIds: [string, string];
  floorId: string;
  startedAt: number;
}

interface ActiveBreak {
  agentId: string;
  floorId: string;
  startedAt: number;
}

const activeChats: ActiveChat[] = [];
const activeBreaks: ActiveBreak[] = [];

// ─── Helpers ────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffled<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** All agents on a given floor with a specific status. */
function agentsOnFloor(
  agents: Agent[],
  floorId: string,
  status: AgentStatus,
): Agent[] {
  return agents.filter((a) => a.floorId === floorId && a.status === status);
}

/**
 * Find the desk position for an agent so they can return to it.
 * Falls back to [0, 0, 0] if no desk is assigned.
 */
function deskPositionFor(
  agent: Agent,
  floors: Floor[],
): Vec3 {
  if (!agent.deskId) return agent.position;
  for (const floor of floors) {
    for (const room of floor.rooms) {
      for (const desk of room.furniture.desks) {
        if (desk.id === agent.deskId) {
          // Return chair position (slightly offset from desk)
          const cz = 0.8 * Math.cos(desk.rotation);
          const cx = 0.8 * Math.sin(desk.rotation);
          return [desk.position[0] + cx, 0, desk.position[2] + cz];
        }
      }
    }
  }
  return agent.position;
}

/** Meeting titles sampled at random. */
const MEETING_TITLES = [
  'Sprint Planning',
  'Design Review',
  'Architecture Sync',
  'Bug Triage',
  'Standup',
  'Retro',
  'Feature Kickoff',
  'Code Review',
  'Demo Prep',
  'Roadmap Alignment',
];

// ─── Tick ───────────────────────────────────────────────────────

export interface TickInput {
  agents: Agent[];
  anchors: Anchor[];
  floors: Floor[];
  meetings: Meeting[];
  now: number;
  config: SimulationConfig;
}

/**
 * Run one simulation tick.
 *
 * Returns an array of commands the caller should dispatch to the
 * store in order.  The commands are ordered so that "end" actions
 * come before "start" actions -- agents freed from a meeting can
 * be picked up for a chat in the same tick.
 */
export function tick(input: TickInput): SimCommand[] {
  const { agents, anchors, floors, meetings, now, config } = input;
  const cmds: SimCommand[] = [];

  // ── Phase 1: End expired meetings ──────────────────────────
  for (const meeting of meetings) {
    if (meeting.status === 'dispersing') {
      // Already handled -- just needs cleanup.
      cmds.push({ kind: 'remove-meeting', meetingId: meeting.id });
      continue;
    }
    const elapsed = now - meeting.startedAt;
    if (elapsed >= config.meetingDuration) {
      cmds.push({ kind: 'end-meeting', meetingId: meeting.id });
      cmds.push({
        kind: 'push-event',
        type: 'meeting-ended',
        agentIds: meeting.participantIds,
        floorId: meeting.floorId,
        anchorId: meeting.anchorId,
      });
      // Send all participants back to their desks.
      for (const pid of meeting.participantIds) {
        const agent = agents.find((a) => a.id === pid);
        if (!agent) continue;
        const deskPos = deskPositionFor(agent, floors);
        cmds.push({ kind: 'set-target', agentId: pid, target: deskPos });
        cmds.push({ kind: 'set-status', agentId: pid, status: 'working' });
        cmds.push({
          kind: 'push-event',
          type: 'return-to-desk',
          agentIds: [pid],
          floorId: agent.floorId,
        });
      }
    }
  }

  // ── Phase 2: End expired peer chats ────────────────────────
  for (let i = activeChats.length - 1; i >= 0; i--) {
    const chat = activeChats[i];
    if (now - chat.startedAt >= config.chatDuration) {
      cmds.push({
        kind: 'push-event',
        type: 'peer-chat-end',
        agentIds: [...chat.agentIds],
        floorId: chat.floorId,
      });
      for (const aid of chat.agentIds) {
        const agent = agents.find((a) => a.id === aid);
        if (!agent) continue;
        const deskPos = deskPositionFor(agent, floors);
        cmds.push({ kind: 'set-target', agentId: aid, target: deskPos });
        cmds.push({ kind: 'set-status', agentId: aid, status: 'working' });
      }
      activeChats.splice(i, 1);
    }
  }

  // ── Phase 3: End expired breaks ────────────────────────────
  for (let i = activeBreaks.length - 1; i >= 0; i--) {
    const brk = activeBreaks[i];
    if (now - brk.startedAt >= config.breakDuration) {
      const agent = agents.find((a) => a.id === brk.agentId);
      if (agent) {
        cmds.push({
          kind: 'push-event',
          type: 'break-end',
          agentIds: [brk.agentId],
          floorId: brk.floorId,
        });
        const deskPos = deskPositionFor(agent, floors);
        cmds.push({ kind: 'set-target', agentId: brk.agentId, target: deskPos });
        cmds.push({ kind: 'set-status', agentId: brk.agentId, status: 'working' });
      }
      activeBreaks.splice(i, 1);
    }
  }

  // ── Phase 4: Schedule new behaviours ───────────────────────
  // Collect distinct floor IDs where agents are working.
  const floorIds = [...new Set(agents.map((a) => a.floorId))];

  for (const floorId of floorIds) {
    const working = agentsOnFloor(agents, floorId, 'working');
    if (working.length === 0) continue;

    // ── 4a. Meeting ──────────────────────────────────────────
    if (Math.random() < config.meetingChance && working.length >= 2) {
      const participantCount = Math.min(
        2 + Math.floor(Math.random() * 3), // 2-4
        working.length,
      );
      const meetingAnchors = getAnchorsForMeeting(anchors, floorId, participantCount);
      if (meetingAnchors.length >= participantCount) {
        const participants = shuffled(working).slice(0, participantCount);
        const organizer = participants[0];
        const allIds = participants.map((p) => p.id);
        const primaryAnchor = meetingAnchors[0];
        const title = pickRandom(MEETING_TITLES);

        cmds.push({
          kind: 'start-meeting',
          title,
          organizerId: organizer.id,
          participantIds: allIds,
          anchorId: primaryAnchor.id,
          floorId,
        });

        cmds.push({
          kind: 'push-event',
          type: 'meeting-called',
          agentIds: allIds,
          floorId,
          anchorId: primaryAnchor.id,
          data: { title },
        });

        // Send each participant to a meeting anchor.
        for (let i = 0; i < participants.length; i++) {
          const anchor = meetingAnchors[i];
          cmds.push({
            kind: 'set-target',
            agentId: participants[i].id,
            target: anchor.position,
          });
          cmds.push({
            kind: 'set-status',
            agentId: participants[i].id,
            status: 'meeting',
          });
        }
      }
    }

    // Re-filter working agents (some may have been drafted into a
    // meeting above, but since commands are batched they haven't
    // actually changed status yet -- we use the original snapshot).
    // For simplicity we skip agents already targeted in this tick's
    // meeting by tracking their IDs.
    const drafted = new Set<string>();
    for (const cmd of cmds) {
      if (cmd.kind === 'set-status' && cmd.status === 'meeting') {
        drafted.add(cmd.agentId);
      }
    }
    const stillWorking = working.filter((a) => !drafted.has(a.id));

    // ── 4b. Peer chat ────────────────────────────────────────
    if (Math.random() < config.peerChatChance && stillWorking.length >= 2) {
      const interactionAnchors = findAvailableAnchorsOfTypes(
        anchors,
        floorId,
        ['interaction-point', 'hallway-point'],
      );
      if (interactionAnchors.length > 0) {
        const pair = shuffled(stillWorking).slice(0, 2);
        const spot = pickRandom(interactionAnchors);

        // Offset the two agents slightly so they face each other.
        const offset = 0.5;
        const targetA: Vec3 = [
          spot.position[0] - offset,
          spot.position[1],
          spot.position[2],
        ];
        const targetB: Vec3 = [
          spot.position[0] + offset,
          spot.position[1],
          spot.position[2],
        ];

        cmds.push({ kind: 'set-target', agentId: pair[0].id, target: targetA });
        cmds.push({ kind: 'set-target', agentId: pair[1].id, target: targetB });
        cmds.push({ kind: 'set-status', agentId: pair[0].id, status: 'idle' });
        cmds.push({ kind: 'set-status', agentId: pair[1].id, status: 'idle' });

        cmds.push({
          kind: 'push-event',
          type: 'peer-chat-start',
          agentIds: [pair[0].id, pair[1].id],
          floorId,
          anchorId: spot.id,
        });

        activeChats.push({
          agentIds: [pair[0].id, pair[1].id],
          floorId,
          startedAt: now,
        });
      }
    }

    // ── 4c. Break ────────────────────────────────────────────
    const afterChat = new Set<string>();
    for (const cmd of cmds) {
      if (cmd.kind === 'set-status' && cmd.status === 'idle') {
        afterChat.add(cmd.agentId);
      }
    }
    const breakCandidates = stillWorking.filter((a) => !afterChat.has(a.id));

    if (Math.random() < config.breakChance && breakCandidates.length >= 1) {
      const breakAnchors = findAvailableAnchorsOfTypes(
        anchors,
        floorId,
        ['kitchen-spot', 'lounge-spot'],
      );
      if (breakAnchors.length > 0) {
        const agent = pickRandom(breakCandidates);
        const spot = pickRandom(breakAnchors);

        cmds.push({ kind: 'set-target', agentId: agent.id, target: spot.position });
        cmds.push({ kind: 'set-status', agentId: agent.id, status: 'break' });

        cmds.push({
          kind: 'push-event',
          type: 'break-start',
          agentIds: [agent.id],
          floorId,
          anchorId: spot.id,
        });

        activeBreaks.push({
          agentId: agent.id,
          floorId,
          startedAt: now,
        });
      }
    }
  }

  return cmds;
}

/**
 * Reset internal tracking state (peer chats, breaks).
 * Call when restarting the simulation or in tests.
 */
export function resetSimulationState(): void {
  activeChats.length = 0;
  activeBreaks.length = 0;
}
