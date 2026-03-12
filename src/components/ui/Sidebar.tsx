// ============================================================
// Sidebar — Left panel: floor list, navigation, management
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  GripVertical,
} from 'lucide-react';
import { useOfficeStore } from '../../stores/officeStore';

export default function Sidebar() {
  const floors = useOfficeStore((s) => s.floors);
  const agents = useOfficeStore((s) => s.agents);
  const selectedFloorId = useOfficeStore((s) => s.selectedFloorId);
  const viewingFloorLevel = useOfficeStore((s) => s.viewingFloorLevel);
  const sidebarOpen = useOfficeStore((s) => s.sidebarOpen);
  const toggleSidebar = useOfficeStore((s) => s.toggleSidebar);
  const addFloor = useOfficeStore((s) => s.addFloor);
  const removeFloor = useOfficeStore((s) => s.removeFloor);
  const renameFloor = useOfficeStore((s) => s.renameFloor);
  const selectFloor = useOfficeStore((s) => s.selectFloor);
  const setViewingFloor = useOfficeStore((s) => s.setViewingFloor);

  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingFloorId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingFloorId]);

  const startEditing = useCallback((floorId: string, currentName: string) => {
    setEditingFloorId(floorId);
    setEditValue(currentName);
  }, []);

  const confirmRename = useCallback(() => {
    if (editingFloorId && editValue.trim()) {
      renameFloor(editingFloorId, editValue.trim());
    }
    setEditingFloorId(null);
    setEditValue('');
  }, [editingFloorId, editValue, renameFloor]);

  const cancelEdit = useCallback(() => {
    setEditingFloorId(null);
    setEditValue('');
  }, []);

  const handleFloorClick = useCallback(
    (floorId: string, level: number) => {
      selectFloor(floorId);
      setViewingFloor(level);
    },
    [selectFloor, setViewingFloor],
  );

  const handleDelete = useCallback(
    (floorId: string) => {
      removeFloor(floorId);
      setConfirmDeleteId(null);
    },
    [removeFloor],
  );

  const getAgentCountForFloor = useCallback(
    (floorId: string) => agents.filter((a) => a.floorId === floorId).length,
    [agents],
  );

  return (
    <>
      {/* Collapse / expand toggle */}
      <button
        onClick={toggleSidebar}
        className={`
          fixed top-20 z-50 flex h-8 w-8 items-center justify-center
          rounded-r-lg bg-gray-900/90 text-gray-400 backdrop-blur-xl
          transition-all duration-300 hover:bg-gray-800 hover:text-white
          border border-l-0 border-white/10
          ${sidebarOpen ? 'left-72' : 'left-0'}
        `}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Panel */}
      <div
        className={`
          fixed left-0 top-14 bottom-0 z-40 w-72
          bg-gray-900/90 backdrop-blur-xl border-r border-white/10
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
          <Building2 size={18} className="text-indigo-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
            Floors
          </h2>
          <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-gray-400">
            {floors.length}
          </span>
        </div>

        {/* Floor list — top floor first */}
        <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {floors
            .slice()
            .sort((a, b) => b.level - a.level)
            .map((floor) => {
              const isViewing = floor.level === viewingFloorLevel;
              const isSelected = floor.id === selectedFloorId;
              const agentCount = getAgentCountForFloor(floor.id);
              const isEditing = editingFloorId === floor.id;
              const isConfirmingDelete = confirmDeleteId === floor.id;

              return (
                <div
                  key={floor.id}
                  className={`
                    group mx-2 mb-1 rounded-xl px-3 py-2.5 cursor-pointer
                    transition-all duration-200
                    ${isViewing
                      ? 'bg-white/10 ring-1 ring-white/20 shadow-lg shadow-black/20'
                      : 'hover:bg-white/5'}
                    ${isSelected && !isViewing ? 'bg-white/[0.06]' : ''}
                  `}
                  onClick={() => !isEditing && handleFloorClick(floor.id, floor.level)}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Drag handle */}
                    <GripVertical
                      size={14}
                      className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab flex-shrink-0"
                    />

                    {/* Floor color bar */}
                    <div
                      className="h-8 w-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: floor.floorColor }}
                    />

                    {/* Floor info */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') confirmRename();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="
                              w-full bg-white/10 border border-white/20 rounded-md
                              px-2 py-0.5 text-sm text-white outline-none
                              focus:border-indigo-500 transition-colors
                            "
                          />
                          <button
                            onClick={confirmRename}
                            className="p-1 rounded hover:bg-green-500/20 text-green-400 transition-colors"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-gray-500 tabular-nums">
                              L{floor.level}
                            </span>
                            <span
                              className={`text-sm font-medium truncate ${
                                isViewing ? 'text-white' : 'text-gray-300'
                              }`}
                            >
                              {floor.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Users size={10} className="text-gray-500" />
                            <span className="text-[11px] text-gray-500">
                              {agentCount} agent{agentCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions — visible on hover */}
                    {!isEditing && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(floor.id, floor.name);
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                          aria-label="Rename floor"
                        >
                          <Edit3 size={12} />
                        </button>

                        {isConfirmingDelete ? (
                          <div
                            className="flex items-center gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleDelete(floor.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                              aria-label="Confirm delete"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 transition-colors"
                              aria-label="Cancel delete"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(floor.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                            aria-label="Delete floor"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Add Floor */}
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
    </>
  );
}
