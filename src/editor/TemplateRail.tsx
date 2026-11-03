import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useEditor } from '../store/editor';
import { TEMPLATES, FAMILY_LABELS } from '../templates/registry';
import { FORMATS, defaultsFor, emptyPerson, type FieldValue, type RenderContext, type Template } from '../templates/types';
import { C, MOTION, R, S, T } from './ui';

// The template picker.
//
// The thumbnails used to be two white bars on a gradient — a drawing of a
// card rather than the card. The old build was worse still: ten hand-exported
// PNGs that had stopped matching their templates months earlier. Each entry
// now renders the real template, at real size, scaled down, so a preview is
// incapable of going stale.

const PREVIEW_W = 172;

const Preview: React.FC<{ template: Template; active: boolean }> = ({ template, active }) => {
  const brand = useEditor(s => s.card.brand);
  const theme = useEditor(s => s.card.theme);
  const locale = useEditor(s => s.card.locale);

  const format = FORMATS[template.formats[0]];
  const scale = PREVIEW_W / format.width;
  const height = Math.round(format.height * scale);

  const ctx: RenderContext = useMemo(() => {
    const values = defaultsFor(template);
    return {
      v: (<T2 extends FieldValue>(id: string) => values[id] as T2),
      format,
      theme,
      brand,
      locale,
      people: [{ ...emptyPerson('preview'), name: 'Nome Sobrenome', role: 'Cargo' }],
      // Affordances off: a preview is not editable, and a placeholder or a
      // hover outline inside a 172px thumbnail is just noise.
      exporting: true,
    };
  }, [template, format, theme, brand, locale]);

  return (
    <div
      aria-hidden
      style={{
        position: 'relative', width: '100%', height,
        borderRadius: R.lg, overflow: 'hidden',
        boxShadow: active
          ? `0 0 0 1.5px ${C.accent}, 0 8px 22px -8px rgba(0,0,0,0.7)`
          : `0 0 0 1px ${C.edge}, 0 4px 14px -8px rgba(0,0,0,0.6)`,
        transition: 'box-shadow 180ms',
      }}
    >
      <div style={{
        width: format.width, height: format.height,
        transform: `scale(${scale})`, transformOrigin: 'top left',
        pointerEvents: 'none',
      }}>
        {template.render(ctx)}
      </div>
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
        width: 212, flexShrink: 0, height: '100%', overflowY: 'auto', overflowX: 'hidden',
        padding: `${S.lg}px ${S.lg}px ${S.xxl}px`,
      }}
    >
      {families.map(family => (
        <div key={family} style={{ marginBottom: S.xl }}>
          <h3 style={{ margin: `0 0 ${S.md}px`, color: C.muted, ...T.label }}>
            {FAMILY_LABELS[family]}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: S.md }}>
            {TEMPLATES.filter(t => t.family === family).map(t => {
              const active = t.id === templateId;
              return (
                <motion.button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  transition={MOTION.snappy}
                  aria-pressed={active}
                  style={{
                    position: 'relative', textAlign: 'left', padding: 0,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <Preview template={t} active={active} />
                  <div style={{ padding: `${S.sm}px 2px 0` }}>
                    <div style={{
                      color: active ? C.ink : C.inkSoft,
                      fontWeight: active ? 700 : 500,
                      ...T.control,
                    }}>{t.name}</div>
                    <div style={{ color: C.faint, marginTop: 1, ...T.hint }}>{t.tagline}</div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
};
