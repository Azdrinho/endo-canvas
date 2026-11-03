import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { useEditor } from './store/editor';
import { getTemplate } from './templates/registry';
import { Canvas, CardSurface } from './editor/Canvas';
import { Inspector } from './editor/Inspector';
import { TemplateRail } from './editor/TemplateRail';
import { Toolbar } from './editor/Toolbar';
import { PeopleBar } from './editor/PeopleBar';
import { C, ELEVATION, R, S } from './editor/ui';
import { captureCard, downloadDataUrl, slugify } from './export/exportCard';

// The shell.
//
// It was three flat grey columns divided by hairlines — the layout of a
// settings dialog, which is what "design de UI fraco" was pointing at. No
// amount of slider polish fixes that, because the problem is the structure.
//
// The canvas is now the whole window, and the panels float above it as
// inset, rounded surfaces with real elevation. That one change does most of
// the work: the artwork is the application, and the controls are tools
// resting on top of it rather than walls around it.

export default function App() {
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const undo = useEditor(s => s.undo);
  const redo = useEditor(s => s.redo);
  const templateId = useEditor(s => s.card.templateId);
  const format = useEditor(s => s.card.format);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((key === 'z' && e.shiftKey) || key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    const id = toast.loading('Gerando a imagem…');
    try {
      await new Promise(requestAnimationFrame);
      const node = exportRef.current?.firstElementChild as HTMLElement | undefined;
      if (!node) throw new Error('nada para exportar');
      const { dataUrl, width, height } = await captureCard(node);
      downloadDataUrl(dataUrl, `${slugify(getTemplate(templateId).name)}-${format}-${Date.now()}.png`);
      toast.success(`Pronto — ${width}×${height}`, { id });
    } catch (err) {
      console.error('[export] failed', err);
      toast.error('Não consegui gerar a imagem. Se alguma foto vier de fora, pode ser bloqueio de CORS.', { id });
    } finally {
      setExporting(false);
    }
  }, [templateId, format]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.void, color: C.ink, overflow: 'hidden' }}>
      {/* The canvas is the window. Everything else rests on it. */}
      <Canvas />

      <FloatingSlot side="left"><TemplateRail /></FloatingSlot>
      <FloatingSlot side="right"><Inspector /></FloatingSlot>

      <div style={{ position: 'absolute', top: S.md, left: S.md, right: S.md, zIndex: 20, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        {/* Hugs its content and is capped by the gap between the floating
            panels, so it never grows under one of them. */}
        <div style={{ pointerEvents: 'auto', maxWidth: 'calc(100vw - 560px)', overflow: 'hidden' }}>
          <Toolbar onExport={handleExport} exporting={exporting} />
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: S.md, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto' }}>
          <PeopleBar />
        </div>
      </div>

      {exporting && (
        <div ref={exportRef} aria-hidden style={{ position: 'fixed', left: -100000, top: 0, pointerEvents: 'none' }}>
          <CardSurface exporting />
        </div>
      )}

      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{ style: { background: C.raised, border: `1px solid ${C.edge}`, color: C.ink, borderRadius: R.lg } }}
      />
    </div>
  );
}

/** A panel floating over the canvas, inset from the window edge. */
const FloatingSlot: React.FC<{ side: 'left' | 'right'; children: React.ReactNode }> = ({ side, children }) => (
  <div
    style={{
      position: 'absolute',
      top: S.md, bottom: S.md,
      [side]: S.md,
      zIndex: 25,
      display: 'flex',
      borderRadius: R.xl,
      overflow: 'hidden',
      background: 'rgba(18,18,22,0.82)',
      backdropFilter: 'blur(28px) saturate(140%)',
      WebkitBackdropFilter: 'blur(28px) saturate(140%)',
      boxShadow: ELEVATION.float,
    }}
  >
    {children}
  </div>
);
