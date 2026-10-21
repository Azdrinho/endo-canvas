import { toPng, toJpeg } from 'html-to-image';
import { Employee } from '../types';

// The rendering half of exporting a card, pulled out of App.tsx where three
// handlers -- single download, batch ZIP and batch PDF -- each carried their
// own copy of it. Roughly 350 lines said the same thing three times, which
// meant every fix to a capture bug had to be made three times and in practice
// sometimes was not.
//
// The three still differ in what they do with the result; they no longer
// differ in how the pixels are produced.

export interface CaptureOptions {
  /** 'png' | 'jpeg'. PDF callers capture a PNG and place it themselves. */
  format?: 'png' | 'jpeg';
}

const CAPTURE_SETTINGS = {
  quality: 1.0,
  // Twice the CSS size: these cards get printed and posted at full width, and
  // 1x renders visibly soft.
  pixelRatio: 2,
  // Left off deliberately. html-to-image's cache busting appends a query
  // string to every image URL, which breaks the CORS preflight the proxied
  // URLs below depend on and defeats the browser cache on a batch where the
  // same logo appears on every card.
  cacheBust: false,
  skipAutoScale: true,
};

/**
 * html-to-image renders `backdrop-filter` incorrectly: the blur bleeds past
 * the element's border radius. Dropping the filter and compensating with a
 * more opaque background is closer to the on-screen result than the artifact
 * would be. Mutates the nodes, so it is only ever run on a clone.
 */
export const neutralizeBackdropFilters = (root: HTMLElement): void => {
  const nodes = Array.from(root.querySelectorAll('*')) as HTMLElement[];
  nodes.push(root);
  for (const el of nodes) {
    const style = el.getAttribute('style') || '';
    if (!style.includes('backdrop-filter') && !style.includes('-webkit-backdrop-filter')) continue;
    el.style.backdropFilter = 'none';
    el.style.setProperty('-webkit-backdrop-filter', 'none');
    if (el.style.background && el.style.background.includes('rgba')) {
      el.style.background = el.style.background.replace(
        /rgba\(([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/,
        (_match, r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${Math.min(parseFloat(a) + 0.35, 0.95)})`,
      );
    }
  }
};

/**
 * Replace every remote image reference inside the clone with a data URL, for
 * both <img src> and inline background-image. html-to-image cannot read a
 * cross-origin image off the canvas, so anything left remote exports blank.
 * Failures are swallowed on purpose: one unreachable image should cost that
 * image, not the whole export.
 */
export const inlineRemoteImages = async (root: HTMLElement): Promise<void> => {
  const asDataUrl = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url, { mode: 'cors', cache: 'no-cache' });
      const blob = await res.blob();
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const imgWork = Array.from(root.querySelectorAll('img')).map(async (img) => {
    if (!img.src || img.src.startsWith('data:')) return;
    const dataUrl = await asDataUrl(img.src);
    if (dataUrl) {
      img.src = dataUrl;
      img.srcset = '';
    } else {
      // Last resort: let the browser try an anonymous fetch itself.
      console.warn('[export] could not inline image, falling back to crossOrigin:', img.src);
      img.crossOrigin = 'anonymous';
    }
  });

  const backgroundNodes = Array.from(root.querySelectorAll('*')) as HTMLElement[];
  backgroundNodes.push(root);
  const bgWork = backgroundNodes.map(async (el) => {
    const match = (el.getAttribute('style') || '').match(/url\(['"]?(http[^'"]+)['"]?\)/);
    if (!match) return;
    const dataUrl = await asDataUrl(match[1]);
    if (dataUrl) el.style.backgroundImage = `url('${dataUrl}')`;
    else console.warn('[export] could not inline background:', match[1]);
  });

  await Promise.all([...imgWork, ...bgWork]);
};

/** Resolve once every <img> in the subtree has loaded or failed. */
export const waitForImages = async (root: HTMLElement): Promise<void> => {
  await Promise.all(Array.from(root.querySelectorAll('img')).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }));
};

/**
 * Run `work` with an offscreen container mounted, and take it down afterwards
 * however `work` ends. The container was previously removed on the success
 * path only, so a failed export leaked a full card into the DOM every time.
 */
export const withOffscreenContainer = async <T>(
  work: (container: HTMLElement) => Promise<T>,
): Promise<T> => {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-1';
  document.body.appendChild(container);
  try {
    return await work(container);
  } finally {
    container.remove();
  }
};

/**
 * Capture a mounted node. The node must already be in the document.
 * Waits on document.fonts first -- capturing before the Orkney faces resolve
 * exports the fallback font, and only the single-card path used to check.
 * It is an already-settled promise in the common case.
 */
export const captureNode = async (
  node: HTMLElement,
  { format = 'png' }: CaptureOptions = {},
): Promise<string> => {
  await document.fonts.ready;
  return format === 'jpeg' ? toJpeg(node, CAPTURE_SETTINGS) : toPng(node, CAPTURE_SETTINGS);
};

/**
 * Mount a card's HTML offscreen, prepare it and capture it. Used by the batch
 * exporters, which build each card's markup from scratch rather than cloning
 * what is on the canvas.
 */
export const captureCardHtml = async (
  container: HTMLElement,
  html: string,
  options: CaptureOptions = {},
): Promise<{ dataUrl: string; width: number; height: number } | null> => {
  // generateCardCanvas returns a whole HTML document. Assigning that to
  // innerHTML makes the parser drop the <html>/<head>/<body> wrappers but
  // keep their children, so the container ends up holding
  // [meta, meta, style, div#capture-target].
  //
  // Both batch exporters used to take firstElementChild here, which is the
  // first <meta> -- a zero-size node. html-to-image duly captured nothing and
  // every card in a ZIP or consolidated PDF came out as the empty data URL
  // "data:,". Picking the card by id fixes that; mounting the whole fragment
  // rather than the card alone keeps the document's <style> in the tree,
  // which is where the Orkney faces and .akira-font live.
  container.innerHTML = html;
  const node = (container.querySelector('#capture-target')
    || container.lastElementChild) as HTMLElement | null;
  if (!node || !node.style) return null;

  // Rounding on the outermost element clips the capture; inner radii are fine.
  node.style.borderRadius = '0';
  neutralizeBackdropFilters(node);

  await waitForImages(node);
  // Lets the browser finish laying the card out before it is read back.
  await new Promise((resolve) => setTimeout(resolve, 100));

  return { dataUrl: await captureNode(node, options), width: node.offsetWidth, height: node.offsetHeight };
};

/**
 * True when the image can be read cross-origin. A HEAD request is enough and
 * avoids pulling the bytes twice.
 */
export const isCorsReadable = async (url: string): Promise<boolean> => {
  if (!url || url.startsWith('data:') || !url.startsWith('http')) return true;
  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'cors' });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Route photos the browser cannot read cross-origin through an image proxy,
 * so one restrictive host does not blank out a whole batch. Checked in
 * parallel: serially this added a round trip per employee to every export.
 */
export const withCorsSafePhotos = async (employees: Employee[]): Promise<Employee[]> =>
  Promise.all(employees.map(async (emp) => {
    if (!emp.photoUrl || await isCorsReadable(emp.photoUrl)) return emp;
    console.warn(`[export] routing ${emp.name}'s photo through the image proxy (restrictive CORS)`);
    return { ...emp, photoUrl: `https://images.weserv.nl/?url=${encodeURIComponent(emp.photoUrl)}` };
  }));
