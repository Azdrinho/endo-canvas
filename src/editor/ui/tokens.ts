// The editor's own design system.
//
// The first pass picked colours and paddings per component — 14px here, 18px
// there, three greys that were nearly the same grey — which is what "falta
// refino" reads as from the outside. Everything below is a scale, and the
// chrome only uses values from it.

/** 4px base. Nothing in the UI uses a spacing value outside this. */
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 44 } as const;

export const R = { sm: 6, md: 9, lg: 13, xl: 18, pill: 999 } as const;

// A ramp with real separation between steps, so a raised surface actually
// reads as raised instead of as the same grey with a border drawn on it.
export const C = {
  /** Deepest layer: the canvas void. */
  void: '#0A0A0C',
  /** Panels. */
  panel: '#121216',
  /** Cards and inputs inside a panel. */
  raised: '#1A1A20',
  /** Hover state for a raised surface. */
  raisedHover: '#22222A',
  /** Slider tracks and inactive segments. */
  track: '#232329',
  /** Filled portion of a control. */
  fill: '#3C3C47',

  ink: '#F4F4F7',
  inkSoft: 'rgba(244,244,247,0.72)',
  muted: '#7E7E8C',
  faint: 'rgba(244,244,247,0.34)',

  /** The one accent. Used for focus, selection and the primary action only. */
  accent: '#FFFFFF',
  accentInk: '#0A0A0C',

  /** Hairlines. Two weights: a structural edge and an internal divider. */
  edge: 'rgba(255,255,255,0.10)',
  divider: 'rgba(255,255,255,0.055)',
  /** A 1px top highlight that makes a surface read as lit from above. */
  sheen: 'inset 0 1px 0 rgba(255,255,255,0.055)',

  danger: '#F2555A',
} as const;

export const T = {
  /** Section headers. */
  label: { fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const },
  /** Field names. */
  field: { fontSize: 11.5, fontWeight: 500, letterSpacing: '0.01em' },
  /** Control text. */
  control: { fontSize: 12.5, fontWeight: 500 },
  /** Values, always tabular so they stop jittering as they change. */
  value: { fontSize: 11, fontWeight: 500, fontVariantNumeric: 'tabular-nums' as const },
  /** Helper copy. */
  hint: { fontSize: 10.5, fontWeight: 400, lineHeight: 1.45 },
  /** Titles in the chrome. */
  title: { fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' },
} as const;

export const ELEVATION = {
  panel: '0 0 0 1px rgba(255,255,255,0.05)',
  raised: `0 1px 2px rgba(0,0,0,0.4), ${C.sheen}`,
  float: '0 12px 32px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)',
  card: '0 50px 90px -30px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.06)',
} as const;

/** One easing and two durations, so nothing in the UI moves to its own beat. */
export const MOTION = {
  snappy: { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.6 },
  soft: { type: 'spring' as const, stiffness: 260, damping: 30 },
  instant: { duration: 0.12, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
} as const;

/** Focus ring, applied identically everywhere something can take focus. */
export const focusRing = {
  outline: 'none',
  boxShadow: `0 0 0 2px ${C.void}, 0 0 0 4px rgba(255,255,255,0.45)`,
} as const;
