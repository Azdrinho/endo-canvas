import React, { useRef, useState } from 'react';

// The editor's own chrome. Deliberately quiet and monochrome: the artwork on
// the canvas is the only saturated thing on screen, so the controls never
// compete with the thing being designed.

export const UI = {
  shell: '#0E0E10',
  panel: '#151518',
  raised: '#1D1D21',
  track: '#26262B',
  fill: '#3A3A42',
  line: 'rgba(255,255,255,0.08)',
  ink: '#F2F2F4',
  muted: '#8A8A94',
  accent: '#FFFFFF',
} as const;

export const Section: React.FC<{ title: string; children: React.ReactNode; action?: React.ReactNode }> = ({ title, children, action }) => (
  <section style={{ marginBottom: 22 }}>
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <h3 style={{
        margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: UI.muted,
      }}>{title}</h3>
      {action}
    </header>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
  </section>
);

export const FieldShell: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label style={{ display: 'block' }}>
    <span style={{ display: 'block', fontSize: 11, color: UI.muted, marginBottom: 5 }}>{label}</span>
    {children}
    {hint && <span style={{ display: 'block', fontSize: 10, color: 'rgba(138,138,148,0.75)', marginTop: 4, lineHeight: 1.4 }}>{hint}</span>}
  </label>
);

export const TextInput: React.FC<{
  value: string; onChange: (v: string) => void; onCommit?: () => void;
  placeholder?: string; multiline?: boolean;
}> = ({ value, onChange, onCommit, placeholder, multiline }) => {
  const style: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: UI.raised, color: UI.ink,
    border: `1px solid ${UI.line}`, borderRadius: 8,
    padding: '9px 11px', fontSize: 13, outline: 'none',
    fontFamily: 'inherit', resize: 'vertical',
  };
  const shared = {
    value, placeholder, style,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onBlur: onCommit,
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; },
  };
  return multiline
    ? <textarea {...shared} rows={4} onBlur={(e) => { e.target.style.borderColor = UI.line; onCommit?.(); }} />
    : <input {...shared} onBlur={(e) => { e.target.style.borderColor = UI.line; onCommit?.(); }} />;
};

/**
 * A slider whose filled portion is the row itself, with the label inside it.
 * Dragging commits once on release, so a drag is one undo step rather than
 * one per frame.
 */
export const Slider: React.FC<{
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void; onCommit: () => void;
}> = ({ label, value, min, max, step = 1, unit, onChange, onCommit }) => {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const decimals = step < 1 ? 2 : 0;
  return (
    <div style={{ position: 'relative', height: 34, borderRadius: 8, overflow: 'hidden', background: UI.track, userSelect: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, left: 0, width: `${pct}%`, background: UI.fill, transition: 'width 40ms linear' }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 11px', pointerEvents: 'none',
      }}>
        <span style={{ fontSize: 12, color: UI.ink }}>{label}</span>
        <span style={{ fontSize: 11, color: UI.muted, fontVariantNumeric: 'tabular-nums' }}>
          {value.toFixed(decimals)}{unit ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        aria-label={label}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'ew-resize', margin: 0 }}
      />
    </div>
  );
};

export const Segmented = <T extends string>({ value, options, onChange, columns }: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (v: T) => void;
  columns?: number;
}) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: `repeat(${columns ?? options.length}, 1fr)`,
    gap: 3, padding: 3, background: UI.track, borderRadius: 9,
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
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '7px 8px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: active ? UI.accent : 'transparent',
            color: active ? '#101013' : UI.muted,
            fontSize: 11.5, fontWeight: active ? 700 : 500,
            fontFamily: 'inherit', transition: 'background 120ms, color 120ms',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {o.icon}{o.label}
        </button>
      );
    })}
  </div>
);

export const Toggle: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={value}
    onClick={() => onChange(!value)}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      width: '100%', padding: '8px 11px', borderRadius: 8,
      background: UI.raised, border: `1px solid ${UI.line}`,
      cursor: 'pointer', fontFamily: 'inherit',
    }}
  >
    <span style={{ fontSize: 12, color: UI.ink }}>{label}</span>
    <span style={{
      width: 34, height: 20, borderRadius: 999, padding: 2, flexShrink: 0,
      background: value ? UI.accent : UI.track, transition: 'background 140ms',
      display: 'flex', justifyContent: value ? 'flex-end' : 'flex-start',
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: '50%',
        background: value ? '#101013' : UI.muted, transition: 'all 140ms',
      }} />
    </span>
  </button>
);

const SWATCHES = ['#FFFFFF', '#141418', '#22D3EE', '#594C99', '#E84E6F', '#13694A', '#E6AB3E', '#6813A5'];

export const ColorPicker: React.FC<{ value: string; onChange: (v: string) => void; onCommit: () => void }> = ({ value, onChange, onCommit }) => {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  React.useEffect(() => setDraft(value), [value]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={() => ref.current?.click()}
          aria-label="Escolher cor"
          style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0, cursor: 'pointer',
            background: value, border: `1px solid ${UI.line}`,
          }}
        />
        {/* A native colour dialog is unreliable across browsers, so the hex
            field is the real control and the swatch is the shortcut. */}
        <input
          ref={ref} type="color" value={value}
          onChange={(e) => { setDraft(e.target.value); onChange(e.target.value); }}
          onBlur={onCommit}
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        />
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value);
          }}
          onBlur={onCommit}
          spellCheck={false}
          style={{
            flex: 1, minWidth: 0, background: UI.raised, color: UI.ink,
            border: `1px solid ${UI.line}`, borderRadius: 8, padding: '0 11px',
            fontSize: 12, fontFamily: 'ui-monospace, monospace', outline: 'none',
          }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
        {SWATCHES.map(c => (
          <button
            key={c} type="button"
            onClick={() => { onChange(c); onCommit(); }}
            aria-label={c}
            style={{
              aspectRatio: '1', borderRadius: 5, cursor: 'pointer', background: c,
              border: value.toLowerCase() === c.toLowerCase() ? `2px solid ${UI.accent}` : `1px solid ${UI.line}`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export const IconButton: React.FC<{
  label: string; onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode;
}> = ({ label, onClick, disabled, active, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
    style={{
      width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center',
      background: active ? UI.accent : 'transparent',
      color: active ? '#101013' : disabled ? 'rgba(138,138,148,0.35)' : UI.muted,
      border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background 120ms, color 120ms', fontFamily: 'inherit',
    }}
  >
    {children}
  </button>
);
