// ============================================================
// FloorNavigator — Vertical elevator-style floor buttons
// ============================================================

import { useMemo, useCallback } from 'react';
import { useOfficeStore } from '../../stores/officeStore';

export default function FloorNavigator() {
  const floors = useOfficeStore((s) => s.floors);
  const viewingFloorLevel = useOfficeStore((s) => s.viewingFloorLevel);
  const setViewingFloor = useOfficeStore((s) => s.setViewingFloor);
  const selectFloor = useOfficeStore((s) => s.selectFloor);

  const sortedFloors = useMemo(
    () => floors.slice().sort((a, b) => b.level - a.level),
    [floors],
  );

  const handleClick = useCallback(
    (floorId: string, level: number) => {
      setViewingFloor(level);
      selectFloor(floorId);
    },
    [setViewingFloor, selectFloor],
  );

  if (sortedFloors.length === 0) return null;

  return (
    <div
      className="
        fixed right-[340px] top-1/2 -translate-y-1/2 z-40
        flex flex-col items-center gap-1.5
      "
    >
      {/* Track line */}
      <div className="absolute inset-y-2 w-px bg-white/10 -z-10" />

      {sortedFloors.map((floor) => {
        const isActive = floor.level === viewingFloorLevel;

        return (
          <button
            key={floor.id}
            onClick={() => handleClick(floor.id, floor.level)}
            className={`
              group relative flex h-10 w-10 items-center justify-center
              rounded-xl border transition-all duration-300
              ${isActive
                ? 'bg-white/15 border-white/30 shadow-lg shadow-black/30 scale-110'
                : 'bg-gray-900/80 border-white/10 hover:bg-white/10 hover:border-white/20 hover:scale-105'}
              backdrop-blur-sm
            `}
            aria-label={`Go to ${floor.name} (Level ${floor.level})`}
          >
            {/* Active dot */}
            {isActive && (
              <div
                className="absolute -left-1.5 h-2 w-2 rounded-full"
                style={{ backgroundColor: floor.floorColor }}
              />
            )}

            {/* Level number */}
            <span
              className={`
                text-sm font-bold tabular-nums transition-colors
                ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}
              `}
            >
              {floor.level}
            </span>

            {/* Tooltip */}
            <div
              className="
                absolute right-full mr-3 whitespace-nowrap
                rounded-lg bg-gray-800 border border-white/10 px-2.5 py-1.5
                text-xs font-medium text-gray-200 shadow-xl
                opacity-0 -translate-x-1 pointer-events-none
                group-hover:opacity-100 group-hover:translate-x-0
                transition-all duration-200
              "
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: floor.floorColor }}
                />
                {floor.name}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
