import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

// Display type that actually fits the space it is given.
//
// The previous version guessed a font size from the character count:
//
//     size = contentWidth / longestWord.length * 1.78
//
// That constant is a property of one typeface at one weight, and it is wrong
// for every other string. On a landscape card "WELCOME ABOARD" came out at
// roughly 500px a line and ran clean off both edges, unreadable — the
// headline was twice the width of the card it was supposed to sit inside.
//
// This measures instead. The text is laid out at a nominal size on a canvas,
// the ratio to the target width is taken, and the result is clamped so a
// two-line headline can never exceed the band it was allotted. Guessing is
// what produced the mess; measuring is the fix.

interface FitTextProps {
  text: string;
  /** Width the text must fit into, in card pixels. */
  width: number;
  /** Ceiling for the block's total height. Lines shrink to respect it. */
  maxHeight?: number;
  /** Hard ceiling on a single line, so a short word does not become absurd. */
  maxSize?: number;
  weight?: number;
  family: string;
  color: string;
  lineHeight?: number;
  letterSpacing?: string;
  /** Wrap into at most this many lines. */
  maxLines?: number;
  /**
   * Perspective tilt, -1..1. One number drives the whole 3D angle so the
   * result stays coherent instead of needing three sliders that can be set
   * against each other.
   *
   * The free edge always recedes, never approaches: receding shrinks the
   * block inward, so a tilted headline cannot grow past the margins the
   * layout audit checks. The sign only picks which edge stays pinned.
   */
  tilt?: number;
  style?: React.CSSProperties;
  children?: never;
}

/** Shared offscreen context. Creating one per measurement is wasteful. */
let ctx: CanvasRenderingContext2D | null | undefined;
const measureCtx = () => {
  if (ctx !== undefined) return ctx;
  try {
    ctx = document.createElement('canvas').getContext('2d');
  } catch {
    ctx = null;
  }
  return ctx;
};

const NOMINAL = 100;

/** Width of `text` at font-size 100, or null when no canvas is available. */
const widthAt100 = (text: string, weight: number, family: string, letterSpacing: string): number | null => {
  const c = measureCtx();
  if (!c) return null;
  c.font = `${weight} ${NOMINAL}px ${family}`;
  // letterSpacing is supported in Chromium; where it is not, the tracking is
  // simply not accounted for, which errs slightly large and is then clamped.
  try { (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = letterSpacing; } catch { /* ignore */ }
  const w = c.measureText(text).width;
  return w > 0 ? w : null;
};

/** Greedy wrap into at most `maxLines`, balancing the last two lines. */
const wrapInto = (text: string, maxLines: number): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  if (maxLines <= 1 || words.length <= 1) return [text];

  // Split at the point that makes the longest line as short as possible,
  // which is what keeps a two-line headline looking set rather than broken.
  let best: string[] = [words.join(' ')];
  let bestCost = Infinity;
  for (let cut = 1; cut < words.length; cut++) {
    const a = words.slice(0, cut).join(' ');
    const b = words.slice(cut).join(' ');
    const cost = Math.max(a.length, b.length);
    if (cost < bestCost) { bestCost = cost; best = [a, b]; }
  }
  return best.slice(0, maxLines);
};

export const FitText: React.FC<FitTextProps> = ({
  text, width, maxHeight, maxSize, weight = 700, family, color,
  lineHeight = 0.86, letterSpacing = '-0.03em', maxLines = 2, tilt = 0, style,
}) => {
  const lines = useMemo(() => wrapInto(text, maxLines), [text, maxLines]);

  // Measured on mount and whenever the inputs change. Rendering once at the
  // estimate and correcting on the same frame avoids a visible jump.
  const [size, setSize] = useState(() => estimate(lines, width, maxSize, maxHeight, lineHeight));
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const longest = lines.reduce((a, l) => (l.length > a.length ? l : a), '');
    const w100 = widthAt100(longest, weight, family, letterSpacing);
    if (!w100) return;
    let next = (width / w100) * NOMINAL;
    if (maxSize) next = Math.min(next, maxSize);
    if (maxHeight) next = Math.min(next, maxHeight / (lines.length * lineHeight));
    setSize(Math.max(8, Math.floor(next)));
  }, [lines, width, maxSize, maxHeight, lineHeight, weight, family, letterSpacing]);

  const amount = Math.max(-1, Math.min(1, tilt));
  const perspective = Math.round(width * 1.6);
  const tilted = amount !== 0 ? {
    transformOrigin: amount > 0 ? 'left center' : 'right center',
    transform: `perspective(${perspective}px) rotateY(${-amount * 22}deg) rotateX(${Math.abs(amount) * 6}deg)`,
    transformStyle: 'preserve-3d' as const,
  } : undefined;

  return (
    <div
      ref={ref}
      style={{
        fontFamily: family,
        fontWeight: weight,
        fontSize: size,
        lineHeight,
        letterSpacing,
        color,
        // The measurement is of the exact string, so nothing may re-wrap it.
        whiteSpace: 'pre',
        ...tilted,
        ...style,
      }}
    >
      {lines.join('\n')}
    </div>
  );
};

/**
 * Pre-measurement estimate, also the value used when there is no canvas
 * (server-rendered tests). Deliberately conservative: it is better to come in
 * small and grow on measurement than to flash a headline wider than the card.
 */
const estimate = (
  lines: string[], width: number, maxSize?: number, maxHeight?: number, lineHeight = 0.86,
): number => {
  const longest = lines.reduce((a, l) => (l.length > a.length ? l : a), '');
  // ~0.58em average advance for a bold grotesque, which errs small.
  let size = width / Math.max(longest.length * 0.58, 1);
  if (maxSize) size = Math.min(size, maxSize);
  if (maxHeight) size = Math.min(size, maxHeight / (lines.length * lineHeight));
  return Math.max(8, Math.floor(size));
};
