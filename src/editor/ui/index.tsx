import React, { useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { C, ELEVATION, MOTION, R, S, T, focusRing } from './tokens';

export * from './tokens';

// --- STRUCTURE --------------------------------------------------------------

export const Panel: React.FC<{
  side: 'left' | 'right';
  width: number;
  label: string;
  children: React.ReactNode;
}> = ({ side, width, label, children }) => (
  <aside
    aria-label={label}
    style={{
      width, flexShrink: 0, height: '100%', overflowY: 'auto', overflowX: 'hidden',
      background: C.panel,
      [side === 'left' ? 'borderRight' : 'borderLeft']: `1px solid ${C.edge}`,
      padding: `${S.lg}px ${S.lg}px ${S.xxxl}px`,
    }}
  >
    {children}
  </aside>
);

export const Section: React.FC<{ title: string; children: React.ReactNode; trailing?: React.ReactNode }> = ({
  title, children, trailing,
}) => (
  <section style={{ marginBottom: S.xl }}>
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.md, minHeight: 16 }}>
      <h3 style={{ margin: 0, color: C.muted, ...T.label }}>{title}</h3>
      {trailing}
    </header>
    <div style={{ display: 'flex', flexDirection: 'column', gap: S.sm }}>{children}</div>
  </section>
);

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div>
    <div style={{ color: C.muted, marginBottom: S.xs + 1, ...T.field }}>{label}</div>
    {children}
    {hint && <p style={{ margin: `${S.xs}px 0 0`, color: C.faint, ...T.hint }}>{hint}</p>}
  </div>
);

// --- INPUTS -----------------------------------------------------------------

const inputBase: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: C.raised, color: C.ink,
  border: `1px solid ${C.edge}`, borderRadius: R.md,
  padding: `${S.sm + 1}px ${S.md - 1}px`,
  outline: 'none', fontFamily: 'inherit', resize: 'vertical',
  boxShadow: C.sheen,
  transition: 'border-color 120ms, background 120ms',
  ...T.control,
};

export const TextInput: React.FC<{
  value: string; onChange: (v: string) => void; onCommit?: () => void;
  placeholder?: string; multiline?: boolean; rows?: number;
}> = ({ value, onChange, onCommit, placeholder, multiline, rows = 3 }) => {
  const [focused, setFocused] = useState(false);
  const style: React.CSSProperties = {
    ...inputBase,
    ...(focused ? { borderColor: 'rgba(255,255,255,0.34)', background: C.raisedHover } : {}),
  };
  const common = {
    value, placeholder, style,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onFocus: () => setFocused(true),
    onBlur: () => { setFocused(false); onCommit?.(); },
  };
  return multiline ? <textarea {...common} rows={rows} /> : <input {...common} />;
};

/**
 * A slider with a real track and knob.
 *
 * The first version made the whole row the fill, with the label inside it —
 * which hid where the handle was and made the control unreadable at a glance.
 * Label above, track below, value right-aligned and tabular so it stops
 * shifting as the number changes.
 */
export const Slider: React.FC<{
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void; onCommit: () => void;
}> = ({ label, value, min, max, step = 1, unit, onChange, onCommit }) => {
  const [active, setActive] = useState(false);
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const decimals = step < 1 ? 2 : 0;
  const id = useId();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: S.xs + 2 }}>
        <label htmlFor={id} style={{ color: C.muted, ...T.field }}>{label}</label>
        <span style={{ color: active ? C.ink : C.faint, transition: 'color 120ms', ...T.value }}>
          {value.toFixed(decimals)}{unit ?? ''}
        </span>
      </div>

      <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 4, borderRadius: R.pill, background: C.track }} />
        <div style={{ position: 'absolute', left: 0, width: `${pct}%`, height: 4, borderRadius: R.pill, background: active ? C.accent : C.fill, transition: active ? 'none' : 'background 140ms' }} />
        <motion.div
          animate={{ scale: active ? 1.25 : 1 }}
          transition={MOTION.snappy}
          style={{
            position: 'absolute', left: `${pct}%`, translateX: '-50%',
            width: 12, height: 12, borderRadius: '50%',
            background: C.accent, boxShadow: '0 1px 4px rgba(0,0,0,0.55)',
            pointerEvents: 'none',
          }}
        />
        <input
          id={id}
          type="range"
          min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onPointerDown={() => setActive(true)}
          onPointerUp={() => { setActive(false); onCommit(); }}
          onKeyDown={() => setActive(true)}
          onKeyUp={() => { setActive(false); onCommit(); }}
          onBlur={() => setActive(false)}
          style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'ew-resize', margin: 0 }}
        />
      </div>
    </div>
  );
};

