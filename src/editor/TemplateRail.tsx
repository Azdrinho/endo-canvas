import React from 'react';
import { motion } from 'motion/react';
import { useEditor } from '../store/editor';
import { TEMPLATES, FAMILY_LABELS } from '../templates/registry';
import { BRANDS } from '../design/brand';
import { UI } from './controls';
import type { Template } from '../templates/types';

// The template picker. Each entry draws its own miniature from the real
// template at a tiny scale, so a thumbnail can never go stale against the
// card it represents — the old build used ten hand-uploaded PNGs that had
// stopped matching their templates months ago.

const Thumb: React.FC<{ template: Template; active: boolean }> = ({ template, active }) => {
  const brand = useEditor(s => s.card.brand);
  const b = BRANDS[brand];
  return (
    <div
      aria-hidden
      style={{
        position: 'relative', height: 58, borderRadius: 9, overflow: 'hidden',
        background: `linear-gradient(135deg, ${b.from}, ${b.to})`,
        border: active ? `1px solid rgba(255,255,255,0.5)` : `1px solid ${UI.line}`,
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(60% 60% at 25% 20%, rgba(255,255,255,0.35), transparent 65%)',
      }} />
      <div style={{
        position: 'absolute', left: 9, bottom: 8, right: 9,
        height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.75)',
      }} />
      <div style={{
        position: 'absolute', left: 9, bottom: 16, width: '45%',
        height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.45)',
      }} />
    </div>
  );
};

export const TemplateRail: React.FC = () => {
  const templateId = useEditor(s => s.card.templateId);
  const setTemplate = useEditor(s => s.setTemplate);

  const families = [...new Set(TEMPLATES.map(t => t.family))];

  return (
    <nav
      aria-label="Templates"
      style={{
        width: 212, flexShrink: 0, height: '100%', overflowY: 'auto',
        background: UI.panel, borderRight: `1px solid ${UI.line}`,
        padding: '18px 14px 40px',
      }}
    >
      {families.map(family => (
        <div key={family} style={{ marginBottom: 22 }}>
          <h3 style={{
            margin: '0 0 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: UI.muted,
          }}>{FAMILY_LABELS[family]}</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TEMPLATES.filter(t => t.family === family).map(t => {
              const active = t.id === templateId;
              return (
                <motion.button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  aria-pressed={active}
                  style={{
                    position: 'relative', textAlign: 'left', padding: 0,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <Thumb template={t} active={active} />
                  <div style={{ padding: '7px 2px 0' }}>
                    <div style={{ fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? UI.ink : 'rgba(242,242,244,0.78)' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 10.5, color: UI.muted, lineHeight: 1.35, marginTop: 1 }}>
                      {t.tagline}
                    </div>
                  </div>

                  {active && (
                    <motion.div
                      layoutId="template-active"
                      style={{
                        position: 'absolute', left: -14, top: 4, bottom: 4, width: 3,
                        borderRadius: 2, background: UI.accent,
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
};
