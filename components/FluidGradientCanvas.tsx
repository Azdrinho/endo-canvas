import React, { useEffect, useRef } from 'react';

// Real "aurora" gradient: a live linear gradient (the header's exact
// cyan/purple/darker-cyan pair) fills the canvas every frame as the base —
// never a flat dark backdrop — and several soft color masses are layered on
// top with `globalCompositeOperation: 'lighter'` (additive blending), each
// moving along its own combination of sine/cosine waves with irrational-ish
// frequency ratios so the motion never feels like it loops or syncs up.
// Wherever two masses overlap they genuinely glow brighter — this is real
// per-frame computation, not a single CSS gradient shape being nudged around.
const COLORS = ['#22d3ee', '#594B98', '#06b6d4', '#7c5cbf', '#22d3ee'];

interface Blob {
  color: string;
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

    const blobs: Blob[] = COLORS.map((color, i) => ({
      color,
      fx: 0.00035 + i * 0.00021,
      fy: 0.00028 + i * 0.00026,
      phaseX: i * 1.7 + 0.4,
      phaseY: i * 2.3 + 1.1,
      ampX: 0.3 + (i % 3) * 0.06,
      ampY: 0.26 + ((i + 1) % 3) * 0.06,
      baseX: [0.28, 0.72, 0.5, 0.2, 0.8][i],
      baseY: [0.32, 0.28, 0.7, 0.75, 0.62][i],
      radius: 0.36 + (i % 2) * 0.06,
    }));

    const start = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, width, height);
      // Base is always a live gradient (never a flat dark backdrop) — the
      // animated blobs below layer extra glow/movement on top of it.
      const baseGrad = ctx.createLinearGradient(0, 0, width, height);
      baseGrad.addColorStop(0, '#22d3ee');
      baseGrad.addColorStop(0.5, '#594B98');
      baseGrad.addColorStop(1, '#06b6d4');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'lighter';
      const maxDim = Math.max(width, height);
      for (const b of blobs) {
        const cx = (b.baseX + Math.sin(t * b.fx + b.phaseX) * b.ampX) * width;
        const cy = (b.baseY + Math.cos(t * b.fy + b.phaseY) * b.ampY) * height;
        const r = b.radius * maxDim;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, b.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

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
