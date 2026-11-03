import React from 'react';
import type { BrandKey, Format } from '../types';
import { BrandMark } from '../../design/BrandMark';
import { space } from '../../design/brand';

// --- SAFE AREAS -------------------------------------------------------------
//
// The brand mark used to be dropped at `top: gutter, left: gutter` and the
// content positioned separately, each trusting the other to stay out of the
// way. They did not: once a group card held four people the band shrank, the
// headline climbed, and it ran straight through the logo — ten such
// collisions across the formats, none of which a markup-only test could see.
//
// So the mark now owns a reserved slot and the content region is computed to
// exclude it. A template cannot place anything into that slot by accident,
// because it never receives those coordinates.

export interface Frame {
  /** Usable area, already inset by the margin and clear of the mark. */
  content: { top: number; right: number; bottom: number; left: number; width: number; height: number };
  /** Page margin in card pixels. */
  margin: number;
  short: number;
  long: number;
  isWide: boolean;
  isTall: boolean;
}

export type MarkSlot = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export const frameFor = (format: Format, slot: MarkSlot = 'top-left', markWidth?: number): Frame => {
  const short = Math.min(format.width, format.height);
  const margin = Math.round(short * 0.072);
  const mw = markWidth ?? short * 0.17;
  const mh = mw * 0.45;
  // The band the mark occupies, plus breathing room beneath it.
  const reserved = mh + Math.round(short * 0.035);

  const top = slot.startsWith('top') ? margin + reserved : margin;
  const bottom = slot.startsWith('bottom') ? margin + reserved : margin;

  return {
    content: {
      top,
      right: margin,
      bottom,
      left: margin,
      width: format.width - margin * 2,
      height: format.height - top - bottom,
    },
    margin,
    short,
    long: Math.max(format.width, format.height),
    isWide: format.width > format.height * 1.15,
    isTall: format.height > format.width * 1.15,
  };
};

/** The brand mark in its reserved slot. Nothing else may be placed here. */
export const Mark: React.FC<{
  brand: BrandKey;
  format: Format;
  slot?: MarkSlot;
  color?: string;
  width?: number;
}> = ({ brand, format, slot = 'top-left', color = '#FFFFFF', width }) => {
  const short = Math.min(format.width, format.height);
  const margin = Math.round(short * 0.072);
  const w = width ?? short * 0.17;
  const pos: React.CSSProperties = { position: 'absolute', zIndex: 40 };
  if (slot.startsWith('top')) pos.top = margin; else pos.bottom = margin;
  if (slot.endsWith('left')) pos.left = margin; else pos.right = margin;
  return <BrandMark brand={brand} width={w} color={color} style={pos} />;
};

// --- COMPOSITION PRIMITIVES -------------------------------------------------

/**
 * Display type that is meant to run past the card edge.
 *
 * Type cropped by the frame is the cheapest way to make a composition feel
 * like a window onto something larger rather than a slide with a heading on
 * it. The overflow is deliberate, so the card clips it and nothing reflows.
 */
export const Oversize: React.FC<{
  children: React.ReactNode;
  size: number;
  style?: React.CSSProperties;
}> = ({ children, size, style }) => (
  <div
    style={{
      position: 'absolute',
      fontSize: size,
      lineHeight: 0.82,
      letterSpacing: '-0.045em',
      whiteSpace: 'pre',
      pointerEvents: 'none',
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * A hard geometric cut for a photo. The shape doing the cropping is what
 * lets the portrait sit *over* the typography instead of beside it, which is
 * where the depth comes from.
 */
export const cutShape = (kind: 'arch' | 'circle' | 'blade' | 'none', radiusPx: number): React.CSSProperties => {
  switch (kind) {
    case 'arch':
      return { borderRadius: `${radiusPx}px ${radiusPx}px ${Math.round(radiusPx * 0.08)}px ${Math.round(radiusPx * 0.08)}px` };
    case 'circle':
      return { borderRadius: '50%' };
    case 'blade':
      return { clipPath: 'polygon(0 0, 100% 8%, 100% 100%, 0 92%)' };
    default:
      return {};
  }
};

/** A vertical kicker — small caps rotated onto the card's left or right edge. */
export const EdgeKicker: React.FC<{
  text: string;
  size: number;
  color: string;
  side?: 'left' | 'right';
  style?: React.CSSProperties;
}> = ({ text, size, color, side = 'left', style }) => (
  <div
    aria-hidden
    style={{
      position: 'absolute',
      writingMode: 'vertical-rl',
      transform: side === 'left' ? 'rotate(180deg)' : undefined,
      fontSize: size,
      letterSpacing: '0.42em',
      textTransform: 'uppercase',
      fontWeight: 700,
      color,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      ...style,
    }}
  >
    {text}
  </div>
);

/**
 * Tile sizes for a group of n people.
 *
 * A uniform grid of identical squares is a contact sheet, not a composition.
 * The first person is given a larger tile and the rest fall into a tighter
 * rhythm beside them, so the eye has somewhere to land. Past six people the
 * hero is dropped — at that point the group itself is the subject.
 */
export const groupRhythm = (n: number, width: number, height: number, gap: number) => {
  if (n === 1) return { kind: 'solo' as const };
  if (n <= 3) {
    // One hero on the left, the rest stacked at its side.
    const heroW = Math.round(width * (n === 2 ? 0.56 : 0.52));
    return {
      kind: 'hero' as const,
      heroW,
      restW: width - heroW - gap,
      restH: Math.round((height - gap * (n - 2)) / (n - 1)),
    };
  }
  const columns = n <= 6 ? 3 : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / columns);
  return {
    kind: 'grid' as const,
    columns,
    rows,
    tileW: Math.round((width - gap * (columns - 1)) / columns),
    tileH: Math.round((height - gap * (rows - 1)) / rows),
  };
};

export const layoutSpace = space;
