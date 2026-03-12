// ============================================================
// CharacterCustomizer — Deep appearance editor for agents
// ============================================================
// Shows when activePanel === 'customize' and an agent is selected.
// Each change calls updateAgentAppearance immediately for live preview.

import { useState, useCallback, useMemo } from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  Glasses,
  Scissors,
  Shirt,
  Paintbrush,
  User,
} from 'lucide-react';
import { useOfficeStore } from '../../stores/officeStore';
import type { AgentAppearance } from '../../types';

// ---- Palettes ---------------------------------------------------------------

const SKIN_TONES = ['#FFE0BD', '#F5D0A9', '#E8B89A', '#C68642', '#8D5524', '#613318'];
const HAIR_COLORS = ['#090806', '#2C222B', '#3B3024', '#4E433F', '#6A4E42', '#A55728', '#B7A69E', '#D6C4C2'];
const EYE_COLORS = ['#634E34', '#2E536F', '#3D671D', '#1C7847', '#497665', '#80634E'];
const OUTFIT_COLORS = [
  '#1a1a2e', '#2c3e6b', '#6c5ce7', '#00b894', '#fd79a8', '#e17055',
  '#74b9ff', '#2d3436', '#636e72', '#d63031', '#0984e3', '#ffeaa7',
];

const HAIR_STYLES: AgentAppearance['hairStyle'][] = [
  'short', 'medium', 'long', 'bun', 'buzz', 'ponytail', 'curly',
];

const HAIR_STYLE_LABELS: Record<AgentAppearance['hairStyle'], string> = {
  short: 'Short',
  medium: 'Medium',
  long: 'Long',
  bun: 'Bun',
  buzz: 'Buzz',
  ponytail: 'Ponytail',
  curly: 'Curly',
};

const BEARD_STYLES: AgentAppearance['beardStyle'][] = ['none', 'stubble', 'short', 'full'];

const BEARD_LABELS: Record<AgentAppearance['beardStyle'], string> = {
  none: 'None',
  stubble: 'Stubble',
  short: 'Short',
  full: 'Full',
};

