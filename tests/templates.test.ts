import { describe, expect, it } from 'vitest';
import { generateCardCanvas } from '../services/emailTemplate';
import { Orientation, TemplateType } from '../types';
import { CONFIG, employee, roster } from './fixtures';

const render = (type: TemplateType, orientation: Orientation = 'portrait', data = employee()) =>
  generateCardCanvas(data, CONFIG, type, orientation, 'pt');

// Snapshots over the generators. They are pure functions from data to a
// string, so this is the cheapest coverage available for the file where
// layout regressions actually happen -- and until now the project had no
// tests at all, so a broken template was only ever found by looking at it.
describe('card snapshots', () => {
  const cases: [TemplateType, Orientation][] = [
    [TemplateType.BIRTHDAY, 'portrait'],
    [TemplateType.BIRTHDAY, 'landscape'],
    [TemplateType.ANNIVERSARY, 'portrait'],
    [TemplateType.WELCOME, 'portrait'],
    [TemplateType.FAREWELL, 'portrait'],
    [TemplateType.FAREWELL, 'landscape'],
    [TemplateType.JOB_CHANGE, 'portrait'],
    [TemplateType.NEW_PROVIDER, 'portrait'],
    [TemplateType.HIRING, 'portrait'],
    [TemplateType.BABY, 'landscape'],
    [TemplateType.ACTIVATION, 'landscape'],
  ];

  for (const [type, orientation] of cases) {
    it(`${type} / ${orientation} is unchanged`, () => {
      expect(render(type, orientation)).toMatchSnapshot();
    });
  }

  it('group See You Soon is unchanged', () => {
    expect(generateCardCanvas(roster(6), CONFIG, TemplateType.FAREWELL, 'portrait', 'pt')).toMatchSnapshot();
  });

  it('month birthday card is unchanged', () => {
    expect(generateCardCanvas(roster(5), CONFIG, TemplateType.BIRTHDAY, 'portrait', 'pt')).toMatchSnapshot();
  });
});

// The cards built around a person. New Provider shows a vendor's logo under
// a fixed title, and Hiring shows a role and a campaign headline -- neither
// puts the employee's name on the artwork, so neither can be asserted to
// keep it.
const NAMED_TEMPLATES: TemplateType[] = Object.values(TemplateType)
  .filter(t => t !== TemplateType.NEW_PROVIDER && t !== TemplateType.HIRING);

