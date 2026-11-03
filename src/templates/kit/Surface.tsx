import React from 'react';
import { BRANDS, INK, gradient } from '../../design/brand';
import type { BrandKey, ThemeId } from '../types';

// The shared scenery every card is built on: the brand gradient, the spheres
// that have always been part of the Salsa language, and the grain that keeps
// a large flat gradient from banding.

export const paperFor = (theme: ThemeId) => (theme === 'dark' ? INK.carbon : INK.paper);
export const inkFor = (theme: ThemeId) => (theme === 'dark' ? INK.onCarbon : INK.onPaper);
export const mutedFor = (theme: ThemeId) => (theme === 'dark' ? INK.mutedOnCarbon : INK.mutedOnPaper);

/**
 * Film grain, as an inline SVG turbulence rather than a generated bitmap.
 * The old build rasterised a noise tile per card; this is a few hundred bytes,
 * resolution-independent, and survives an export at any scale.
 */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.06 }) => (
  <svg
    aria-hidden
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity, mixBlendMode: 'overlay' }}
  >
    <filter id="endo-grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#endo-grain)" />
  </svg>
);

interface SpheresProps {
  brand: BrandKey;
  /** Fraction of the card's short edge. */
  scale?: number;
  /** 0 = crisp, 1 = fully diffused. */
  softness?: number;
  shortEdge: number;
  variant?: 'corners' | 'arc' | 'orbit';
}

/**
 * The brand's spheres.
 *
 * Each sphere is a wrapper that carries the blur and an inner circle that
 * carries the fill, because CSS applies `filter` before `clip-path`: blurring
 * a clipped circle softens it and then cuts the result off at a hard edge,
 * which is the opposite of what a diffused sphere should look like.
 */
export const Spheres: React.FC<SpheresProps> = ({ brand, scale = 1, softness = 0, shortEdge, variant = 'corners' }) => {
  const b = BRANDS[brand];
  const base = shortEdge * 0.42 * scale;
  const blur = softness * shortEdge * 0.06;

  const layouts: Record<string, { size: number; top?: number; left?: number; right?: number; bottom?: number }[]> = {
    corners: [
      { size: base * 1.25, top: -base * 0.45, left: -base * 0.4 },
      { size: base * 0.8, bottom: -base * 0.3, right: -base * 0.25 },
    ],
    arc: [
      { size: base * 1.9, top: -base * 1.1, right: -base * 0.6 },
      { size: base * 0.5, bottom: base * 0.15, left: base * 0.1 },
    ],
    orbit: [
      { size: base * 1.5, top: -base * 0.6, right: -base * 0.7 },
      { size: base * 0.9, bottom: -base * 0.5, left: -base * 0.35 },
      { size: base * 0.35, top: base * 0.5, left: base * 0.25 },
    ],
  };

  return (
    <>
      {layouts[variant].map((s, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: 'absolute',
            width: s.size, height: s.size,
            top: s.top, left: s.left, right: s.right, bottom: s.bottom,
            filter: blur ? `blur(${blur}px)` : undefined,
            pointerEvents: 'none',
          }}
        >
          <div style={{
            width: '100%', height: '100%', borderRadius: '50%',
            background: `linear-gradient(135deg, ${b.from} 0%, ${b.to} 100%)`,
            opacity: 0.9,
          }} />
        </div>
      ))}
    </>
  );
};

/**
 * A full-bleed brand gradient panel. `sweep` adds the soft radial highlight
 * that keeps a 1080px gradient from reading as a flat two-stop ramp.
 */
export const GradientField: React.FC<{
  brand: BrandKey;
  angle?: number;
  sweep?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ brand, angle = 135, sweep = true, style, children }) => {
  const b = BRANDS[brand];
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: gradient(brand, angle), ...style }}>
      {sweep && (
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: '-20%',
            background: `radial-gradient(60% 55% at 28% 22%, ${b.from}B3 0%, transparent 62%)`,
            pointerEvents: 'none',
          }}
        />
      )}
      {children}
    </div>
  );
};

/** The small pepper mark that sits in a card corner. */
export const PepperMark: React.FC<{ size: number; color?: string; style?: React.CSSProperties }> = ({
  size, color = '#FFFFFF', style,
}) => (
  <svg viewBox="0 0 40 56" width={size} height={size * 1.4} aria-hidden style={{ display: 'block', ...style }}>
    <path
      fill={color}
      d="M31.6 12.9c-2.6-2-6-2.6-9.1-1.7.6-3.6-.7-7.3-3.6-9.6-.6-.5-1.5-.4-2 .2-.5.6-.4 1.5.2 2 2.4 1.9 3.3 5.1 2.4 8-2.9-1.4-6.3-1.3-9.1.3C6.4 14.6 4 20.4 5.6 27.4c1.5 6.6 6.2 13.8 12 18.3 1 .8 2.4.8 3.4 0 5.8-4.5 10.5-11.7 12-18.3 1.3-5.8-.2-11.4-1.4-14.5z"
    />
  </svg>
);
