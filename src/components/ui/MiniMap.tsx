// ============================================================
// MiniMap — 200x200 top-down floor view with agent dots
// ============================================================

import { useMemo, useCallback, useRef } from 'react';
import { Map } from 'lucide-react';
import { useOfficeStore } from '../../stores/officeStore';
import type { AgentStatus } from '../../types';

const STATUS_COLORS: Record<AgentStatus, string> = {
  working: '#22c55e',
  idle:    '#9ca3af',
  meeting: '#3b82f6',
  break:   '#f97316',
  away:    '#f59e0b',
  offline: '#ef4444',
};

/** Distribute agents in a grid to avoid overlap */
function agentGridPos(index: number, total: number): { x: number; y: number } {
  const margin = 28;
  const usable = 200 - margin * 2;
  if (total <= 1) return { x: 100, y: 100 };

  const cols = Math.ceil(Math.sqrt(total));
  const rows = Math.ceil(total / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const cellW = usable / cols;
  const cellH = usable / rows;

  return {
    x: margin + col * cellW + cellW / 2,
    y: margin + row * cellH + cellH / 2,
  };
}

export default function MiniMap() {
  const floors = useOfficeStore((s) => s.floors);
  const agents = useOfficeStore((s) => s.agents);
  const viewingFloorLevel = useOfficeStore((s) => s.viewingFloorLevel);
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const mapRef = useRef<HTMLDivElement>(null);

  const currentFloor = useMemo(
    () => floors.find((f) => f.level === viewingFloorLevel),
    [floors, viewingFloorLevel],
  );

  const floorAgents = useMemo(
    () => (currentFloor ? agents.filter((a) => a.floorId === currentFloor.id) : []),
    [agents, currentFloor],
  );

  const handleBgClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === mapRef.current) {
        selectAgent(null);
      }
    },
    [selectAgent],
  );

  return (
    <div
      className="
        fixed bottom-4 right-4 z-40
        h-[200px] w-[200px]
        rounded-2xl overflow-hidden
        bg-gray-900/85 backdrop-blur-xl
        border border-white/15
        shadow-2xl shadow-black/40
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <Map size={10} className="text-gray-500" />
          <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">
            Minimap
          </span>
        </div>
        {currentFloor && (
          <span className="text-[9px] font-medium text-gray-600">
            L{currentFloor.level}
          </span>
        )}
      </div>

      {/* Map area */}
      <div
        ref={mapRef}
        onClick={handleBgClick}
        className="relative w-full"
        style={{ height: 'calc(100% - 26px)' }}
      >
        {/* Floor outline */}
        <div className="absolute inset-3 rounded-lg border border-white/10 bg-white/[0.02]">
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/10" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/10" />
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/10" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/10" />
          </div>

          {/* Decorative desk outlines */}
          <div className="absolute top-[15%] left-[12%] h-[20%] w-[25%] rounded-sm border border-white/5 bg-white/[0.02]" />
          <div className="absolute top-[15%] right-[12%] h-[20%] w-[25%] rounded-sm border border-white/5 bg-white/[0.02]" />
          <div className="absolute bottom-[15%] left-[12%] h-[20%] w-[25%] rounded-sm border border-white/5 bg-white/[0.02]" />
          <div className="absolute bottom-[15%] right-[12%] h-[20%] w-[25%] rounded-sm border border-white/5 bg-white/[0.02]" />
        </div>

        {/* Agent dots */}
        {floorAgents.map((agent, idx) => {
          const pos = agentGridPos(idx, floorAgents.length);
          const color = STATUS_COLORS[agent.status];

          return (
            <button
              key={agent.id}
              onClick={(e) => {
                e.stopPropagation();
                selectAgent(agent.id);
              }}
              className="absolute group"
              style={{
                left: `${pos.x}px`,
                top: `${pos.y + 26}px`,
                transform: 'translate(-50%, -50%)',
              }}
              aria-label={`${agent.name} - ${agent.status}`}
            >
              {/* Pulse for working agents */}
              {agent.status === 'working' && (
                <span
                  className="absolute inset-0 rounded-full animate-ping opacity-30"
                  style={{ backgroundColor: color }}
                />
              )}

              {/* Dot */}
              <span
                className="relative block h-3.5 w-3.5 rounded-full ring-2 ring-gray-900/80 transition-transform group-hover:scale-150"
                style={{ backgroundColor: color }}
              />

              {/* Tooltip */}
              <div
                className="
                  absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                  whitespace-nowrap rounded-md bg-gray-800 border border-white/10
                  px-2 py-1 text-[9px] font-medium text-gray-200 shadow-lg
                  opacity-0 group-hover:opacity-100 pointer-events-none
                  transition-opacity duration-150
                "
              >
                {agent.name}
              </div>
            </button>
          );
        })}

        {/* Empty state */}
        {floorAgents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] text-gray-600 italic">No agents on this floor</span>
          </div>
        )}
      </div>
    </div>
  );
}
