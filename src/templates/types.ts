import type { ReactNode } from 'react';

// --- THE CARD MODEL ---------------------------------------------------------
//
// The old editor's defining mistake was that a template's controls lived in
// three unrelated places: a field on the Employee type, a slider hand-written
// into the sidebar, and a column in the database. Adding a control meant
// touching all three, and the third was forgotten so often that an entire
// panel's worth of settings turned out never to have been saved at all.
//
// Here a template declares its fields once, as data. The inspector renders
// itself from that declaration, persistence stores it as one blob, and the
// canvas knows which fields are editable in place. Adding a control is adding
// one entry to one array. There is nowhere left to forget.

/** Pixel dimensions a card can be composed at. */
export interface Format {
  id: FormatId;
  label: string;
  width: number;
  height: number;
}

export type FormatId =
  | 'post-square'
  | 'post-portrait'
  | 'story'
  | 'landscape'
  | 'email-banner';

// Composed at real output size and scaled down for display, rather than
// composed small and upscaled on export. Type and spacing are therefore
// specified once, in final pixels, and an export is a 1:1 capture instead of
// a 2x guess.
export const FORMATS: Record<FormatId, Format> = {
  'post-square': { id: 'post-square', label: 'Post 1:1', width: 1080, height: 1080 },
  'post-portrait': { id: 'post-portrait', label: 'Post 4:5', width: 1080, height: 1350 },
  'story': { id: 'story', label: 'Story 9:16', width: 1080, height: 1920 },
  'landscape': { id: 'landscape', label: 'Paisagem 16:9', width: 1920, height: 1080 },
  'email-banner': { id: 'email-banner', label: 'Banner e-mail', width: 1480, height: 720 },
};

export const FORMAT_ORDER: FormatId[] = [
  'post-square', 'post-portrait', 'story', 'landscape', 'email-banner',
];

// --- FIELDS -----------------------------------------------------------------

interface FieldBase {
  id: string;
  label: string;
  /** Inspector grouping. Fields with no group land in "Conteúdo". */
  group?: string;
  /** One line of help shown under the control when it is not obvious. */
  hint?: string;
}

export type FieldSpec =
  | (FieldBase & { kind: 'text'; default: string; multiline?: boolean; placeholder?: string })
  /** Accepts inline formatting from the selection toolbar. Never from a paste. */
  | (FieldBase & { kind: 'richText'; default: string; placeholder?: string })
  | (FieldBase & { kind: 'image'; default?: string })
  | (FieldBase & { kind: 'number'; default: number; min: number; max: number; step?: number; unit?: string })
  | (FieldBase & { kind: 'toggle'; default: boolean })
  | (FieldBase & { kind: 'select'; default: string; options: { value: string; label: string }[] })
  | (FieldBase & { kind: 'color'; default: string });

export type FieldValue = string | number | boolean | undefined;

/** Everything a template needs to draw itself. */
export interface RenderContext {
  /** Field values, already defaulted and coerced. */
  v: <T extends FieldValue>(fieldId: string) => T;
  format: Format;
  theme: 'light' | 'dark';
  brand: BrandKey;
  locale: Locale;
  /** People on the card. Length 1 for a single card, more for a group card. */
  people: Person[];
  /** True while exporting: suppresses editing affordances and hover states. */
  exporting: boolean;
}

export interface Template {
  id: string;
  name: string;
  /** One line, shown in the picker under the name. */
  tagline: string;
  /** Loose category, used to group the picker. */
  family: 'pessoas' | 'comunicacao' | 'comercial';
  formats: FormatId[];
  fields: FieldSpec[];
  /** Order and labels for the inspector's sections. */
  groups?: string[];
  /** Set when the card can hold several people. */
  group?: { min: number; max: number };
  render: (ctx: RenderContext) => ReactNode;
}

// --- SUPPORTING TYPES -------------------------------------------------------

export type BrandKey = 'technology' | 'studio' | 'omni' | 'gator' | 'consulting';
export type Locale = 'pt' | 'en' | 'es';
export type ThemeId = 'light' | 'dark';

export interface Person {
  id: string;
  name: string;
  role: string;
  photoUrl: string;
  /** 1 = fit. Pan is a fraction of the frame, so it survives any format. */
  photoZoom: number;
  photoOffset: { x: number; y: number };
  dateLabel?: string;
  previousRole?: string;
  tenure?: string;
}

export const emptyPerson = (id = 'p1'): Person => ({
  id,
  name: '',
  role: '',
  photoUrl: '',
  photoZoom: 1,
  photoOffset: { x: 0, y: 0 },
});

/** A saved card: which template, at what format, with which values. */
export interface Card {
  id: string;
  templateId: string;
  format: FormatId;
  theme: ThemeId;
  brand: BrandKey;
  locale: Locale;
  values: Record<string, FieldValue>;
  peopleIds: string[];
  updatedAt: string;
}

// --- DEFAULTS AND COERCION --------------------------------------------------
//
// Stored values are untrusted: they come from a shared database, they may have
// been written by an older build, and a field may have been renamed or removed
// since. Everything is read through here, so a missing or wrong-typed value
// falls back to the template's default instead of reaching a template as
// undefined and rendering `NaNpx`.

export const defaultsFor = (template: Template): Record<string, FieldValue> => {
  const out: Record<string, FieldValue> = {};
  for (const field of template.fields) out[field.id] = field.default;
  return out;
};

export const coerceValues = (
  template: Template,
  stored: Record<string, unknown> | undefined,
): Record<string, FieldValue> => {
  const out = defaultsFor(template);
  if (!stored) return out;

  for (const field of template.fields) {
    const raw = stored[field.id];
    if (raw === undefined || raw === null) continue;

    switch (field.kind) {
      case 'text':
      case 'richText':
      case 'image':
      case 'color':
        if (typeof raw === 'string') out[field.id] = raw;
        break;
      case 'number': {
        const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
        if (Number.isFinite(n)) out[field.id] = Math.min(field.max, Math.max(field.min, n));
        break;
      }
      case 'toggle':
        out[field.id] = Boolean(raw);
        break;
      case 'select':
        // A value that is no longer one of the options is dropped, not kept:
        // the alternative is a template branching on a string it has never
        // heard of, which is how the old one produced blank cards.
        if (field.options.some(o => o.value === raw)) out[field.id] = String(raw);
        break;
    }
  }
  return out;
};
