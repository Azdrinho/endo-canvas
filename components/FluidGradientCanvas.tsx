import React, { useEffect, useRef } from 'react';

// Recreation of the "flow" blend exported from feralui.dev/gradients:
//
//   PALE LAGOON #6FD8F2 @ 0.25  ->  EDO PURPLE #745399 @ 0.75
//   divider 0.5 · soften 0 · noise 6 · speed 30
//
// Drawn per frame on a canvas: a slowly rotating two-stop base gradient,
// warped by soft masses of those same two colors drifting along their own
// sine/cosine paths, finished with fine grain. The masses use normal alpha
// blending rather than additive — with only two hues, additive blending
// washes the overlaps out to white instead of reading as cyan <-> purple.
const PALE_LAGOON = { r: 111, g: 216, b: 242 };
const EDO_PURPLE = { r: 116, g: 83, b: 153 };
// Stop positions from the export: the outer quarter of the axis stays solid
// on each end, and the blend happens across the middle half.
const STOP_A = 0.25;
const STOP_B = 0.75;
// Export values are 0-100; scaled here to the units each one drives.
const NOISE_ALPHA = 6 / 100;
const SPEED = 30 / 100;

const rgb = (c: { r: number; g: number; b: number }) => `rgb(${c.r}, ${c.g}, ${c.b})`;
const rgba = (c: { r: number; g: number; b: number }, a: number) => `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;

interface Mass {
  color: { r: number; g: number; b: number };
  alpha: number;
  fx: number;
  fy: number;
  phaseX: number;
  phaseY: number;
  ampX: number;
  ampY: number;
  baseX: number;
  baseY: number;
  radius: number;
}

// Alternating hues so neither color ever fully takes over the field, on
// irrational-ish frequency ratios so the motion never visibly loops. Purple
// carries slightly more weight — and holds the middle — because the pale
// lagoon end is so much lighter that an even split reads as a cyan wash with
// purple only in the corners.
const MASSES: Mass[] = [
  { color: PALE_LAGOON, alpha: 0.75, fx: 0.31, fy: 0.24, phaseX: 0.4, phaseY: 1.1, ampX: 0.30, ampY: 0.26, baseX: 0.22, baseY: 0.24, radius: 0.50 },
  { color: EDO_PURPLE, alpha: 0.85, fx: 0.23, fy: 0.33, phaseX: 2.1, phaseY: 0.3, ampX: 0.28, ampY: 0.30, baseX: 0.78, baseY: 0.30, radius: 0.55 },
  { color: EDO_PURPLE, alpha: 0.75, fx: 0.19, fy: 0.27, phaseX: 3.7, phaseY: 2.4, ampX: 0.32, ampY: 0.24, baseX: 0.30, baseY: 0.78, radius: 0.50 },
  { color: PALE_LAGOON, alpha: 0.60, fx: 0.27, fy: 0.21, phaseX: 5.2, phaseY: 3.9, ampX: 0.26, ampY: 0.28, baseX: 0.74, baseY: 0.76, radius: 0.45 },
  { color: EDO_PURPLE, alpha: 0.45, fx: 0.15, fy: 0.37, phaseX: 1.6, phaseY: 4.8, ampX: 0.34, ampY: 0.22, baseX: 0.52, baseY: 0.50, radius: 0.44 },
];

export const FluidGradientCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Grain is a single small tile of random greys, built once and repeated —
    // regenerating noise per frame across the full viewport would cost far
    // more than the effect is worth.
    const grainTile = document.createElement('canvas');
    grainTile.width = 128;
    grainTile.height = 128;
    const grainCtx = grainTile.getContext('2d');
    let grainPattern: CanvasPattern | null = null;
    if (grainCtx) {
      const img = grainCtx.createImageData(128, 128);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      grainCtx.putImageData(img, 0, 0);
      grainPattern = ctx.createPattern(grainTile, 'repeat');
    }

    const start = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      // Seconds since mount, scaled by the export's speed value.
      const t = ((now - start) / 1000) * SPEED;

      // Base gradient, its axis rotating slowly so the blend direction drifts.
      const cx = width / 2;
      const cy = height / 2;
      const angle = Math.PI * 0.25 + Math.sin(t * 0.35) * 0.4;
      const reach = Math.max(width, height) * 0.75;
      const dx = Math.cos(angle) * reach;
      const dy = Math.sin(angle) * reach;
      const base = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
      base.addColorStop(0, rgb(PALE_LAGOON));
      base.addColorStop(STOP_A, rgb(PALE_LAGOON));
      base.addColorStop(STOP_B, rgb(EDO_PURPLE));
      base.addColorStop(1, rgb(EDO_PURPLE));
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, width, height);

      const maxDim = Math.max(width, height);
      for (const m of MASSES) {
        const x = (m.baseX + Math.sin(t * m.fx * Math.PI * 2 + m.phaseX) * m.ampX) * width;
        const y = (m.baseY + Math.cos(t * m.fy * Math.PI * 2 + m.phaseY) * m.ampY) * height;
        const r = m.radius * maxDim;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(m.color, m.alpha));
        g.addColorStop(0.55, rgba(m.color, m.alpha * 0.45));
        g.addColorStop(1, rgba(m.color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (grainPattern) {
        // Shifted on a ~12fps step rather than every frame: at 60fps the grain
        // reads as harsh static instead of film grain.
        const step = Math.floor(now / 83);
        const ox = (step * 37) % 128;
        const oy = (step * 61) % 128;
        ctx.save();
        ctx.globalAlpha = NOISE_ALPHA;
        ctx.globalCompositeOperation = 'overlay';
        ctx.translate(-ox, -oy);
        ctx.fillStyle = grainPattern;
        ctx.fillRect(0, 0, width + 128, height + 128);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0" />;
};
