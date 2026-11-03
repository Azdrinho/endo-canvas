import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { useEditor } from './store/editor';
import { getTemplate } from './templates/registry';
import { Canvas, CardSurface } from './editor/Canvas';
import { Inspector } from './editor/Inspector';
import { TemplateRail } from './editor/TemplateRail';
import { Toolbar } from './editor/Toolbar';
import { PeopleBar } from './editor/PeopleBar';
import { UI } from './editor/controls';
import { captureCard, downloadDataUrl, slugify } from './export/exportCard';

export default function App() {
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const undo = useEditor(s => s.undo);
  const redo = useEditor(s => s.redo);
  const templateId = useEditor(s => s.card.templateId);
  const format = useEditor(s => s.card.format);

  // Keyboard shortcuts, skipped whenever the caret is in a field — otherwise
  // Ctrl+Z inside a text box undoes the card instead of the typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
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
      // A frame for the offscreen copy to mount with its affordances off.
      await new Promise(requestAnimationFrame);
      const node = exportRef.current?.firstElementChild as HTMLElement | undefined;
      if (!node) throw new Error('nada para exportar');

      const { dataUrl, width, height } = await captureCard(node);
      const name = `${slugify(getTemplate(templateId).name)}-${format}-${Date.now()}.png`;
      downloadDataUrl(dataUrl, name);
      toast.success(`Pronto — ${width}×${height}`, { id });
    } catch (err) {
      console.error('[export] failed', err);
      toast.error('Não consegui gerar a imagem. Se alguma foto vier de fora, pode ser bloqueio de CORS.', { id });
    } finally {
      setExporting(false);
    }
  }, [templateId, format]);

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: UI.shell, color: UI.ink, overflow: 'hidden',
    }}>
      <Toolbar onExport={handleExport} exporting={exporting} />

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <TemplateRail />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Canvas />
          <PeopleBar />
        </div>
        <Inspector />
      </div>

      {/* The export copy: mounted only while exporting, off-screen, at true
          size and with every editing affordance suppressed. Capturing the
          live canvas instead would bake in selection outlines and the
          viewport's scale. */}
      {exporting && (
        <div
          ref={exportRef}
          aria-hidden
          style={{ position: 'fixed', left: -100000, top: 0, pointerEvents: 'none' }}
        >
          <CardSurface exporting />
        </div>
      )}

      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{ style: { background: UI.raised, border: `1px solid ${UI.line}`, color: UI.ink } }}
      />
    </div>
  );
}
