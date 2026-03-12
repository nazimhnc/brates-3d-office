// ============================================================
// AgentPanel — Right panel: agent detail or grouped roster
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import {
  Monitor,
  MessageSquare,
  Clock,
  Coffee,
  ChevronDown,
  X,
  Move,
  Palette,
  Briefcase,
  Building2,
  Users,
  WifiOff,
  LogOut,
  Paintbrush,
  Hammer,
  Footprints,
} from 'lucide-react';
import { useOfficeStore } from '../../stores/officeStore';
import type { AgentStatus, Agent, Floor, Desk } from '../../types';

// ---- Status config ----------------------------------------------------------

const STATUS_CONFIG: Record<
  AgentStatus,
  { label: string; color: string; bg: string; dot: string; icon: typeof Monitor }
> = {
  working: { label: 'Working', color: 'text-green-400', bg: 'bg-green-500/20', dot: 'bg-green-400', icon: Monitor },
  idle:    { label: 'Idle',    color: 'text-gray-400',  bg: 'bg-gray-500/20',  dot: 'bg-gray-400',  icon: Clock },
  meeting: { label: 'Meeting', color: 'text-blue-400',  bg: 'bg-blue-500/20',  dot: 'bg-blue-400',  icon: MessageSquare },
  break:   { label: 'Break',   color: 'text-orange-400', bg: 'bg-orange-500/20', dot: 'bg-orange-400', icon: Coffee },
  away:    { label: 'Away',    color: 'text-amber-400', bg: 'bg-amber-500/20', dot: 'bg-amber-400', icon: LogOut },
  offline: { label: 'Offline', color: 'text-red-400',   bg: 'bg-red-500/20',   dot: 'bg-red-400',   icon: WifiOff },
};

// ---- Helpers ----------------------------------------------------------------

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function findDeskLabel(agent: Agent, floors: Floor[]): string | null {
  if (!agent.deskId) return null;
  for (const floor of floors) {
    for (const room of floor.rooms) {
      const desk = room.furniture.desks.find((d: Desk) => d.id === agent.deskId);
      if (desk) return desk.label;
    }
  }
  return null;
}

// ---- Reusable atoms ---------------------------------------------------------

