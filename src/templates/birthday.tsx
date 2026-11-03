import React from 'react';
import type { Template, RenderContext } from './types';
import { FONT_DISPLAY, FONT_TEXT, BRANDS, COPY, t, typeScale, space } from '../design/brand';
import { BrandMark } from '../design/BrandMark';
import { GradientField, Grain, Spheres, PepperMark, inkFor, mutedFor, paperFor } from './kit/Surface';
import { EditableText, EditablePhoto } from './kit/Editable';

// --- ANIVERSÁRIO ------------------------------------------------------------
//
// Redesign of the birthday card.
//
// The old one was a horizontal band of gradient with the greeting in it and a
// photo pasted below, which read as two unrelated pictures stacked. This is
// one picture: the portrait is the card, the gradient enters from a corner as
// a diagonal wedge, and the greeting is set across it so the type and the
// face occupy the same frame. The name sits on the baseline where the wedge
// meets the photo, which is the composition's anchor at every format.

const render = (ctx: RenderContext) => {
  const { v, format, theme, brand, locale, people, exporting } = ctx;
  const shortEdge = Math.min(format.width, format.height);
  const type = typeScale(shortEdge);
  const sp = space(shortEdge);
  const b = BRANDS[brand];
  const paper = paperFor(theme);
  const ink = inkFor(theme);
  const muted = mutedFor(theme);

  const person = people[0];
  const wedge = v<number>('wedge');
  const softness = v<number>('softness');
  const scrim = v<number>('scrim');
  const greeting = v<string>('greeting') || t(COPY.birthday, locale);
  const isWide = format.width > format.height;

  // The wedge cuts from the top-left down to the right edge. How far down it
  // reaches is the one composition control; everything else follows from it.
  const cut = 40 + wedge * 34;

  return (
    <div style={{ position: 'absolute', inset: 0, background: paper, fontFamily: FONT_TEXT, overflow: 'hidden' }}>
      {/* Portrait fills the whole card; the wedge sits over it. */}
      <EditablePhoto
        personIndex={0}
        url={person.photoUrl}
        zoom={person.photoZoom}
        offset={person.photoOffset}
        exporting={exporting}
        frame={{ width: format.width, height: format.height }}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* A scrim only over the lower third, so the name stays legible on a
          bright photo without greying out the face. */}
      <div
        aria-hidden
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: '46%',
          background: `linear-gradient(to top, rgba(0,0,0,${0.82 * scrim}) 0%, rgba(0,0,0,${0.3 * scrim}) 45%, transparent 100%)`,
          pointerEvents: 'none', zIndex: 2,
        }}
      />

      {/* The wedge. */}
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
          clipPath: isWide
            ? `polygon(0 0, 62% 0, ${cut - 8}% 100%, 0 100%)`
            : `polygon(0 0, 100% 0, 100% ${cut - 22}%, 0 ${cut}%)`,
        }}
      >
        <GradientField brand={brand} angle={isWide ? 160 : 135}>
          <Spheres brand={brand} shortEdge={shortEdge} softness={softness} variant="orbit" scale={0.8} />
          <Grain opacity={0.07} />
        </GradientField>
      </div>

      <BrandMark
        brand={brand}
        width={shortEdge * 0.18}
        color={b.onGradient}
        style={{ position: 'absolute', top: sp.gutter, left: sp.gutter, zIndex: 5 }}
      />

      {/* Greeting, set on the wedge. */}
      <EditableText
        field="greeting"
        value={greeting}
        exporting={exporting}
        placeholder="FELIZ ANIVERSÁRIO"
        style={{
          position: 'absolute', zIndex: 5,
          left: sp.gutter,
          top: sp.gutter + shortEdge * 0.13,
          width: isWide ? '48%' : '78%',
          fontFamily: FONT_DISPLAY, fontWeight: 700,
          fontSize: type.display, lineHeight: 0.94, letterSpacing: '-0.025em',
          color: b.onGradient,
          whiteSpace: 'pre-line',
          textShadow: '0 2px 24px rgba(0,0,0,0.18)',
        }}
      />

      {/* Name and date on the photo's baseline. */}
      <div style={{
        position: 'absolute', zIndex: 5,
        left: sp.gutter, right: sp.gutter, bottom: sp.gutter,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: sp.block,
      }}>
        <div style={{ minWidth: 0 }}>
          <EditableText
            field="person:0:name"
            value={person.name}
            exporting={exporting}
            placeholder="Nome da pessoa"
            style={{
              fontFamily: FONT_DISPLAY, fontWeight: 700,
              fontSize: type.title, lineHeight: 1.0, letterSpacing: '-0.01em',
              color: '#FFFFFF', textTransform: 'uppercase',
              textShadow: '0 2px 18px rgba(0,0,0,0.45)',
            }}
          />
          <EditableText
            field="person:0:role"
            value={person.role}
            exporting={exporting}
            placeholder="Cargo"
            style={{
              fontFamily: FONT_TEXT, fontWeight: 300,
              fontSize: type.caption, letterSpacing: '0.14em',
              color: 'rgba(255,255,255,0.86)', textTransform: 'uppercase',
              marginTop: sp.hair, textShadow: '0 2px 14px rgba(0,0,0,0.5)',
            }}
          />
        </div>

        {v<boolean>('showDate') && (
          <EditableText
            field="dateLabel"
            value={v<string>('dateLabel')}
            exporting={exporting}
            placeholder="12/06"
            style={{
              fontFamily: FONT_DISPLAY, fontWeight: 700,
              fontSize: type.subtitle, color: '#FFFFFF', whiteSpace: 'nowrap',
              padding: `${sp.hair}px ${sp.tight}px`,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.3)',
              backdropFilter: 'blur(12px)',
              textShadow: '0 2px 14px rgba(0,0,0,0.4)',
            }}
          />
        )}
      </div>

      <PepperMark
        size={shortEdge * 0.03}
        color={ink}
        style={{ position: 'absolute', right: sp.gutter, top: sp.gutter, zIndex: 5, opacity: 0.9, filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.35))' }}
      />
      <span style={{ display: 'none' }}>{muted}</span>
    </div>
  );
};

export const birthday: Template = {
  id: 'birthday',
  name: 'Aniversário',
  tagline: 'Retrato com a saudação na diagonal',
  family: 'pessoas',
  formats: ['post-square', 'post-portrait', 'story', 'landscape'],
  groups: ['Conteúdo', 'Composição'],
  fields: [
    { kind: 'text', id: 'greeting', label: 'Saudação', default: '', group: 'Conteúdo', hint: 'Vazio usa a saudação do idioma escolhido.' },
    { kind: 'toggle', id: 'showDate', label: 'Mostrar data', default: true, group: 'Conteúdo' },
    { kind: 'text', id: 'dateLabel', label: 'Data', default: '12/06', group: 'Conteúdo' },
    { kind: 'number', id: 'wedge', label: 'Corte da diagonal', default: 0.5, min: 0, max: 1, step: 0.01, group: 'Composição' },
    { kind: 'number', id: 'softness', label: 'Desfoque das esferas', default: 0.3, min: 0, max: 1, step: 0.01, group: 'Composição' },
    { kind: 'number', id: 'scrim', label: 'Sombra sobre a foto', default: 1, min: 0, max: 1, step: 0.01, group: 'Composição' },
  ],
  render,
};
