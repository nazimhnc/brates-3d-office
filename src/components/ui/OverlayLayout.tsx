// ============================================================
// OverlayLayout — Combines all UI panels on top of the 3D canvas
// ============================================================
// The outer container is pointer-events-none so the 3D scene
// behind it receives clicks/drags. Each interactive child sets
// pointer-events-auto on itself.

import TopBar from './TopBar';
import Sidebar from './Sidebar';
import AgentPanel from './AgentPanel';
import FloorNavigator from './FloorNavigator';
import MiniMap from './MiniMap';
import CharacterCustomizer from './CharacterCustomizer';
import BuildModePanel from './BuildModePanel';
import SimulationControls from './SimulationControls';
import { useOfficeStore } from '../../stores/officeStore';

export default function OverlayLayout() {
  const activePanel = useOfficeStore((s) => s.activePanel);

  return (
    <div className="fixed inset-0 z-30 pointer-events-none">
      <div className="pointer-events-auto">
        <TopBar />
      </div>
      <div className="pointer-events-auto">
        <Sidebar />
      </div>
      {/* Right panel: show customizer or build mode, else default AgentPanel */}
      <div className="pointer-events-auto">
        {activePanel === 'customize' ? (
          <CharacterCustomizer />
        ) : activePanel === 'build' ? (
          <BuildModePanel />
        ) : (
          <AgentPanel />
        )}
      </div>
      <div className="pointer-events-auto">
        <FloorNavigator />
      </div>
      <div className="pointer-events-auto">
        <MiniMap />
      </div>
      {/* Simulation controls — always visible at bottom center */}
      <SimulationControls />
    </div>
  );
}