function AgentAvatar({ agent, size = 'lg' }: { agent: Agent; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'h-16 w-16 text-xl' : 'h-9 w-9 text-xs';
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-bold text-white ring-2 ring-white/20 shadow-lg flex-shrink-0`}
      style={{ backgroundColor: agent.appearance.shirtColor }}
    >
      {initials(agent.name)}
    </div>
  );
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.color} ${cfg.bg}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ---- Detail view ------------------------------------------------------------

function AgentDetail({ agent }: { agent: Agent }) {
  const floors = useOfficeStore((s) => s.floors);
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const moveAgent = useOfficeStore((s) => s.moveAgent);
  const setActivePanel = useOfficeStore((s) => s.setActivePanel);

  const [moveOpen, setMoveOpen] = useState(false);

  const currentFloor = useMemo(
    () => floors.find((f) => f.id === agent.floorId),
    [floors, agent.floorId],
  );

  const deskLabel = useMemo(() => findDeskLabel(agent, floors), [agent, floors]);

  const handleMove = useCallback(
    (targetFloorId: string) => {
      moveAgent(agent.id, targetFloorId);
      setMoveOpen(false);
    },
    [agent.id, moveAgent],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h2 className="text-sm font-semibold text-white tracking-wide uppercase">Agent Detail</h2>
        <button
          onClick={() => selectAgent(null)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
          aria-label="Close detail"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Identity */}
        <div className="flex items-center gap-4">
          <AgentAvatar agent={agent} size="lg" />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">{agent.name}</h3>
            <p className="text-sm text-gray-400 flex items-center gap-1.5">
              <Briefcase size={12} />
              {agent.role}
            </p>
            <div className="mt-1.5">
              <StatusBadge status={agent.status} />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Location</h4>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Building2 size={14} className="text-gray-500" />
            <span>{currentFloor?.name ?? 'Unassigned'}</span>
            {currentFloor && (
              <span className="text-[10px] text-gray-600 ml-1">L{currentFloor.level}</span>
            )}
          </div>
          {deskLabel && (
            <div className="text-[12px] text-gray-500 pl-5">{deskLabel}</div>
          )}
        </div>

        {/* Move to floor */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Move size={11} />
            Move to Floor
          </h4>
          <div className="relative">
            <button
              onClick={() => setMoveOpen(!moveOpen)}
              className="
                flex w-full items-center justify-between rounded-lg
                bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-300
                hover:bg-white/10 hover:border-white/20 transition-all
              "
            >
              <span>{currentFloor?.name ?? 'Select floor'}</span>
              <ChevronDown size={14} className={`text-gray-500 transition-transform ${moveOpen ? 'rotate-180' : ''}`} />
            </button>

            {moveOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-gray-800 border border-white/10 shadow-xl z-10 overflow-hidden">
                {floors.map((f) => (
                  <button
                    key={f.id}
                    disabled={f.id === agent.floorId}
                    onClick={() => handleMove(f.id)}
                    className={`
                      flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors
                      ${f.id === agent.floorId
                        ? 'text-gray-600 cursor-not-allowed bg-white/5'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'}
                    `}
                  >
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.floorColor }} />
                    <span>{f.name}</span>
                    <span className="text-[10px] text-gray-600 ml-auto">L{f.level}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status (read-only) */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2.5">
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</h4>
          <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${STATUS_CONFIG[agent.status].dot}`} />
            <span className={`text-sm font-medium ${STATUS_CONFIG[agent.status].color}`}>
              {STATUS_CONFIG[agent.status].label}
            </span>
          </div>
        </div>

        {/* Appearance */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Palette size={11} />
            Appearance
          </h4>
          <div className="grid grid-cols-2 gap-2 text-[12px] text-gray-400">
            <div>
              <span className="text-gray-600">Gender: </span>
              <span className="capitalize">{agent.gender}</span>
            </div>
            <div>
              <span className="text-gray-600">Hair: </span>
              <span className="capitalize">{agent.appearance.hairStyle}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600">Shirt:</span>
              <div className="h-3 w-3 rounded-sm border border-white/20" style={{ backgroundColor: agent.appearance.shirtColor }} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600">Pants:</span>
              <div className="h-3 w-3 rounded-sm border border-white/20" style={{ backgroundColor: agent.appearance.pantsColor }} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600">Skin:</span>
              <div className="h-3 w-3 rounded-sm border border-white/20" style={{ backgroundColor: agent.appearance.skinColor }} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600">Hair:</span>
              <div className="h-3 w-3 rounded-sm border border-white/20" style={{ backgroundColor: agent.appearance.hairColor }} />
            </div>
          </div>
          <button
            onClick={() => setActivePanel('customize')}
            className="
              flex w-full items-center justify-center gap-2 rounded-lg
              bg-indigo-500/20 px-3 py-2 mt-2 text-xs font-medium text-indigo-300
              border border-indigo-500/30
              hover:bg-indigo-500/30 hover:text-indigo-200
              active:scale-[0.98] transition-all duration-200
            "
          >
            <Paintbrush size={12} />
            Customize
          </button>
        </div>

        {/* Current Activity */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <Monitor size={11} />
            Activity
          </h4>
          <div className="space-y-1.5 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Screen:</span>
              <span className="text-gray-300 capitalize">{agent.screenContent.replace('-', ' ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Task:</span>
              <span className="text-gray-300">{agent.currentTask || 'None'}</span>
            </div>
            {agent.movementState === 'walking' && (
              <div className="flex items-center gap-1.5 text-amber-400">
                <Footprints size={11} />
                <span className="text-[11px] font-medium">Walking</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Roster view ------------------------------------------------------------

function AgentRoster() {
  const floors = useOfficeStore((s) => s.floors);
  const agents = useOfficeStore((s) => s.agents);
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const selectFloor = useOfficeStore((s) => s.selectFloor);
  const setViewingFloor = useOfficeStore((s) => s.setViewingFloor);
  const setActivePanel = useOfficeStore((s) => s.setActivePanel);
  const activePanel = useOfficeStore((s) => s.activePanel);

  const grouped = useMemo(() => {
    const map = new Map<string, Agent[]>();
    for (const agent of agents) {
      const list = map.get(agent.floorId) ?? [];
      list.push(agent);
      map.set(agent.floorId, list);
    }
    return map;
  }, [agents]);

  const handleAgentClick = useCallback(
    (agent: Agent) => {
      selectAgent(agent.id);
      const floor = floors.find((f) => f.id === agent.floorId);
      if (floor) {
        selectFloor(floor.id);
        setViewingFloor(floor.level);
      }
    },
    [selectAgent, selectFloor, setViewingFloor, floors],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <Users size={18} className="text-indigo-400" />
        <h2 className="text-sm font-semibold text-white tracking-wide uppercase">Agent Roster</h2>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-gray-400">
          {agents.length}
        </span>
      </div>

      {/* Tab buttons */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-white/5">
        {([
          { key: 'roster' as const, label: 'Roster', icon: Users },
          { key: 'customize' as const, label: 'Customize', icon: Paintbrush },
          { key: 'build' as const, label: 'Build', icon: Hammer },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActivePanel(key === 'roster' ? null : key)}
            className={`
              flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium
              transition-all duration-200 flex-1 justify-center
              ${(key === 'roster' && !activePanel) || activePanel === key
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'}
            `}
          >
            <Icon size={11} />
            {label}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      <div className="flex-1 overflow-y-auto py-2">
        {floors
          .slice()
          .sort((a, b) => b.level - a.level)
          .map((floor) => {
            const floorAgents = grouped.get(floor.id) ?? [];
            return (
              <div key={floor.id} className="mb-3">
                <div className="flex items-center gap-2 px-4 py-1.5">
                  <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: floor.floorColor }} />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    {floor.name}
                  </span>
                  <span className="text-[10px] text-gray-600">({floorAgents.length})</span>
                </div>

                {floorAgents.length === 0 ? (
                  <div className="px-4 py-2 text-[11px] text-gray-600 italic">No agents</div>
                ) : (
                  floorAgents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => handleAgentClick(agent)}
                      className="
                        flex w-full items-center gap-3 px-4 py-2
                        hover:bg-white/5 transition-colors text-left
                      "
                    >
                      <AgentAvatar agent={agent} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-200 truncate">
                          {agent.name}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">{agent.role}</div>
                      </div>
                      <StatusBadge status={agent.status} />
                    </button>
                  ))
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ---- Export -----------------------------------------------------------------

export default function AgentPanel() {
  const selectedAgentId = useOfficeStore((s) => s.selectedAgentId);
  const agents = useOfficeStore((s) => s.agents);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  );

  return (
    <div
      className="
        fixed right-0 top-14 bottom-0 z-40 w-80
        bg-gray-900/90 backdrop-blur-xl border-l border-white/10
        flex flex-col transition-all duration-300
      "
    >
      {selectedAgent ? <AgentDetail agent={selectedAgent} /> : <AgentRoster />}
    </div>
  );
}
