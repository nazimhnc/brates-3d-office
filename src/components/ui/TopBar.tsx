// ============================================================
// TopBar — Top navigation bar: branding, floor info, controls
// ============================================================

import { useMemo } from 'react';
import { Building2, Eye, Layers, Users, ScanEye } from 'lucide-react';
import { useOfficeStore } from '../../stores/officeStore';
import type { CameraMode, ViewMode } from '../../types';

const CAMERA_MODES: { mode: CameraMode; label: string; icon: typeof Eye }[] = [
  { mode: 'orbit', label: 'Orbit', icon: Eye },
  { mode: 'top-down', label: 'Top Down', icon: Layers },
];

const VIEW_MODES: { mode: ViewMode; label: string; icon: typeof Eye }[] = [
  { mode: 'interior', label: 'Interior', icon: ScanEye },
  { mode: 'exterior', label: 'Exterior', icon: Building2 },
];

export default function TopBar() {
  const floors = useOfficeStore((s) => s.floors);
  const agents = useOfficeStore((s) => s.agents);
  const viewingFloorLevel = useOfficeStore((s) => s.viewingFloorLevel);
  const cameraMode = useOfficeStore((s) => s.cameraMode);
  const setCameraMode = useOfficeStore((s) => s.setCameraMode);
  const viewMode = useOfficeStore((s) => s.viewMode);
  const setViewMode = useOfficeStore((s) => s.setViewMode);

  const currentFloor = useMemo(
    () => floors.find((f) => f.level === viewingFloorLevel),
    [floors, viewingFloorLevel],
  );

  return (
    <div
      className="
        fixed top-0 left-0 right-0 z-50 h-14
        bg-gray-950/80 backdrop-blur-xl border-b border-white/10
        flex items-center justify-between px-5
      "
    >
      {/* Left — Logo */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-500/30">
          <Building2 size={16} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-wide leading-none">
            BRATES <span className="text-indigo-400">3D Office</span>
          </h1>
          <p className="text-[10px] text-gray-500 font-medium tracking-wider uppercase mt-0.5">
            Virtual Workspace
          </p>
        </div>
      </div>

      {/* Center — Current floor */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
        {currentFloor && (
          <>
            <div
              className="h-2.5 w-2.5 rounded-full ring-2 ring-white/20"
              style={{ backgroundColor: currentFloor.floorColor }}
            />
            <div className="text-center">
              <div className="text-sm font-semibold text-white leading-none">
                {currentFloor.name}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                Level {currentFloor.level}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right — Controls */}
      <div className="flex items-center gap-3">
        {/* Camera mode toggle */}
        <div className="flex rounded-lg bg-white/5 border border-white/10 p-0.5">
          {CAMERA_MODES.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => setCameraMode(mode)}
              className={`
                flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium
                transition-all duration-200
                ${cameraMode === mode
                  ? 'bg-indigo-500/30 text-indigo-300 shadow-sm'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
              `}
              aria-label={`${label} camera mode`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* View mode toggle (Interior / Exterior) */}
        <div className="flex rounded-lg bg-white/5 border border-white/10 p-0.5">
          {VIEW_MODES.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`
                flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium
                transition-all duration-200
                ${viewMode === mode
                  ? 'bg-emerald-500/30 text-emerald-300 shadow-sm'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
              `}
              aria-label={`${label} view mode`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Agent count */}
        <div className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5">
          <Users size={13} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-300 tabular-nums">
            {agents.length}
          </span>
        </div>
      </div>
    </div>
  );
}
