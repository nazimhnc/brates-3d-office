// ══════════════════════════════════════════════════════════════════════════════
// EditorLayout — UI overlay for character editor mode.
//
// Top bar with title + back button, agent roster on the left, customizer on
// the right. No sidebar, no floor navigator, no simulation controls.
// ══════════════════════════════════════════════════════════════════════════════

import { useMemo, useCallback } from "react";
import { ArrowLeft, Paintbrush } from "lucide-react";
import { useOfficeStore } from "../../stores/officeStore";
import type { Agent, AgentAppearance, FaceShape } from "../../types";

// ── Color palettes ──────────────────────────────────────────────────────────

const SKIN_TONES = [
  "#FFE0BD",
  "#F5D0A9",
  "#E8B89A",
  "#C68642",
  "#8D5524",
  "#613318",
];
const HAIR_COLORS = [
  "#090806",
  "#2C222B",
  "#3B3024",
  "#4E433F",
  "#6A4E42",
  "#A55728",
  "#B7A69E",
  "#D6C4C2",
];
const OUTFIT_COLORS = [
  "#1a1a2e",
  "#2c3e6b",
  "#6c5ce7",
  "#00b894",
  "#fd79a8",
  "#e17055",
  "#74b9ff",
  "#2d3436",
  "#636e72",
  "#d63031",
  "#0984e3",
  "#ffeaa7",
];
const HAIR_STYLES: AgentAppearance["hairStyle"][] = [
  "short",
  "medium",
  "long",
  "bun",
  "buzz",
  "ponytail",
  "curly",
];
const HAIR_STYLE_LABELS: Record<AgentAppearance["hairStyle"], string> = {
  short: "Short",
  medium: "Medium",
  long: "Long",
  bun: "Bun",
  buzz: "Buzz",
  ponytail: "Ponytail",
  curly: "Curly",
};
const FACE_SHAPES: FaceShape[] = ["round", "angular", "heart", "square", "oval"];
const FACE_SHAPE_LABELS: Record<FaceShape, string> = {
  round: "Round",
  angular: "Angular",
  heart: "Heart",
  square: "Square",
  oval: "Oval",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Swatch({
  color,
  active,
  onClick,
}: {
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        h-6 w-6 rounded-full border-2 transition-all duration-200
        hover:scale-110 flex-shrink-0
        ${active ? "border-indigo-400 ring-2 ring-indigo-400/40 scale-110" : "border-white/20 hover:border-white/40"}
      `}
      style={{ backgroundColor: color }}
    />
  );
}

// ── Agent roster card ───────────────────────────────────────────────────────

function AgentCard({
  agent,
  isSelected,
  onClick,
}: {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
        transition-all duration-200 text-left
        ${
          isSelected
            ? "bg-indigo-500/20 border border-indigo-500/40 ring-1 ring-indigo-500/20"
            : "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20"
        }
      `}
    >
      <div
        className={`
          h-10 w-10 rounded-full flex items-center justify-center
          font-bold text-sm text-white flex-shrink-0
          ${isSelected ? "ring-2 ring-indigo-400" : "ring-1 ring-white/20"}
        `}
        style={{ backgroundColor: agent.appearance.shirtColor }}
      >
        {initials(agent.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`text-sm font-medium truncate ${isSelected ? "text-white" : "text-gray-300"}`}
        >
          {agent.name}
        </div>
        <div className="text-[11px] text-gray-500 truncate">{agent.role}</div>
      </div>
    </button>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function EditorLayout() {
  const agents = useOfficeStore((s) => s.agents);
  const selectedAgentId = useOfficeStore((s) => s.selectedAgentId);
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const updateAgentAppearance = useOfficeStore(
    (s) => s.updateAgentAppearance,
  );
  const setAppMode = useOfficeStore((s) => s.setAppMode);

  const agent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? agents[0] ?? null,
    [agents, selectedAgentId],
  );

  // Select first agent if none selected
  if (!selectedAgentId && agents.length > 0) {
    selectAgent(agents[0].id);
  }

  const handleBack = useCallback(() => {
    setAppMode("office");
  }, [setAppMode]);

  const update = useCallback(
    (field: Partial<AgentAppearance>) => {
      if (agent) {
        updateAgentAppearance(agent.id, field);
      }
    },
    [agent, updateAgentAppearance],
  );

  const app = agent?.appearance;

  return (
    <div className="fixed inset-0 z-30 pointer-events-none">
      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div
        className="
          pointer-events-auto
          fixed top-0 left-0 right-0 z-50 h-14
          bg-gray-950/80 backdrop-blur-xl border-b border-white/10
          flex items-center justify-between px-5
        "
      >
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="
              flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium
              bg-white/5 border border-white/10 text-gray-300
              hover:bg-white/10 hover:text-white transition-all
            "
          >
            <ArrowLeft size={14} />
            Back to Office
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Paintbrush size={16} className="text-indigo-400" />
          <h1 className="text-sm font-bold text-white tracking-wide">
            Character Editor
          </h1>
        </div>
        <div className="w-[140px]" /> {/* Spacer for centering */}
      </div>

      {/* ── Left: Agent roster ──────────────────────────────────────── */}
      <div
        className="
          pointer-events-auto
          fixed left-0 top-14 bottom-0 w-64
          bg-gray-900/85 backdrop-blur-xl border-r border-white/10
          flex flex-col
        "
      >
        <div className="px-4 py-3 border-b border-white/5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Agents ({agents.length})
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {agents.map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              isSelected={a.id === (agent?.id ?? null)}
              onClick={() => selectAgent(a.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Right: Customizer panel ──────────────────────────────────── */}
      <div
        className="
          pointer-events-auto
          fixed right-0 top-14 bottom-0 w-80
          bg-gray-900/85 backdrop-blur-xl border-l border-white/10
          flex flex-col
        "
      >
        {!agent || !app ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-sm text-gray-500 text-center">
              Select an agent from the list to customize.
            </p>
          </div>
        ) : (
          <>
            {/* Agent identity */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-base text-white ring-2 ring-indigo-400/40"
                style={{ backgroundColor: app.shirtColor }}
              >
                {initials(agent.name)}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  {agent.name}
                </div>
                <div className="text-[11px] text-gray-500">{agent.role}</div>
              </div>
            </div>

            {/* Customizer controls */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Skin Tone */}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Skin Tone
                </div>
                <div className="flex flex-wrap gap-2">
                  {SKIN_TONES.map((c) => (
                    <Swatch
                      key={c}
                      color={c}
                      active={app.skinColor === c}
                      onClick={() => update({ skinColor: c })}
                    />
                  ))}
                </div>
              </div>

              {/* Face Shape */}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Face Shape
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {FACE_SHAPES.map((shape) => (
                    <button
                      key={shape}
                      onClick={() => update({ faceShape: shape })}
                      className={`
                        rounded-lg px-2 py-1.5 text-[10px] font-medium text-center
                        border transition-all duration-200
                        ${
                          app.faceShape === shape
                            ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                        }
                      `}
                    >
                      {FACE_SHAPE_LABELS[shape]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hair Style */}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Hair Style
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {HAIR_STYLES.map((style) => (
                    <button
                      key={style}
                      onClick={() => update({ hairStyle: style })}
                      className={`
                        rounded-lg px-2 py-1.5 text-[10px] font-medium text-center
                        border transition-all duration-200
                        ${
                          app.hairStyle === style
                            ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                        }
                      `}
                    >
                      {HAIR_STYLE_LABELS[style]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hair Color */}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Hair Color
                </div>
                <div className="flex flex-wrap gap-2">
                  {HAIR_COLORS.map((c) => (
                    <Swatch
                      key={c}
                      color={c}
                      active={app.hairColor === c}
                      onClick={() => update({ hairColor: c })}
                    />
                  ))}
                </div>
              </div>

              {/* Shirt */}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Shirt
                </div>
                <div className="flex flex-wrap gap-2">
                  {OUTFIT_COLORS.map((c) => (
                    <Swatch
                      key={c}
                      color={c}
                      active={app.shirtColor === c}
                      onClick={() => update({ shirtColor: c })}
                    />
                  ))}
                </div>
              </div>

              {/* Pants */}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Pants
                </div>
                <div className="flex flex-wrap gap-2">
                  {OUTFIT_COLORS.map((c) => (
                    <Swatch
                      key={c}
                      color={c}
                      active={app.pantsColor === c}
                      onClick={() => update({ pantsColor: c })}
                    />
                  ))}
                </div>
              </div>

              {/* Shoes */}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Shoes
                </div>
                <div className="flex flex-wrap gap-2">
                  {OUTFIT_COLORS.map((c) => (
                    <Swatch
                      key={c}
                      color={c}
                      active={app.shoeColor === c}
                      onClick={() => update({ shoeColor: c })}
                    />
                  ))}
                </div>
              </div>

              {/* Height */}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Height: {app.height.toFixed(2)}x
                </div>
                <input
                  type="range"
                  min={0.9}
                  max={1.1}
                  step={0.01}
                  value={app.height}
                  onChange={(e) =>
                    update({ height: parseFloat(e.target.value) })
                  }
                  className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400
                    [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-300
                    [&::-webkit-slider-thumb]:shadow-lg"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
