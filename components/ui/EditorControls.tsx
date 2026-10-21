import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

// Extracted from App.tsx, which had grown to 5,200 lines. Everything here is
// independent of that component's state -- it was only ever in the same file
// by accident of growth.
// The editor's shared control surface: the greyscale design tokens and the
// handful of controls built on them. Kept together because the tokens are
// only meaningful alongside the controls that consume them.

// --- CONTROL SURFACE TOKENS -------------------------------------------------
// One documented scale for the whole editor chrome, so radius and colour stay
// consistent across every control.
//   surface  panel + canvas backdrop (off-black, never #000)
//   track    the unfilled part of a control
//   fill     the filled part of a slider
//   ink      primary label + value text, and the active state
//   muted    section headers, inactive segment labels, helper text
// Radius rule: slider/input rows use `rounded-lg`, anything segmented or
// button-like uses `rounded-full`, the panel itself uses `rounded-2xl`.
export const UI = {
  surface: '#141414',
  track: '#262626',
  fill: '#3a3a3a',
  ink: '#f2f2f2',
  muted: '#8c8c8c',
};

// The sidebar's 4 top tab buttons (Data/Templates/Settings/Images) were each
// ~25 lines of near-identical hand-copied markup — the active-tab gradient,
// radius, and animation were duplicated 4x, so a visual tweak meant touching
// every site and risking drift between them. Centralized here as the single
// source of truth for that styling.
export const SidebarTabButton: React.FC<{
  isActive: boolean;
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  indicatorKey: string;
}> = ({ isActive, onClick, title, icon, indicatorKey }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.92 }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
    onClick={onClick}
    className="relative flex-1 flex items-center justify-center rounded-full transition-colors duration-200"
    style={{ color: isActive ? UI.surface : UI.muted }}
    title={title} aria-label={title}
  >
    {isActive && (
      <motion.div
        layoutId="activeTabIndicator"
        className="absolute inset-0"
        transition={{ type: "tween", ease: [0.4, 0, 0.2, 1], duration: 0.28 }}
      >
        <div className="w-full h-full rounded-full" style={{ background: UI.ink }} />
      </motion.div>
    )}
    <span className="relative z-10">{icon}</span>
  </motion.button>
);

// A grid of mutually-exclusive option buttons (mode pickers, alignment,
// position, brand logo, etc.) — this exact button (icon, optional label,
// cyan-tinted active state) was hand-copied at 4+ call sites in the sidebar,
// each risking drift from the others on any visual tweak. `iconOnly` covers
// the compact alignment/position variants; the default variant stacks a
// small uppercase label under the icon.
export function OptionToggleGroup<T extends string>({ options, value, onChange, columns = 3, iconOnly = false }: {
  options: { id: T; label: string; icon: React.ComponentType<{ size?: number }> }[];
  value: T;
  onChange: (id: T) => void;
  columns?: number;
  iconOnly?: boolean;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {options.map(opt => {
        const isActive = value === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            title={opt.label} aria-label={opt.label}
            className={`flex items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${iconOnly ? 'py-2' : 'flex-col gap-1 px-2 py-2.5 uppercase tracking-wide'}`}
            style={isActive
              ? { background: UI.ink, color: UI.surface }
              : { background: UI.track, color: UI.muted }}
          >
            <Icon size={15} />
            {!iconOnly && <span className="text-center leading-tight">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

// A labeled range slider with a numeric input mirrored next to the label —
// dragging still works exactly as before, but typing an exact value (to
// match another card precisely, or just to skip fiddly drag-to-target) is
// now possible everywhere a slider is. Sliders in this file previously only
// showed a static, read-only number next to the label; this replaces that
// with an editable one wired to the same onChange as the slider itself, so
// the two controls always agree.
export function SliderRow({ label, icon, value, min, max, step, onChange, suffix = '', decimals = 0, dense = true }: {
  label: React.ReactNode;
  icon?: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
  decimals?: number;
  dense?: boolean;
}) {
  const displayValue = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
  const commit = (raw: string) => {
    const v = parseFloat(raw);
    if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
  };
  // Fill spans the full min..max range, so sliders that start negative
  // (position offsets) fill from their left edge like any other.
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg ${dense ? 'h-8' : 'h-9'}`}
      style={{ background: UI.track }}
    >
      <div
        className="absolute inset-y-0 left-0"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: UI.fill }}
      />

      {/* Invisible range sitting on the bar: click or drag anywhere to set. */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="absolute inset-0 z-10 w-full cursor-ew-resize opacity-0"
      />

      <span
        className="pointer-events-none absolute inset-y-0 left-3 z-20 flex items-center gap-1.5 text-[11px] font-semibold"
        style={{ color: UI.ink }}
      >
        {icon}{label}
      </span>

      <span
        className="absolute inset-y-0 right-2.5 z-20 flex items-center gap-0.5 text-[11px] font-semibold tabular-nums"
        style={{ color: UI.ink }}
      >
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={displayValue}
          onChange={(e) => commit(e.target.value)}
          className="w-12 bg-transparent text-right outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          style={{ color: UI.ink }}
        />
        {suffix}
      </span>
    </div>
  );
}

export const ThemeSwitch = React.memo(({ isDarkMode, toggle }: { isDarkMode: boolean, toggle: () => void }) => {
  return (
    <div className="theme-switch-wrapper drop-shadow-md">
      <style>{`
        .theme-switch-wrapper {
          --hue: 189;
          /* Greyscale to match the rest of the editor chrome: dark track,
             light knob, rather than a cyan knob on a white track. */
          --primary: #f2f2f2;
          --trans-dur: 0.6s;
          --trans-timing: cubic-bezier(0.65,0,0.35,1);
          font-size: 16px; 
        }
        .switch, .switch__input { display: block; -webkit-tap-highlight-color: transparent; }
        .switch { margin: auto; position: relative; -webkit-user-select: none; -moz-user-select: none; user-select: none; }
        .switch__inner { border-radius: 0.5em; display: block; overflow: hidden; position: absolute; top: 0.25em; left: 0.25em; width: 2.25em; height: 1em; }
        .switch__inner:before { transition: transform var(--trans-dur) var(--trans-timing); transform: translateX(-1.25em); }
        .switch__inner:before { background-color: var(--primary); border-radius: inherit; content: ""; display: block; width: 100%; height: 100%; }
        .switch__input { background-color: #262626; border-radius: 0.75em; box-shadow: 0 0 0 0.0625em hsla(var(--hue),90%,50%,0), 0 0.125em 0.5em hsla(var(--hue),10%,10%,0.1); outline: transparent; width: 2.75em; height: 1.5em; -webkit-appearance: none; appearance: none; transition: background-color var(--trans-dur), box-shadow var(--trans-dur); cursor: pointer; }
        .switch__input:checked { background-color: #3a3a3a; }
        .switch__input:checked ~ .switch__inner:before { transform: translateX(1.25em); }
      `}</style>
      <label className="switch">
        <input className="switch__input" type="checkbox" role="switch" name="dark" checked={isDarkMode} onChange={toggle} />
        <span className="switch__inner"></span>
        <span className="sr-only">Toggle</span>
      </label>
    </div>
  );
});
