import { toPng } from 'html-to-image';

// Exporting, in one place and one pass.
//
// The previous build had three copies of this — single download, batch ZIP
// and batch PDF — each with its own cloning, CORS inlining and backdrop-filter
// workaround, so a fix to one never reached the other two. Two of the three
// were in fact capturing the wrong element entirely and had been shipping
// empty images for months without anyone noticing.

export interface ExportResult {
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Replace every remote image in the subtree with a data URL.
 *
 * A canvas cannot read a cross-origin image back out, so anything still
 * remote at capture time exports blank. One unreachable image costs that
 * image, not the whole card.
 */
const inlineImages = async (root: HTMLElement): Promise<void> => {
  await Promise.all(Array.from(root.querySelectorAll('img')).map(async (img) => {
    if (!img.src || img.src.startsWith('data:')) return;
    try {
      const res = await fetch(img.src, { mode: 'cors', cache: 'force-cache' });
      const blob = await res.blob();
      img.src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      img.srcset = '';
    } catch {
      console.warn('[export] could not inline, falling back to anonymous fetch:', img.src);
      img.crossOrigin = 'anonymous';
    }
  }));
};

/** Resolve once every image in the subtree has loaded or failed. */
const settleImages = (root: HTMLElement): Promise<unknown> =>
  Promise.all(Array.from(root.querySelectorAll('img')).map(img =>
    img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; img.onerror = res; })));

/**
 * Capture a card node exactly as it is laid out.
 *
 * pixelRatio is 1 on purpose: the card is already composed at its true output
 * size, so this is a 1:1 capture rather than an upscale of a small preview.
 */
export const captureCard = async (node: HTMLElement): Promise<ExportResult> => {
  await inlineImages(node);
  await settleImages(node);
  // Without this the Orkney faces may not have resolved and the capture bakes
  // in the fallback font.
  await document.fonts.ready;
  // One frame, so the inlined data URLs are decoded and painted.
  await new Promise(requestAnimationFrame);

  const width = node.offsetWidth;
  const height = node.offsetHeight;
  const dataUrl = await toPng(node, {
    width,
    height,
    pixelRatio: 1,
    cacheBust: false,
    skipAutoScale: true,
    style: {
      // The stage scales the node for display; the export must not inherit
      // that, or a card viewed at 38% exports at 38%.
      transform: 'none',
      transformOrigin: 'top left',
      margin: '0',
    },
  });

  return { dataUrl, width, height };
};

export const downloadDataUrl = (dataUrl: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
};

export const slugify = (value: string): string =>
  value
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'card';
