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

export default function OverlayLayout() {
  return (
    <div className="fixed inset-0 z-30 pointer-events-none">
      <div className="pointer-events-auto">
        <TopBar />
      </div>
      <div className="pointer-events-auto">
        <Sidebar />
      </div>
      <div className="pointer-events-auto">
        <AgentPanel />
      </div>
      <div className="pointer-events-auto">
        <FloorNavigator />
      </div>
      <div className="pointer-events-auto">
        <MiniMap />
      </div>
    </div>
  );
}
