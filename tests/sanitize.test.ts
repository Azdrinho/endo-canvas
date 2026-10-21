import { describe, expect, it } from 'vitest';
import { sanitizeEmployee, sanitizeLinks, sanitizePlainText, sanitizeRichText, sanitizeUrl } from '../services/sanitize';
import { employee } from './fixtures';

// These guard the fix for stored XSS through the shared employee table. The
// hard part is not blocking scripts -- it is blocking them without eating the
// formatting the on-card editor legitimately produces, so both directions are
// asserted.
describe('sanitizeRichText', () => {
  it('strips an event handler but keeps the surrounding text', () => {
    const out = sanitizeRichText('<img src=x onerror="alert(1)">Amanda');
    expect(out).not.toMatch(/onerror/i);
    expect(out).not.toMatch(/<img/i);
    expect(out).toContain('Amanda');
  });

  it('drops a script element and its contents, keeping the rest', () => {
    const out = sanitizeRichText('<script>steal()</script>Designer');
    expect(out).toBe('Designer');
  });

  it('keeps the inline formatting the card toolbar writes', () => {
    expect(sanitizeRichText('<b>negrito</b>')).toBe('<b>negrito</b>');
    expect(sanitizeRichText('<i>itálico</i>')).toBe('<i>itálico</i>');
    expect(sanitizeRichText('<span style="color: rgb(255,0,0)">cor</span>'))
      .toContain('style="color: rgb(255,0,0)"');
  });

  it('removes links, which no card renders from user text', () => {
    expect(sanitizeRichText('<a href="https://evil.test">x</a>')).toBe('x');
  });

  it('is empty for nullish input so callers can interpolate it directly', () => {
    expect(sanitizeRichText(undefined)).toBe('');
    expect(sanitizeRichText(null)).toBe('');
  });
});

describe('sanitizePlainText', () => {
  it('removes all markup', () => {
    expect(sanitizePlainText('<b>12</b>/06')).toBe('12/06');
  });
});

describe('sanitizeUrl', () => {
  it('rejects schemes that can execute', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('  JaVaScRiPt:alert(1)')).toBe('');
    expect(sanitizeUrl('vbscript:x')).toBe('');
  });

  it('accepts the schemes cards and signatures actually use', () => {
    expect(sanitizeUrl('https://cdn.test/a.png')).toBe('https://cdn.test/a.png');
    expect(sanitizeUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
    expect(sanitizeUrl('mailto:a@b.test')).toBe('mailto:a@b.test');
    expect(sanitizeUrl('/local.png')).toBe('/local.png');
  });

  it('rejects a data URL that is not an image', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('encodes what would break out of the attribute', () => {
    expect(sanitizeUrl('https://x.test/a?w=1&h=2')).toBe('https://x.test/a?w=1&amp;h=2');
    expect(sanitizeUrl('https://x.test/"onload="alert(1)')).not.toContain('"onload');
  });
});

describe('sanitizeEmployee', () => {
  it('cleans every user-supplied field at once', () => {
    const dirty = employee({
      name: '<img src=x onerror=alert(1)>Amanda',
      role: '<script>x()</script>PM',
      tenure: '<b>4</b> ANOS',
      photoUrl: 'javascript:alert(1)',
    });
    const safe = sanitizeEmployee(dirty);
    expect(safe.name).toBe('Amanda');
    expect(safe.role).toBe('PM');
    expect(safe.tenure).toBe('4 ANOS');
    expect(safe.photoUrl).toBe('');
  });

  it('does not mutate the employee it was given', () => {
    const dirty = employee({ name: '<script>x()</script>Amanda' });
    sanitizeEmployee(dirty);
    expect(dirty.name).toBe('<script>x()</script>Amanda');
  });
});

describe('sanitizeLinks', () => {
  it('drops entries whose URL is unsafe rather than emptying them', () => {
    expect(sanitizeLinks({ linkedin: 'https://in.test/a', evil: 'javascript:alert(1)' }))
      .toEqual({ linkedin: 'https://in.test/a' });
  });
});
