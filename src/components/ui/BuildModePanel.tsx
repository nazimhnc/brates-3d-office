// ============================================================
// BuildModePanel — Office layout editor (read/edit panel)
// ============================================================
// Shows when activePanel === 'build'. Displays floors, rooms,
// desks, and assigned agents in an editable list format.

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit3,
  Check,
  Hammer,
  ChevronDown,
  ChevronRight,
  Users,
  Monitor,
} from 'lucide-react';
import { useOfficeStore } from '../../stores/officeStore';
import type { Room, Floor, Desk } from '../../types';

// ---- Room type config -------------------------------------------------------

const ROOM_TYPE_LABELS: Record<Room['type'], { label: string; color: string }> = {
  'open-office':   { label: 'Open Office',   color: 'text-green-400' },
  'meeting-room':  { label: 'Meeting Room',  color: 'text-blue-400' },
  'lounge':        { label: 'Lounge',        color: 'text-orange-400' },
  'kitchen':       { label: 'Kitchen',       color: 'text-amber-400' },
  'server-room':   { label: 'Server Room',   color: 'text-red-400' },
  'executive':     { label: 'Executive',     color: 'text-purple-400' },
};

// ---- Room card --------------------------------------------------------------

function RoomCard({ room }: { room: Room }) {
  const [expanded, setExpanded] = useState(false);

  const typeCfg = ROOM_TYPE_LABELS[room.type];
  const deskCount = room.furniture.desks.length;
  const occupiedCount = room.furniture.desks.filter((d) => d.assignedAgentId).length;

  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/5 overflow-hidden">
      {/* Room header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
      >
        {expanded ? (
          <ChevronDown size={11} className="text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight size={11} className="text-gray-500 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-200 truncate">{room.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-medium ${typeCfg.color}`}>
              {typeCfg.label}
            </span>
            <span className="text-[10px] text-gray-600">
              {room.size[0]}x{room.size[1]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Monitor size={10} className="text-gray-600" />
          <span className="text-[10px] text-gray-500 tabular-nums">
            {occupiedCount}/{deskCount}
          </span>
        </div>
      </button>

      {/* Desk list */}
      {expanded && deskCount > 0 && (
        <div className="border-t border-white/5 px-3 py-2 space-y-1.5">
          {room.furniture.desks.map((desk) => (
            <DeskRow key={desk.id} desk={desk} />
          ))}
        </div>
      )}

      {expanded && deskCount === 0 && (
        <div className="border-t border-white/5 px-3 py-2">
          <span className="text-[10px] text-gray-600 italic">No desks</span>
        </div>
      )}
    </div>
  );
}

// ---- Desk row ---------------------------------------------------------------

function DeskRow({ desk }: { desk: Desk }) {
  const agents = useOfficeStore((s) => s.agents);

  const assignedAgent = useMemo(
    () => (desk.assignedAgentId ? agents.find((a) => a.id === desk.assignedAgentId) : null),
    [agents, desk.assignedAgentId],
  );

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="h-1.5 w-1.5 rounded-full bg-gray-600 flex-shrink-0" />
      <span className="text-[11px] text-gray-400 flex-1 truncate">{desk.label}</span>
      {assignedAgent ? (
        <span className="text-[10px] text-indigo-300 font-medium truncate max-w-[100px]">
          {assignedAgent.name}
        </span>
      ) : (
        <span className="text-[10px] text-gray-600 italic">Empty</span>
      )}
    </div>
  );
}

// ---- Floor section ----------------------------------------------------------

function FloorSection({ floor }: { floor: Floor }) {
  const agents = useOfficeStore((s) => s.agents);
  const removeFloor = useOfficeStore((s) => s.removeFloor);
  const renameFloor = useOfficeStore((s) => s.renameFloor);
  const floors = useOfficeStore((s) => s.floors);

  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(floor.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const agentCount = useMemo(
    () => agents.filter((a) => a.floorId === floor.id).length,
    [agents, floor.id],
  );

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleRename = useCallback(() => {
    if (editValue.trim()) {
      renameFloor(floor.id, editValue.trim());
    }
    setEditing(false);
  }, [editValue, floor.id, renameFloor]);

  const handleDelete = useCallback(() => {
    removeFloor(floor.id);
    setConfirmDelete(false);
  }, [floor.id, removeFloor]);

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Floor header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0"
        >
          {expanded ? (
            <ChevronDown size={12} className="text-gray-500" />
          ) : (
            <ChevronRight size={12} className="text-gray-500" />
          )}
        </button>

        <div
          className="h-6 w-1 rounded-full flex-shrink-0"
          style={{ backgroundColor: floor.floorColor }}
        />

        {editing ? (
          <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setEditing(false);
              }}
              className="
                flex-1 bg-white/10 border border-white/20 rounded-md
                px-2 py-0.5 text-xs text-white outline-none
                focus:border-indigo-500 transition-colors
              "
            />
            <button
              onClick={handleRename}
              className="p-1 rounded hover:bg-green-500/20 text-green-400 transition-colors"
            >
              <Check size={11} />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
            >
              <X size={11} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-gray-500 tabular-nums">
                  L{floor.level}
                </span>
                <span className="text-xs font-medium text-white truncate">
                  {floor.name}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-gray-500">
                  {floor.rooms.length} room{floor.rooms.length !== 1 ? 's' : ''}
                </span>
                <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                  <Users size={9} />
                  {agentCount}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              <button
                onClick={() => {
                  setEditValue(floor.name);
                  setEditing(true);
                }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-600 hover:text-white transition-colors"
                aria-label="Rename floor"
              >
                <Edit3 size={11} />
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={handleDelete}
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                    aria-label="Confirm delete"
                    disabled={floors.length <= 1}
                  >
                    <Check size={11} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 transition-colors"
                    aria-label="Cancel delete"
                  >
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-colors"
                  aria-label="Delete floor"
                  disabled={floors.length <= 1}
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Rooms */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {floor.rooms.length === 0 ? (
            <div className="text-[10px] text-gray-600 italic py-1">No rooms</div>
          ) : (
            floor.rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ---- Main component ---------------------------------------------------------

export default function BuildModePanel() {
  const floors = useOfficeStore((s) => s.floors);
  const addFloor = useOfficeStore((s) => s.addFloor);
  const setActivePanel = useOfficeStore((s) => s.setActivePanel);

  const handleClose = useCallback(() => {
    setActivePanel(null);
  }, [setActivePanel]);

  return (
    <div
      className="
        fixed right-0 top-14 bottom-0 z-40 w-80
        bg-gray-900/90 backdrop-blur-xl border-l border-white/10
        flex flex-col transition-all duration-300
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Hammer size={14} className="text-indigo-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
            Build Mode
          </h2>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
          aria-label="Close build panel"
        >
          <X size={14} />
        </button>
      </div>

      {/* Floor list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {floors
          .slice()
          .sort((a, b) => b.level - a.level)
          .map((floor) => (
            <FloorSection key={floor.id} floor={floor} />
          ))}
      </div>

      {/* Add floor */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={addFloor}
          className="
            flex w-full items-center justify-center gap-2 rounded-xl
            bg-indigo-500/20 px-4 py-2.5 text-sm font-medium text-indigo-300
            border border-indigo-500/30
            hover:bg-indigo-500/30 hover:text-indigo-200 hover:border-indigo-500/50
            active:scale-[0.98] transition-all duration-200
          "
        >
          <Plus size={16} />
          Add Floor
        </button>
      </div>
    </div>
  );
}
