import React from 'react';
import { motion } from 'motion/react';
import { useEditor } from '../store/editor';
import { getTemplate } from '../templates/registry';
import { FORMATS, FORMAT_ORDER } from '../templates/types';
import { IconButton, Segmented, UI } from './controls';

const Icon = {
  undo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></svg>,
  redo: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 14 5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h3" /></svg>,
  fit: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3" /></svg>,
  download: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3v12M7 12l5 5 5-5M4 21h16" /></svg>,
};

export const Toolbar: React.FC<{ onExport: () => void; exporting: boolean }> = ({ onExport, exporting }) => {
  const card = useEditor(s => s.card);
  const setFormat = useEditor(s => s.setFormat);
  const undo = useEditor(s => s.undo);
  const redo = useEditor(s => s.redo);
  const past = useEditor(s => s.past.length);
  const future = useEditor(s => s.future.length);
  const template = getTemplate(card.templateId);

  const formats = FORMAT_ORDER.filter(f => template.formats.includes(f));

  return (
    <header
      style={{
        height: 52, display: 'flex', alignItems: 'center', gap: 14,
        padding: '0 8px 0 16px', borderRadius: 16,
        background: 'rgba(18,18,22,0.82)',
        backdropFilter: 'blur(28px) saturate(140%)',
        WebkitBackdropFilter: 'blur(28px) saturate(140%)',
        boxShadow: '0 12px 32px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, minWidth: 190 }}>
        <strong style={{ fontSize: 13, color: UI.ink, letterSpacing: '-0.01em' }}>{template.name}</strong>
        <span style={{ fontSize: 11, color: UI.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {template.tagline}
        </span>
      </div>

      <div style={{ flex: 1, maxWidth: 440 }}>
        <Segmented
          value={card.format}
          options={formats.map(f => ({ value: f, label: FORMATS[f].label }))}
          onChange={setFormat}
        />
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
        <IconButton label="Desfazer (Ctrl+Z)" onClick={undo} disabled={past === 0}>{Icon.undo}</IconButton>
        <IconButton label="Refazer (Ctrl+Shift+Z)" onClick={redo} disabled={future === 0}>{Icon.redo}</IconButton>
        <IconButton label="Ajustar à tela" onClick={() => useEditor.setState({ zoomMode: 'fit' })}>{Icon.fit}</IconButton>

        <motion.button
          type="button"
          onClick={onExport}
          disabled={exporting}
          whileTap={{ scale: 0.97 }}
          style={{
            marginLeft: 8, display: 'flex', alignItems: 'center', gap: 8,
            height: 34, padding: '0 16px', borderRadius: 999, border: 'none',
            background: UI.accent, color: '#101013',
            fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
            cursor: exporting ? 'wait' : 'pointer', opacity: exporting ? 0.6 : 1,
          }}
        >
          {Icon.download}
          {exporting ? 'Exportando…' : 'Baixar PNG'}
        </motion.button>
      </div>
    </header>
  );
};
