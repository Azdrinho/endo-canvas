import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useEditor } from '../store/editor';
import { getTemplate } from '../templates/registry';
import { FORMATS, coerceValues, type FieldValue, type RenderContext } from '../templates/types';
import { UI } from './controls';

/**
 * The card, rendered at its true output size.
 *
 * The previous build composed cards at 360x540 and exported them at 2x, so
 * every size in every template was a number that only looked right after
 * being doubled. Here a post really is 1080px and the view is scaled down,
 * which means an export is a 1:1 capture and a designer's measurement means
 * what it says.
 */
export const CardSurface = React.forwardRef<HTMLDivElement, { exporting?: boolean }>(
  ({ exporting = false }, ref) => {
    const card = useEditor(s => s.card);
    const people = useEditor(s => s.people);
    const template = getTemplate(card.templateId);
    const format = FORMATS[card.format];

    // Every read goes through the template's declaration, so a missing value,
    // a value left over from an older build, or one of the wrong type can
    // never reach a template as undefined and render as `NaNpx`.
    const values = React.useMemo(() => coerceValues(template, card.values), [template, card.values]);

    const ctx: RenderContext = {
      v: (<T extends FieldValue>(id: string) => values[id] as T),
      format,
      theme: card.theme,
      brand: card.brand,
      locale: card.locale,
      people,
      exporting,
    };

    return (
      <div
        ref={ref}
        id="card-surface"
        data-format={card.format}
        style={{
          position: 'relative',
          width: format.width,
          height: format.height,
          overflow: 'hidden',
          flexShrink: 0,
          // Rendered opaque so an export never picks up the editor behind it.
          isolation: 'isolate',
        }}
      >
        {template.render(ctx)}
      </div>
    );
  },
);
CardSurface.displayName = 'CardSurface';

export const Canvas: React.FC = () => {
  const stageRef = useRef<HTMLDivElement>(null);
  const zoom = useEditor(s => s.zoom);
  const pan = useEditor(s => s.pan);
  const format = useEditor(s => s.card.format);
  const templateId = useEditor(s => s.card.templateId);
  const setZoom = useEditor(s => s.setZoom);
  const setPan = useEditor(s => s.setPan);
  const fitToStage = useEditor(s => s.fitToStage);
  const select = useEditor(s => s.select);
  const [panning, setPanning] = useState(false);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  // Refit whenever the stage or the card's shape changes, so switching from a
  // square to a story never leaves the card cropped or lost off-screen.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => fitToStage({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitToStage, format, templateId]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    // Non-passive, because zooming must not also scroll the page.
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setZoom(useEditor.getState().zoom * (e.deltaY < 0 ? 1.08 : 0.926));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setZoom]);

  const onPointerDown = (e: React.PointerEvent) => {
    const onCard = (e.target as HTMLElement).closest('#card-surface');
    // Middle button pans from anywhere; left button pans only from the
    // backdrop, so a left-drag on the card still belongs to the card.
    if (e.button === 1 || (e.button === 0 && !onCard)) {
      if (!onCard) select(null);
      setPanning(true);
      drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setPan({ x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) });
  };

  const endPan = () => { drag.current = null; setPanning(false); };

  return (
    <div
      ref={stageRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerLeave={endPan}
      style={{
        position: 'relative', flex: 1, minWidth: 0, height: '100%',
        overflow: 'hidden',
        background: UI.shell,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
        cursor: panning ? 'grabbing' : 'default',
      }}
    >
      {/* Centring happens in an absolutely positioned flex layer rather than
          on the stage itself. A grid or flex track sized `auto` grows to the
          card's 1080px and starts at the container's edge, so centring inside
          it does nothing and the card hangs off to the right — which is
          exactly what it did. An absolute layer is the full stage size
          regardless of what it contains, so the card overflows symmetrically
          and the stage clips it evenly. */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
      <motion.div
        initial={false}
        animate={{ scale: zoom, x: pan.x, y: pan.y }}
        transition={panning ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 }}
        style={{
          transformOrigin: 'center',
          boxShadow: '0 40px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.07)',
        }}
      >
        <CardSurface />
      </motion.div>
      </div>

      <ZoomBadge />
    </div>
  );
};

const ZoomBadge: React.FC = () => {
  const zoom = useEditor(s => s.zoom);
  const format = useEditor(s => s.card.format);
  const f = FORMATS[format];
  return (
    <div
      style={{
        position: 'absolute', left: 16, bottom: 16,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 12px', borderRadius: 999,
        background: 'rgba(20,20,24,0.78)', backdropFilter: 'blur(14px)',
        border: `1px solid ${UI.line}`, color: UI.muted,
        fontSize: 11, fontVariantNumeric: 'tabular-nums', pointerEvents: 'none',
      }}
    >
      <span>{Math.round(zoom * 100)}%</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>{f.width} × {f.height}</span>
    </div>
  );
};