describe('every template', () => {
  const allTypes = Object.values(TemplateType);

  it('produces a capture target the exporter can find', () => {
    // The batch exporters locate the card by this id. When they looked it up
    // by position instead, they silently captured a <meta> tag and shipped
    // empty images, so the contract is worth asserting.
    for (const type of allTypes) {
      expect(render(type), `${type} has #capture-target`).toContain('id="capture-target"');
    }
  });

  it('is deterministic — the same data renders byte-identically twice', () => {
    for (const type of allTypes) {
      expect(render(type), `${type} is stable`).toBe(render(type));
    }
  });

  it('never emits an executable node, even from hostile data', () => {
    const hostile = employee({
      name: '<img src=x onerror="alert(1)">Amanda',
      // A quote-and-attribute payload, which only bites if a template drops a
      // text field into an attribute position. Asserted against the parsed
      // DOM rather than the raw string, because the same characters sitting
      // harmlessly inside a text node are not a finding.
      role: '" onmouseover="alert(2)',
      description: '<script>alert(3)</script>',
      photoUrl: 'javascript:alert(4)',
      tenure: '<svg onload=alert(5)>',
    });

    for (const type of allTypes) {
      const html = generateCardCanvas(hostile, CONFIG, type, 'portrait', 'pt');
      const doc = new DOMParser().parseFromString(html, 'text/html');

      // A few templates legitimately write their own inline handlers (the
      // Hiring card auto-fits on image load, the upload overlay has an
      // onclick). So the property is not "no handlers" but "hostile data
      // adds none": the set of handler-bearing elements must be identical to
      // the one a clean render produces, and no handler may carry a payload.
      const handlers = (markup: string) => Array.from(
        new DOMParser().parseFromString(markup, 'text/html').querySelectorAll('*'))
        .flatMap(el => Array.from(el.attributes)
          .filter(a => a.name.toLowerCase().startsWith('on'))
          .map(a => `${el.tagName}[${a.name}]`));

      // A subset rather than an equality: hostile values sanitize down to
      // empty strings, and some blocks (the editable description) are not
      // rendered at all when their field is empty, so the hostile render
      // legitimately has fewer handlers than the clean one. What must never
      // happen is a handler appearing that the clean render does not have.
      const clean = new Set(handlers(generateCardCanvas(employee(), CONFIG, type, 'portrait', 'pt')));
      expect(handlers(html).filter(h => !clean.has(h)), `${type} gained an event handler from input`).toEqual([]);

      const handlerValues = Array.from(doc.querySelectorAll('*'))
        .flatMap(el => Array.from(el.attributes))
        .filter(a => a.name.toLowerCase().startsWith('on'))
        .map(a => a.value);
      expect(handlerValues.filter(v => /alert\(/.test(v)), `${type} handler carries a payload`).toEqual([]);

      expect(doc.querySelectorAll('script').length, `${type} emitted a script`).toBe(0);

      const urls = Array.from(doc.querySelectorAll('[src], [href]'))
        .map(el => el.getAttribute('src') || el.getAttribute('href') || '');
      expect(urls.filter(u => /^\s*javascript:/i.test(u)), `${type} emitted a javascript: URL`).toEqual([]);

      // The payload should still be visible as inert text, not vanish --
      // a name must survive sanitizing or the card loses the person.
      // Case-insensitive: the signature card renders names uppercased.
      if (NAMED_TEMPLATES.includes(type)) {
        expect(doc.body.textContent?.toLowerCase(), `${type} dropped the name entirely`).toContain('amanda');
      }
    }
  });
});

describe('See You Soon group layout', () => {
  const groupHtml = (n: number, orientation: Orientation = 'portrait') =>
    generateCardCanvas(roster(n), CONFIG, TemplateType.FAREWELL, orientation, 'pt');

  const tileCount = (html: string) => (html.match(/data-pannable=/g) || []).length;
  const cardHeight = (html: string) => Number(/height: (\d+)px; background/.exec(html)?.[1]);

  it('caps at ten people however many are passed', () => {
    expect(tileCount(groupHtml(10))).toBe(10);
    expect(tileCount(groupHtml(25))).toBe(10);
  });

  it('renders exactly the people it was given below the cap', () => {
    for (const n of [1, 2, 5, 7]) expect(tileCount(groupHtml(n))).toBe(n);
  });

  it('is never shorter than the single-person card of the same orientation', () => {
    for (let n = 1; n <= 10; n++) {
      expect(cardHeight(groupHtml(n, 'portrait')), `${n} portrait`).toBeGreaterThanOrEqual(540);
      expect(cardHeight(groupHtml(n, 'landscape')), `${n} landscape`).toBeGreaterThanOrEqual(360);
    }
  });

  it('grows downward rather than shrinking tiles past six people in portrait', () => {
    // Two columns up to six, three after: the card gets taller instead of the
    // faces getting smaller, which is the whole point of the breakpoint.
    expect(cardHeight(groupHtml(6))).toBeGreaterThan(cardHeight(groupHtml(2)));
  });

  it('marks each tile with its own employee so the editor can target it', () => {
    const html = groupHtml(4);
    for (let i = 1; i <= 4; i++) expect(html).toContain(`data-emp-id="emp-fixture-${i}"`);
  });

  it('publishes a pan ratio below 1 so the joystick can compensate', () => {
    const ratio = Number(/data-pan-ratio="([\d.]+)"/.exec(groupHtml(6))?.[1]);
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThan(1);
  });
});
