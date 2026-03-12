// ============================================================
// TopBar — Top navigation bar: branding, floor info, controls
// ============================================================

import { useMemo, useCallback } from 'react';
import { Building2, Eye, Layers, Users, ScanEye, UserRound, Monitor, Camera } from 'lucide-react';
import { useOfficeStore } from '../../stores/officeStore';
import type { CameraMode, ViewMode, QualityTier, UserCameraMode } from '../../types';

const CAMERA_MODES: { mode: CameraMode; label: string; icon: typeof Eye }[] = [
  { mode: 'orbit', label: 'Orbit', icon: Eye },
  { mode: 'top-down', label: 'Top Down', icon: Layers },
];

const VIEW_MODES: { mode: ViewMode; label: string; icon: typeof Eye }[] = [
  { mode: 'interior', label: 'Interior', icon: ScanEye },
  { mode: 'exterior', label: 'Exterior', icon: Building2 },
];

const QUALITY_TIERS: { tier: QualityTier; label: string }[] = [
  { tier: 'low', label: 'Low' },
  { tier: 'medium', label: 'Med' },
  { tier: 'high', label: 'High' },
];

const USER_CAM_MODES: { mode: UserCameraMode; label: string }[] = [
  { mode: 'orbit', label: 'Orbit' },
  { mode: 'first-person', label: '1st' },
  { mode: 'third-person', label: '3rd' },
];

export default function TopBar() {
  const floors = useOfficeStore((s) => s.floors);
  const agents = useOfficeStore((s) => s.agents);
  const viewingFloorLevel = useOfficeStore((s) => s.viewingFloorLevel);
  const cameraMode = useOfficeStore((s) => s.cameraMode);
  const setCameraMode = useOfficeStore((s) => s.setCameraMode);
  const viewMode = useOfficeStore((s) => s.viewMode);
  const setViewMode = useOfficeStore((s) => s.setViewMode);
  const userAvatar = useOfficeStore((s) => s.userAvatar);
  const toggleUserAvatar = useOfficeStore((s) => s.toggleUserAvatar);
  const setUserCameraMode = useOfficeStore((s) => s.setUserCameraMode);
  const qualityTier = useOfficeStore((s) => s.qualityTier);
  const setQualityTier = useOfficeStore((s) => s.setQualityTier);

  const handleToggleAvatar = useCallback(() => {
    toggleUserAvatar();
  }, [toggleUserAvatar]);

  const handleQualityChange = useCallback(
    (tier: QualityTier) => setQualityTier(tier),
    [setQualityTier],
  );

  const handleUserCamMode = useCallback(
    (mode: UserCameraMode) => setUserCameraMode(mode),
    [setUserCameraMode],
  );

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

        {/* User avatar toggle */}
        <button
          onClick={handleToggleAvatar}
          className={`
            flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
            border transition-all duration-200
            ${userAvatar.enabled
              ? 'bg-indigo-500/30 border-indigo-500/40 text-indigo-300'
              : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/10'}
          `}
          aria-label={userAvatar.enabled ? 'Disable user avatar' : 'Enable user avatar'}
        >
          <UserRound size={13} />
          <span className="hidden sm:inline">You</span>
        </button>

        {/* User camera mode (shown only when avatar is on) */}
        {userAvatar.enabled && (
          <div className="flex rounded-lg bg-white/5 border border-white/10 p-0.5">
            {USER_CAM_MODES.map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => handleUserCamMode(mode)}
                className={`
                  flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium
                  transition-all duration-200
                  ${userAvatar.cameraMode === mode
                    ? 'bg-indigo-500/30 text-indigo-300 shadow-sm'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
                `}
              >
                <Camera size={11} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Quality tier */}
        <div className="flex rounded-lg bg-white/5 border border-white/10 p-0.5">
          {QUALITY_TIERS.map(({ tier, label }) => (
            <button
              key={tier}
              onClick={() => handleQualityChange(tier)}
              className={`
                flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium
                transition-all duration-200
                ${qualityTier === tier
                  ? 'bg-amber-500/30 text-amber-300 shadow-sm'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
              `}
            >
              <Monitor size={11} />
              <span>{label}</span>
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
