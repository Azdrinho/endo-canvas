// The editor chrome moved to src/editor/ui, which is a real scale — spacing,
// radius, colour, type and motion all come from one place instead of being
// chosen per component. This file stays as the entry point the editor
// imports from, and maps the handful of names the old one exported.

export {
  Panel, Section, Field, TextInput, Slider, Segmented, Toggle, ColorPicker,
  IconButton, PrimaryButton, GhostButton,
  C, S, R, T, MOTION, ELEVATION, focusRing,
} from './ui';

import { C, R, S } from './ui/tokens';

/** Legacy alias. The colour ramp now lives in ui/tokens as `C`. */
export const UI = {
  shell: C.void,
  panel: C.panel,
  raised: C.raised,
  track: C.track,
  fill: C.fill,
  line: C.edge,
  ink: C.ink,
  muted: C.muted,
  accent: C.accent,
} as const;

/** Legacy alias for the labelled field wrapper. */
export { Field as FieldShell } from './ui';

export const SPACING = S;
export const RADIUS = R;
