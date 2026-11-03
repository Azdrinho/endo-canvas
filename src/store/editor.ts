import { create } from 'zustand';
import {
  type BrandKey, type Card, type FieldValue, type FormatId, type Locale,
  type Person, type ThemeId, coerceValues, emptyPerson, FORMATS,
} from '../templates/types';
import { getTemplate } from '../templates/registry';

// One store for the whole editor. The old app held 71 useState hooks in a
// 5,000-line component, which is why a value read in one handler could be a
// render behind the value written in another — the wheel-zoom bug where five
// notches collapsed into one step was exactly that.

const HISTORY_LIMIT = 80;

/** A point in time we can return to. Only the card changes under undo. */
type Snapshot = { card: Card; people: Person[] };

interface EditorState {
  card: Card;
  people: Person[];

  /** Field currently selected on the canvas, if any. */
  selection: string | null;
  /** Canvas viewport. */
  zoom: number;
  pan: { x: number; y: number };
  /** 'fit' recomputes zoom whenever the stage or format changes. */
  zoomMode: 'fit' | 'manual';

  past: Snapshot[];
  future: Snapshot[];

  setTemplate: (templateId: string) => void;
  setFormat: (format: FormatId) => void;
  setTheme: (theme: ThemeId) => void;
  setBrand: (brand: BrandKey) => void;
  setLocale: (locale: Locale) => void;
  setValue: (fieldId: string, value: FieldValue, options?: { transient?: boolean }) => void;

  setPerson: (index: number, patch: Partial<Person>, options?: { transient?: boolean }) => void;
  addPerson: () => void;
  removePerson: (id: string) => void;

  select: (fieldId: string | null) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  fitToStage: (stage: { width: number; height: number }) => void;

  /** Call when a gesture ends, to collapse it into a single undo step. */
  commit: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  hydrate: (card: Partial<Card>, people: Person[]) => void;
}

// Deliberately does not touch the template registry. The registry imports
// every template, each of which imports the editable kit, which imports this
// store -- a cycle. Whoever is imported first wins, so calling getTemplate
// while this module is still initialising crashed when a test imported the
// registry before the store. Values start empty and are resolved against the
// template's declaration at read time instead, which also means a value
// hydrated from the database goes through exactly the same coercion.
const newCard = (templateId: string): Card => ({
  id: `card-${Date.now()}`,
  templateId,
  format: 'post-square',
  theme: 'dark',
  brand: 'technology',
  locale: 'pt',
  values: {},
  peopleIds: [],
  updatedAt: new Date().toISOString(),
});

const snapshot = (s: EditorState): Snapshot => ({
  card: { ...s.card, values: { ...s.card.values } },
  people: s.people.map(p => ({ ...p, photoOffset: { ...p.photoOffset } })),
});

export const useEditor = create<EditorState>((set, get) => {
  // A gesture (a drag, a wheel burst, a slider sweep) fires dozens of writes
  // and has to collapse into one undo step. The step has to be the state
  // *before* the gesture, so it is captured on the gesture's first transient
  // write and held here until commit() files it. Snapshotting at commit()
  // time instead would record the state the gesture already produced, and
  // undo would appear to do nothing -- which is exactly what it did.
  let pending: Snapshot | null = null;

  const withHistory = (
    mutate: (s: EditorState) => Partial<EditorState>,
    transient = false,
  ) => {
    if (transient && !pending) pending = snapshot(get());
    const before = transient ? null : snapshot(get());
    set(s => {
      const next = mutate(s);
      if (before) {
        pending = null;
        return { ...next, past: [...s.past, before].slice(-HISTORY_LIMIT), future: [] };
      }
      return next;
    });
  };

  return {
    card: newCard('hr-update'),
    people: [emptyPerson()],
    selection: null,
    zoom: 1,
    pan: { x: 0, y: 0 },
    zoomMode: 'fit',
    past: [],
    future: [],

    setTemplate: (templateId) => withHistory(s => {
      const template = getTemplate(templateId);
      // Values carry over by field id, so switching between two templates
      // that both have a `title` keeps the title the user typed instead of
      // silently resetting it.
      const carried = coerceValues(template, s.card.values);
      const format = template.formats.includes(s.card.format) ? s.card.format : template.formats[0];
      return {
        card: { ...s.card, templateId, format, values: carried },
        selection: null,
      };
    }),

    setFormat: (format) => withHistory(s => ({ card: { ...s.card, format } })),
    setTheme: (theme) => withHistory(s => ({ card: { ...s.card, theme } })),
    setBrand: (brand) => withHistory(s => ({ card: { ...s.card, brand } })),
    setLocale: (locale) => withHistory(s => ({ card: { ...s.card, locale } })),

    setValue: (fieldId, value, options) => withHistory(
      s => ({ card: { ...s.card, values: { ...s.card.values, [fieldId]: value } } }),
      options?.transient,
    ),

    setPerson: (index, patch, options) => withHistory(
      s => ({ people: s.people.map((p, i) => (i === index ? { ...p, ...patch } : p)) }),
      options?.transient,
    ),

    addPerson: () => withHistory(s => ({
      people: [...s.people, emptyPerson(`p${s.people.length + 1}-${Date.now()}`)],
    })),

    removePerson: (id) => withHistory(s => ({
      people: s.people.length > 1 ? s.people.filter(p => p.id !== id) : s.people,
    })),

    select: (fieldId) => set({ selection: fieldId }),
    setZoom: (zoom) => set({ zoom: Math.min(4, Math.max(0.05, zoom)), zoomMode: 'manual' }),
    setPan: (pan) => set({ pan }),

    fitToStage: (stage) => set(s => {
      if (s.zoomMode === 'manual') return {};
      const f = FORMATS[s.card.format];
      const margin = 64;
      const zoom = Math.min(
        (stage.width - margin * 2) / f.width,
        (stage.height - margin * 2) / f.height,
      );
      return { zoom: Math.max(0.05, zoom), pan: { x: 0, y: 0 } };
    }),

    // Files the snapshot taken at the start of the gesture. A no-op when no
    // gesture is open, so a stray call cannot pollute history.
    commit: () => {
      if (!pending) return;
      const before = pending;
      pending = null;
      set(s => ({ past: [...s.past, before].slice(-HISTORY_LIMIT), future: [] }));
    },

    undo: () => set(s => {
      const previous = s.past[s.past.length - 1];
      if (!previous) return {};
      return {
        ...previous,
        past: s.past.slice(0, -1),
        future: [snapshot(s), ...s.future].slice(0, HISTORY_LIMIT),
      };
    }),

    redo: () => set(s => {
      const next = s.future[0];
      if (!next) return {};
      return {
        ...next,
        past: [...s.past, snapshot(s)].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
      };
    }),

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    hydrate: (card, people) => set(s => {
      const templateId = card.templateId ?? s.card.templateId;
      const template = getTemplate(templateId);
      return {
        card: {
          ...s.card,
          ...card,
          templateId,
          values: coerceValues(template, card.values),
        },
        people: people.length ? people : [emptyPerson()],
        past: [],
        future: [],
      };
    }),
  };
});
