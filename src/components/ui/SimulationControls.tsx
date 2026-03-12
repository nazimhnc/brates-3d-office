// ============================================================
// SimulationControls — Compact floating bar at bottom center
// ============================================================
// Shows play/pause, speed display, and last 3 simulation events.

import { useMemo, useCallback } from 'react';
import { Play, Pause, Zap } from 'lucide-react';
import { useOfficeStore } from '../../stores/officeStore';
import type { SimEvent, SimEventType } from '../../types';

// ---- Event formatting -------------------------------------------------------

const EVENT_LABELS: Record<SimEventType, { verb: string; color: string }> = {
  'meeting-called':   { verb: 'called a meeting',       color: 'text-blue-400' },
  'meeting-ended':    { verb: 'ended a meeting',        color: 'text-blue-300' },
  'peer-chat-start':  { verb: 'started chatting',       color: 'text-emerald-400' },
  'peer-chat-end':    { verb: 'finished chatting',      color: 'text-emerald-300' },
  'task-handoff':     { verb: 'handed off a task',      color: 'text-amber-400' },
  'break-start':      { verb: 'went on break',          color: 'text-orange-400' },
  'break-end':        { verb: 'returned from break',    color: 'text-orange-300' },
  'return-to-desk':   { verb: 'returned to desk',       color: 'text-gray-400' },
  'escalation':       { verb: 'escalated an issue',     color: 'text-red-400' },
  'approval':         { verb: 'approved a request',     color: 'text-green-400' },
};

function formatEvent(event: SimEvent, agents: { id: string; name: string }[]): {
  text: string;
  color: string;
} {
  const cfg = EVENT_LABELS[event.type] ?? { verb: event.type, color: 'text-gray-400' };
  const agentName = agents.find((a) => a.id === event.agentIds[0])?.name ?? 'Someone';
  const firstName = agentName.split(' ')[0];
  return {
    text: `${firstName} ${cfg.verb}`,
    color: cfg.color,
  };
}

function timeAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 5) return 'now';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

// ---- Main component ---------------------------------------------------------

export default function SimulationControls() {
  const simulationRunning = useOfficeStore((s) => s.simulationRunning);
  const toggleSimulation = useOfficeStore((s) => s.toggleSimulation);
  const events = useOfficeStore((s) => s.events);
  const agents = useOfficeStore((s) => s.agents);

  const handleToggle = useCallback(() => {
    toggleSimulation();
  }, [toggleSimulation]);

  // Last 3 events, newest first
  const recentEvents = useMemo(() => {
    return events.slice(-3).reverse();
  }, [events]);

  const agentList = useMemo(
    () => agents.map((a) => ({ id: a.id, name: a.name })),
    [agents],
  );

  return (
    <div
      className="
        fixed bottom-4 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-3
        bg-gray-950/80 backdrop-blur-xl
        border border-white/10 rounded-2xl
        px-4 py-2 shadow-2xl shadow-black/40
        pointer-events-auto
      "
    >
      {/* Play/Pause */}
      <button
        onClick={handleToggle}
        className={`
          flex items-center justify-center h-8 w-8 rounded-xl
          border transition-all duration-200
          ${simulationRunning
            ? 'bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30'
            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'}
        `}
        aria-label={simulationRunning ? 'Pause simulation' : 'Play simulation'}
      >
        {simulationRunning ? <Pause size={14} /> : <Play size={14} />}
      </button>

      {/* Divider */}
      <div className="h-5 w-px bg-white/10" />

      {/* Speed display */}
      <div className="flex items-center gap-1.5">
        <Zap size={11} className="text-gray-500" />
        <span className="text-[11px] font-semibold text-gray-400 tabular-nums">1x</span>
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-white/10" />

      {/* Recent events */}
      <div className="flex flex-col gap-0.5 min-w-[160px] max-w-[220px]">
        {recentEvents.length === 0 ? (
          <span className="text-[10px] text-gray-600 italic">No events yet</span>
        ) : (
          recentEvents.map((evt) => {
            const formatted = formatEvent(evt, agentList);
            return (
              <div
                key={evt.id}
                className="flex items-center gap-1.5 animate-fadeIn"
              >
                <span className={`text-[10px] font-medium truncate ${formatted.color}`}>
                  {formatted.text}
                </span>
                <span className="text-[9px] text-gray-600 tabular-nums flex-shrink-0">
                  {timeAgo(evt.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