/** Segmented control with a single indicator that slides between options. */
export const Segmented = <T2 extends string>({ value, options, onChange, columns }: {
  value: T2;
  options: { value: T2; label: string }[];
  onChange: (v: T2) => void;
  columns?: number;
}) => {
  const group = useId();
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns ?? options.length}, 1fr)`,
      gap: 2, padding: 3, background: C.track, borderRadius: R.lg,
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
    }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            style={{
              position: 'relative', padding: `${S.sm - 1}px ${S.sm}px`, borderRadius: R.md,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: active ? C.accentInk : C.muted,
              fontFamily: 'inherit', transition: 'color 160ms',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              ...T.control,
              fontWeight: active ? 700 : 500,
            }}
          >
            {/* The indicator is painted inside the button and the label is
                lifted above it. A negative z-index put it behind the
                button's own stacking context instead, so the active option
                simply looked disabled. */}
            {active && (
              <motion.span
                layoutId={`seg-${group}`}
                transition={MOTION.snappy}
                style={{
                  position: 'absolute', inset: 0, borderRadius: R.md,
                  background: C.accent,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1 }}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export const Toggle: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={value}
    onClick={() => onChange(!value)}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
      padding: `${S.sm + 1}px ${S.md - 1}px`, borderRadius: R.md,
      background: C.raised, border: `1px solid ${C.edge}`, boxShadow: C.sheen,
      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
    }}
  >
    <span style={{ color: value ? C.ink : C.muted, transition: 'color 160ms', ...T.control }}>{label}</span>
    <span style={{
      width: 32, height: 18, borderRadius: R.pill, padding: 2, flexShrink: 0,
      background: value ? C.accent : C.track,
      transition: 'background 180ms', display: 'flex',
      justifyContent: value ? 'flex-end' : 'flex-start',
    }}>
      <motion.span
        layout
        transition={MOTION.snappy}
        style={{ width: 14, height: 14, borderRadius: '50%', background: value ? C.accentInk : C.muted }}
      />
    </span>
  </button>
);

const SWATCHES = ['#FFFFFF', '#0A0A0C', '#22D3EE', '#594C99', '#E84E6F', '#13694A', '#E6AB3E', '#6813A5'];

export const ColorPicker: React.FC<{ value: string; onChange: (v: string) => void; onCommit: () => void }> = ({ value, onChange, onCommit }) => {
  const native = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);
  React.useEffect(() => setDraft(value), [value]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: S.sm }}>
      <div style={{ display: 'flex', gap: S.sm }}>
        <button
          type="button"
          onClick={() => native.current?.click()}
          aria-label="Escolher cor"
          style={{
            width: 34, height: 34, borderRadius: R.md, flexShrink: 0, cursor: 'pointer',
            background: value, border: `1px solid ${C.edge}`, boxShadow: C.sheen,
          }}
        />
        <input
          ref={native} type="color" value={value} tabIndex={-1}
          onChange={(e) => { setDraft(e.target.value); onChange(e.target.value); }}
          onBlur={onCommit}
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        />
        {/* The hex field is the real control: native colour dialogs behave
            differently in every browser and some never open at all. */}
        <input
          value={draft}
          spellCheck={false}
          onChange={(e) => {
            setDraft(e.target.value);
            if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value);
          }}
          onBlur={onCommit}
          style={{ ...inputBase, fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12 }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: S.xs + 1 }}>
        {SWATCHES.map(c => (
          <button
            key={c} type="button"
            onClick={() => { onChange(c); onCommit(); }}
            aria-label={c}
            style={{
              aspectRatio: '1', borderRadius: R.sm, cursor: 'pointer', background: c,
              border: value.toLowerCase() === c.toLowerCase() ? `2px solid ${C.accent}` : `1px solid ${C.edge}`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// --- ACTIONS ----------------------------------------------------------------

export const IconButton: React.FC<{
  label: string; onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode;
}> = ({ label, onClick, disabled, active, children }) => {
  const [hover, setHover] = useState(false);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      style={{
        width: 32, height: 32, borderRadius: R.md, display: 'grid', placeItems: 'center',
        border: 'none', fontFamily: 'inherit',
        background: active ? C.accent : hover && !disabled ? C.raisedHover : 'transparent',
        color: active ? C.accentInk : disabled ? 'rgba(126,126,140,0.3)' : C.muted,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 120ms, color 120ms',
      }}
    >
      {children}
    </motion.button>
  );
};

export const PrimaryButton: React.FC<{
  onClick: () => void; disabled?: boolean; busy?: boolean; children: React.ReactNode;
}> = ({ onClick, disabled, busy, children }) => (
  <motion.button
    type="button"
    onClick={onClick}
    disabled={disabled || busy}
    whileHover={disabled || busy ? undefined : { y: -1 }}
    whileTap={disabled || busy ? undefined : { scale: 0.975 }}
    transition={MOTION.snappy}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: S.sm,
      height: 32, padding: `0 ${S.lg - 2}px`, borderRadius: R.pill, border: 'none',
      background: C.accent, color: C.accentInk,
      cursor: busy ? 'wait' : disabled ? 'not-allowed' : 'pointer',
      opacity: busy || disabled ? 0.55 : 1,
      boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
      fontFamily: 'inherit', ...T.control, fontWeight: 700,
    }}
  >
    {children}
  </motion.button>
);

export const GhostButton: React.FC<{
  onClick: () => void; children: React.ReactNode; full?: boolean;
}> = ({ onClick, children, full }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: full ? '100%' : undefined,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: S.sm,
        padding: `${S.sm}px ${S.md}px`, borderRadius: R.md,
        background: hover ? C.raisedHover : C.raised,
        border: `1px solid ${C.edge}`, boxShadow: C.sheen,
        color: C.inkSoft, cursor: 'pointer', fontFamily: 'inherit',
        transition: 'background 120ms', ...T.control,
      }}
    >
      {children}
    </button>
  );
};

export { focusRing, ELEVATION };
