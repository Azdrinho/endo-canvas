import { describe, expect, it, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { TEMPLATES, getTemplate } from '../src/templates/registry';
import { FORMATS, coerceValues, defaultsFor, emptyPerson, type FieldValue, type Person, type RenderContext } from '../src/templates/types';
import { BRAND_ORDER } from '../src/design/brand';
import { useEditor } from '../src/store/editor';

const person = (over: Partial<Person> = {}): Person => ({ ...emptyPerson('p1'), name: 'Amanda Santos', role: 'Product Manager', ...over });

const renderCard = (templateId: string, overrides: Partial<RenderContext> = {}) => {
  const template = getTemplate(templateId);
  const values = overrides.v ? undefined : defaultsFor(template);
  const ctx: RenderContext = {
    v: (<T extends FieldValue>(id: string) => values?.[id] as T),
    format: FORMATS[template.formats[0]],
    theme: 'dark',
    brand: 'technology',
    locale: 'pt',
    people: [person()],
    exporting: true,
    ...overrides,
  };
  return renderToStaticMarkup(<>{template.render(ctx)}</>);
};

// The brief for this rebuild was "os templates não devem conter erros". A
// template is a pure function from data to markup, so that is a property that
// can simply be asserted — across every template, every format, every brand
// and both themes, rather than discovered later on a card someone published.

describe('every template, at every format', () => {
  const combos = TEMPLATES.flatMap(t => t.formats.map(f => [t.id, f] as const));

  it.each(combos)('%s renders at %s', (templateId, formatId) => {
    const html = renderCard(templateId, { format: FORMATS[formatId] });
    expect(html.length).toBeGreaterThan(200);
  });

  it.each(combos)('%s emits no broken numbers at %s', (templateId, formatId) => {
    const html = renderCard(templateId, { format: FORMATS[formatId] });
    // A NaN or undefined reaching a style is the single most common way a
    // template silently collapses: the browser drops the declaration and the
    // element lands at the top-left corner with no size.
    expect(html, 'NaN in output').not.toMatch(/NaN/);
    expect(html, 'undefined in output').not.toMatch(/undefined/);
    expect(html, 'Infinity in output').not.toMatch(/Infinity/);
    expect(html, '[object Object] in output').not.toMatch(/\[object Object\]/);
  });

  it.each(TEMPLATES.map(t => t.id))('%s renders in every brand and theme', (templateId) => {
    for (const brand of BRAND_ORDER) {
      for (const theme of ['light', 'dark'] as const) {
        expect(() => renderCard(templateId, { brand, theme })).not.toThrow();
      }
    }
  });

  it.each(TEMPLATES.map(t => t.id))('%s survives entirely empty content', (templateId) => {
    const template = getTemplate(templateId);
    const blank = Object.fromEntries(template.fields.map(f => [f.id, f.kind === 'toggle' ? false : '']));
    const html = renderCard(templateId, {
      v: (<T extends FieldValue>(id: string) => blank[id] as T),
      people: [emptyPerson()],
    });
    expect(html).not.toMatch(/NaN|undefined/);
  });
});

describe('group templates', () => {
  const groupTemplates = TEMPLATES.filter(t => t.group);

  it('there is at least one', () => {
    expect(groupTemplates.length).toBeGreaterThan(0);
  });

  it.each(groupTemplates.map(t => t.id))('%s lays out from one person up to its maximum', (templateId) => {
    const template = getTemplate(templateId);
    const max = template.group!.max;
    for (const n of [1, 2, 3, 5, 8, max]) {
      const people = Array.from({ length: n }, (_, i) => person({ id: `p${i}`, name: `Pessoa ${i + 1}` }));
      const html = renderCard(templateId, { people });
      expect(html, `${n} people`).not.toMatch(/NaN|undefined/);
    }
  });

  it.each(groupTemplates.map(t => t.id))('%s never draws more than its maximum', (templateId) => {
    const template = getTemplate(templateId);
    const max = template.group!.max;
    const people = Array.from({ length: max + 6 }, (_, i) => person({ id: `p${i}`, name: `Pessoa ${i + 1}` }));
    const html = renderCard(templateId, { people });
    const drawn = (html.match(/Pessoa \d+/g) ?? []).length;
    expect(drawn).toBeLessThanOrEqual(max);
  });
});

describe('field declarations', () => {
  it.each(TEMPLATES.map(t => t.id))('%s has unique field ids', (templateId) => {
    const ids = getTemplate(templateId).fields.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(TEMPLATES.map(t => t.id))('%s declares at least one format', (templateId) => {
    expect(getTemplate(templateId).formats.length).toBeGreaterThan(0);
  });

  it.each(TEMPLATES.map(t => t.id))('%s keeps number defaults inside their own range', (templateId) => {
    for (const f of getTemplate(templateId).fields) {
      if (f.kind !== 'number') continue;
      expect(f.default, `${f.id}`).toBeGreaterThanOrEqual(f.min);
      expect(f.default, `${f.id}`).toBeLessThanOrEqual(f.max);
    }
  });

  it.each(TEMPLATES.map(t => t.id))('%s keeps select defaults among its own options', (templateId) => {
    for (const f of getTemplate(templateId).fields) {
      if (f.kind !== 'select') continue;
      expect(f.options.map(o => o.value), `${f.id}`).toContain(f.default);
    }
  });

  it('getTemplate falls back instead of throwing on an unknown id', () => {
    expect(() => getTemplate('nope-does-not-exist')).not.toThrow();
    expect(getTemplate('nope-does-not-exist').id).toBe(TEMPLATES[0].id);
  });
});

// Stored values come from a shared database and may have been written by an
// older build against a field that has since changed. They are read through
// one coercion step so a bad value can never reach a template.
describe('coerceValues', () => {
  const template = TEMPLATES[0];

  it('fills in everything that is missing', () => {
    expect(coerceValues(template, {})).toEqual(defaultsFor(template));
    expect(coerceValues(template, undefined)).toEqual(defaultsFor(template));
  });

  it('clamps a number to the field it belongs to', () => {
    const field = template.fields.find(f => f.kind === 'number')!;
    const high = coerceValues(template, { [field.id]: 9999 });
    const low = coerceValues(template, { [field.id]: -9999 });
    expect(high[field.id]).toBe((field as never as { max: number }).max);
    expect(low[field.id]).toBe((field as never as { min: number }).min);
  });

  it('ignores a value of the wrong type', () => {
    const field = template.fields.find(f => f.kind === 'number')!;
    expect(coerceValues(template, { [field.id]: 'banana' })[field.id]).toBe(field.default);
  });

  it('drops a select value that is no longer an option', () => {
    const field = template.fields.find(f => f.kind === 'select');
    if (!field) return;
    expect(coerceValues(template, { [field.id]: 'retired-option' })[field.id]).toBe(field.default);
  });

  it('ignores fields the template does not have', () => {
    const out = coerceValues(template, { somethingRemovedLastYear: 42 });
    expect(out).not.toHaveProperty('somethingRemovedLastYear');
  });
});

// The undo mechanics, which the previous editor got wrong in both directions:
// a slider drag filed one step per frame, and a gesture that did collapse
// filed the state it had already produced, so undo appeared to do nothing.
describe('history', () => {
  beforeEach(() => {
    useEditor.setState({ past: [], future: [] });
    useEditor.getState().setTemplate(TEMPLATES[0].id);
    useEditor.setState({ past: [], future: [] });
  });

  const numberField = () => TEMPLATES[0].fields.find(f => f.kind === 'number')!;

  it('collapses a burst of transient writes into one step', () => {
    const field = numberField();
    const before = useEditor.getState().card.values[field.id];
    for (let i = 0; i < 20; i++) {
      useEditor.getState().setValue(field.id, 0.6 + i * 0.01, { transient: true });
    }
    useEditor.getState().commit();
    expect(useEditor.getState().past).toHaveLength(1);

    useEditor.getState().undo();
    expect(useEditor.getState().card.values[field.id]).toBe(before);
  });

  it('undoes to the state before the gesture, not the state it produced', () => {
    const field = numberField();
    const before = useEditor.getState().card.values[field.id];
    useEditor.getState().setValue(field.id, 0.9, { transient: true });
    useEditor.getState().commit();
    useEditor.getState().undo();
    expect(useEditor.getState().card.values[field.id]).toBe(before);
  });

  it('redoes what was undone', () => {
    const field = numberField();
    useEditor.getState().setValue(field.id, 0.77);
    useEditor.getState().undo();
    useEditor.getState().redo();
    expect(useEditor.getState().card.values[field.id]).toBe(0.77);
  });

  it('ignores a commit with no gesture open', () => {
    useEditor.getState().commit();
    expect(useEditor.getState().past).toHaveLength(0);
  });

  it('carries shared field values across a template switch', () => {
    const [a, b] = TEMPLATES;
    const shared = a.fields.find(f => b.fields.some(g => g.id === f.id && g.kind === f.kind));
    if (!shared) return;
    // A value of the right kind for the field, since carrying a value over is
    // the thing under test -- handing a number field a string would just
    // exercise the coercion, which has its own tests.
    const kept =
      shared.kind === 'toggle' ? !shared.default
      : shared.kind === 'number' ? (shared.min + shared.max) / 2
      : shared.kind === 'select' ? shared.options[shared.options.length - 1].value
      : 'mantido';

    useEditor.getState().setTemplate(a.id);
    useEditor.getState().setValue(shared.id, kept);
    useEditor.getState().setTemplate(b.id);
    expect(useEditor.getState().card.values[shared.id]).toBe(kept);
  });

  it('moves to a format the new template supports', () => {
    for (const template of TEMPLATES) {
      useEditor.getState().setTemplate(template.id);
      expect(template.formats).toContain(useEditor.getState().card.format);
    }
  });
});
