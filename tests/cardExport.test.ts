import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateCardCanvas } from '../services/emailTemplate';
import { neutralizeBackdropFilters, withCorsSafePhotos, withOffscreenContainer } from '../services/cardExport';
import { TemplateType } from '../types';
import { CONFIG, employee } from './fixtures';

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('mounting a generated card', () => {
  // The regression this guards: generateCardCanvas returns a whole HTML
  // document, so innerHTML leaves [meta, meta, style, div#capture-target].
  // Both batch exporters took firstElementChild -- the first <meta>, which
  // has no size -- so every card in a ZIP or consolidated PDF exported as an
  // empty image.
  it('does not put the card first in the fragment', () => {
    const host = document.createElement('div');
    host.innerHTML = generateCardCanvas(employee(), CONFIG, TemplateType.BIRTHDAY, 'portrait', 'pt');
    expect(host.firstElementChild?.tagName).not.toBe('DIV');
  });

  it('finds the card by id for every template', () => {
    for (const type of Object.values(TemplateType)) {
      const host = document.createElement('div');
      host.innerHTML = generateCardCanvas(employee(), CONFIG, type, 'portrait', 'pt');
      expect(host.querySelector('#capture-target'), `${type}`).not.toBeNull();
    }
  });

  it('keeps the document style in the fragment, which carries the fonts', () => {
    const host = document.createElement('div');
    host.innerHTML = generateCardCanvas(employee(), CONFIG, TemplateType.BIRTHDAY, 'portrait', 'pt');
    const styles = Array.from(host.querySelectorAll('style')).map(s => s.textContent || '').join('');
    expect(styles).toContain('akira-font');
  });
});

describe('neutralizeBackdropFilters', () => {
  it('drops the filter and compensates the background opacity', () => {
    const el = document.createElement('div');
    el.setAttribute('style', 'backdrop-filter: blur(12px); background: rgba(10, 20, 30, 0.4);');
    neutralizeBackdropFilters(el);
    expect(el.style.backdropFilter).toBe('none');
    expect(el.style.background).toContain('0.75');
  });

  it('leaves elements without a backdrop filter alone', () => {
    const el = document.createElement('div');
    el.setAttribute('style', 'background: rgba(10, 20, 30, 0.4);');
    neutralizeBackdropFilters(el);
    expect(el.style.background).toContain('0.4');
  });

  it('reaches descendants, not just the root', () => {
    const root = document.createElement('div');
    root.innerHTML = '<span style="backdrop-filter: blur(4px);"></span>';
    neutralizeBackdropFilters(root);
    expect((root.firstElementChild as HTMLElement).style.backdropFilter).toBe('none');
  });
});

describe('withOffscreenContainer', () => {
  it('removes the container after the work succeeds', async () => {
    await withOffscreenContainer(async (c) => { c.innerHTML = '<p>x</p>'; });
    expect(document.body.children.length).toBe(0);
  });

  it('removes it after the work throws, instead of leaking a card into the DOM', async () => {
    await expect(withOffscreenContainer(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(document.body.children.length).toBe(0);
  });
});

describe('withCorsSafePhotos', () => {
  it('leaves readable photos untouched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })));
    const [out] = await withCorsSafePhotos([employee({ photoUrl: 'https://ok.test/a.png' })]);
    expect(out.photoUrl).toBe('https://ok.test/a.png');
  });

  it('routes a blocked photo through the proxy', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('CORS'); }));
    const [out] = await withCorsSafePhotos([employee({ photoUrl: 'https://blocked.test/a.png' })]);
    expect(out.photoUrl).toContain('images.weserv.nl');
    expect(out.photoUrl).toContain(encodeURIComponent('https://blocked.test/a.png'));
  });

  it('never probes a data URL', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const [out] = await withCorsSafePhotos([employee({ photoUrl: 'data:image/png;base64,AAAA' })]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(out.photoUrl).toBe('data:image/png;base64,AAAA');
  });

  it('checks the roster in parallel rather than one request at a time', async () => {
    let inFlight = 0;
    let peak = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      peak = Math.max(peak, ++inFlight);
      await new Promise(r => setTimeout(r, 5));
      inFlight--;
      return { ok: true };
    }));
    await withCorsSafePhotos(Array.from({ length: 6 }, (_, i) =>
      employee({ id: `e${i}`, photoUrl: `https://ok.test/${i}.png` })));
    expect(peak).toBeGreaterThan(1);
  });
});
