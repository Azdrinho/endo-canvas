import React, { useEffect, useRef } from 'react';

interface NetworkBackgroundProps {
  // The element the grid should treat as a solid obstacle — dots inside its
  // (padded) bounding box fade out / get nudged aside, so the field visibly
  // "reacts" to the card sitting on top of it.
  cardRef: React.RefObject<HTMLDivElement>;
}

const GRID_SIZE = 26;
const MOUSE_RADIUS = 90;
const CARD_PADDING = 36;

interface Dot {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  phase: number;
}

export const NetworkBackground: React.FC<NetworkBackgroundProps> = ({ cardRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const dotsRef = useRef<Dot[]>([]);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(performance.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Same grid-of-dots layout as before, just given motion.
      const dots: Dot[] = [];
      for (let y = GRID_SIZE / 2; y < height + GRID_SIZE; y += GRID_SIZE) {
        for (let x = GRID_SIZE / 2; x < width + GRID_SIZE; x += GRID_SIZE) {
          dots.push({ x, y, baseX: x, baseY: y, phase: Math.random() * Math.PI * 2 });
        }
      }
      dotsRef.current = dots;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const animate = (now: number) => {
      const t = (now - startRef.current) / 1000;
      ctx.clearRect(0, 0, width, height);

      const cardEl = cardRef.current;
      let cardRect: { left: number; top: number; right: number; bottom: number } | null = null;
      if (cardEl) {
        const cRect = cardEl.getBoundingClientRect();
        const pRect = canvas.getBoundingClientRect();
        cardRect = {
          left: cRect.left - pRect.left - CARD_PADDING,
          top: cRect.top - pRect.top - CARD_PADDING,
          right: cRect.right - pRect.left + CARD_PADDING,
          bottom: cRect.bottom - pRect.top + CARD_PADDING,
        };
      }

      const mouse = mouseRef.current;
      const dots = dotsRef.current;

      for (const d of dots) {
        // Slow atmospheric drift around each dot's grid slot.
        const driftX = Math.sin(t * 0.4 + d.phase) * 2.2;
        const driftY = Math.cos(t * 0.35 + d.phase) * 2.2;
        let x = d.baseX + driftX;
        let y = d.baseY + driftY;

        // Mouse repulsion — the grid bends away from the cursor.
        const mdx = x - mouse.x;
        const mdy = y - mouse.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        let glow = 0;
        if (mDist < MOUSE_RADIUS) {
          // Smoothstep falloff (instead of linear) so the effect eases in
          // gently near the edge of the radius rather than snapping on.
          const proximity = 1 - mDist / MOUSE_RADIUS;
          glow = proximity * proximity * (3 - 2 * proximity);
          const force = glow * 5;
          x += (mdx / (mDist || 1)) * force;
          y += (mdy / (mDist || 1)) * force;
        }

        // Card repulsion — dots drifting into the card's zone are eased back
        // out toward their grid slot instead, so the field parts around it.
        let fade = 1;
        if (cardRect && x > cardRect.left && x < cardRect.right && y > cardRect.top && y < cardRect.bottom) {
          const distLeft = x - cardRect.left;
          const distRight = cardRect.right - x;
          const distTop = y - cardRect.top;
          const distBottom = cardRect.bottom - y;
          const minDist = Math.min(distLeft, distRight, distTop, distBottom);
          const pushForce = Math.min(minDist * 0.5, 18);
          if (minDist === distLeft) x -= pushForce;
          else if (minDist === distRight) x += pushForce;
          else if (minDist === distTop) y -= pushForce;
          else y += pushForce;
          fade = 0.15;
        }

        const radius = 1.1 + glow * 0.6;
        const baseOpacity = 0.14 * fade;
        const opacity = baseOpacity + glow * 0.22;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(opacity, 0.5)})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [cardRef]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
};