// ---- Color swatch -----------------------------------------------------------

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
        h-5 w-5 rounded-full border-2 transition-all duration-200
        hover:scale-110 flex-shrink-0
        ${active ? 'border-indigo-400 ring-2 ring-indigo-400/40 scale-110' : 'border-white/20 hover:border-white/40'}
      `}
      style={{ backgroundColor: color }}
      aria-label={`Color ${color}`}
    />
  );
}

// ---- Collapsible section ---------------------------------------------------

function Section({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: typeof Paintbrush;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
      >
        <Icon size={12} className="text-gray-500 flex-shrink-0" />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex-1">
          {title}
        </span>
        {open ? (
          <ChevronDown size={12} className="text-gray-500" />
        ) : (
          <ChevronRight size={12} className="text-gray-500" />
        )}
      </button>
      {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </div>
  );
}

// ---- Label + content row ---------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
        {label}
      </div>
      {children}
    </div>
  );
}

// ---- Initials helper --------------------------------------------------------

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ---- Main component ---------------------------------------------------------

export default function CharacterCustomizer() {
  const agents = useOfficeStore((s) => s.agents);
  const selectedAgentId = useOfficeStore((s) => s.selectedAgentId);
  const updateAgentAppearance = useOfficeStore((s) => s.updateAgentAppearance);
  const setActivePanel = useOfficeStore((s) => s.setActivePanel);
  const selectAgent = useOfficeStore((s) => s.selectAgent);

  const agent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  );

  const handleClose = useCallback(() => {
    setActivePanel(null);
  }, [setActivePanel]);

  const update = useCallback(
    (field: Partial<AgentAppearance>) => {
      if (agent) {
        updateAgentAppearance(agent.id, field);
      }
    },
    [agent, updateAgentAppearance],
  );

  // If no agent selected, prompt user to select one
  if (!agent) {
    return (
      <div
        className="
          fixed right-0 top-14 bottom-0 z-40 w-80
          bg-gray-900/90 backdrop-blur-xl border-l border-white/10
          flex flex-col transition-all duration-300
        "
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
            Character Customizer
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
            aria-label="Close customizer"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-gray-500 text-center">
            Select an agent from the roster to customize their appearance.
          </p>
        </div>
      </div>
    );
  }

  const app = agent.appearance;

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
        <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
          Character Customizer
        </h2>
        <button
          onClick={handleClose}
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
          aria-label="Close customizer"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Agent identity + avatar preview */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center font-bold text-xl text-white ring-2 ring-white/20 shadow-lg"
            style={{ backgroundColor: app.shirtColor }}
          >
            {initials(agent.name)}
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-white">{agent.name}</div>
            <div className="text-[11px] text-gray-500">{agent.role}</div>
          </div>
        </div>

        {/* Skin & Features */}
        <Section title="Skin & Features" icon={User} defaultOpen>
          <Field label="Skin Tone">
            <div className="flex flex-wrap gap-2">
              {SKIN_TONES.map((c) => (
                <Swatch key={c} color={c} active={app.skinColor === c} onClick={() => update({ skinColor: c })} />
              ))}
            </div>
          </Field>

          <Field label="Eye Color">
            <div className="flex flex-wrap gap-2">
              {EYE_COLORS.map((c) => (
                <Swatch key={c} color={c} active={app.eyeColor === c} onClick={() => update({ eyeColor: c })} />
              ))}
            </div>
          </Field>

          <Field label="Glasses">
            <button
              onClick={() => update({ glasses: !app.glasses })}
              className={`
                flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium
                border transition-all duration-200
                ${app.glasses
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}
              `}
            >
              <Glasses size={13} />
              {app.glasses ? 'On' : 'Off'}
            </button>
          </Field>
        </Section>

        {/* Hair */}
        <Section title="Hair" icon={Scissors} defaultOpen>
          <Field label="Style">
            <div className="grid grid-cols-4 gap-1.5">
              {HAIR_STYLES.map((style) => (
                <button
                  key={style}
                  onClick={() => update({ hairStyle: style })}
                  className={`
                    rounded-lg px-2 py-1.5 text-[10px] font-medium text-center
                    border transition-all duration-200
                    ${app.hairStyle === style
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}
                  `}
                >
                  {HAIR_STYLE_LABELS[style]}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Color">
            <div className="flex flex-wrap gap-2">
              {HAIR_COLORS.map((c) => (
                <Swatch key={c} color={c} active={app.hairColor === c} onClick={() => update({ hairColor: c })} />
              ))}
            </div>
          </Field>

          {agent.gender === 'male' && (
            <Field label="Beard">
              <div className="grid grid-cols-4 gap-1.5">
                {BEARD_STYLES.map((style) => (
                  <button
                    key={style}
                    onClick={() => update({ beardStyle: style })}
                    className={`
                      rounded-lg px-2 py-1.5 text-[10px] font-medium text-center
                      border transition-all duration-200
                      ${app.beardStyle === style
                        ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}
                    `}
                  >
                    {BEARD_LABELS[style]}
                  </button>
                ))}
              </div>
            </Field>
          )}
        </Section>

        {/* Outfit */}
        <Section title="Outfit" icon={Shirt} defaultOpen>
          <Field label="Shirt">
            <div className="flex flex-wrap gap-2">
              {OUTFIT_COLORS.map((c) => (
                <Swatch key={c} color={c} active={app.shirtColor === c} onClick={() => update({ shirtColor: c })} />
              ))}
            </div>
          </Field>

          <Field label="Pants">
            <div className="flex flex-wrap gap-2">
              {OUTFIT_COLORS.map((c) => (
                <Swatch key={c} color={c} active={app.pantsColor === c} onClick={() => update({ pantsColor: c })} />
              ))}
            </div>
          </Field>

          <Field label="Shoes">
            <div className="flex flex-wrap gap-2">
              {OUTFIT_COLORS.map((c) => (
                <Swatch key={c} color={c} active={app.shoeColor === c} onClick={() => update({ shoeColor: c })} />
              ))}
            </div>
          </Field>
        </Section>

        {/* Body */}
        <Section title="Body" icon={User} defaultOpen={false}>
          <Field label={`Height: ${app.height.toFixed(2)}x`}>
            <input
              type="range"
              min={0.9}
              max={1.1}
              step={0.01}
              value={app.height}
              onChange={(e) => update({ height: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-400
                [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-300
                [&::-webkit-slider-thumb]:shadow-lg"
            />
            <div className="flex justify-between text-[9px] text-gray-600 mt-1">
              <span>0.9x</span>
              <span>1.0x</span>
              <span>1.1x</span>
            </div>
          </Field>
        </Section>
      </div>

      {/* Footer — back to roster */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={() => {
            selectAgent(null);
            setActivePanel('roster');
          }}
          className="
            flex w-full items-center justify-center gap-2 rounded-xl
            bg-white/5 px-4 py-2 text-xs font-medium text-gray-400
            border border-white/10
            hover:bg-white/10 hover:text-white
            active:scale-[0.98] transition-all duration-200
          "
        >
          Back to Roster
        </button>
      </div>
    </div>
  );
}
