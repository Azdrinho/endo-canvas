import React from 'react';
import type { Template, RenderContext } from './types';
import { FONT_DISPLAY, FONT_TEXT, BRANDS, typeScale, space } from '../design/brand';
import { BrandMark } from '../design/BrandMark';
import { GradientField, Grain, Spheres, inkFor, mutedFor, paperFor } from './kit/Surface';
import { EditableText, EditablePhoto } from './kit/Editable';

// --- COMUNICADO -------------------------------------------------------------
//
// Redesign of the old "HR Feedback" card.
//
// What was wrong with it: a header band, a photo band and a text block stacked
// in three unrelated horizontal strips, each sized by its own magic number, so
// the composition fell apart the moment the text ran long. It carried thirteen
// controls — title scale, paragraph scale, two line heights, circle size,
// circle position, background height — because the layout could not hold
// itself together and every failure had been patched with another slider.
//
// What this does instead: one diagonal ribbon of brand gradient anchors the
// card, the title hangs off it, and the body sits in a measured column
// underneath. The ribbon's angle does the visual work the sliders were doing,
// so the control count drops from thirteen to six and none of them is a
// rescue lever.

const render = (ctx: RenderContext) => {
  const { v, format, theme, brand, people, exporting } = ctx;
  const shortEdge = Math.min(format.width, format.height);
  const type = typeScale(shortEdge);
  const sp = space(shortEdge);
  const b = BRANDS[brand];

  const paper = paperFor(theme);
  const ink = inkFor(theme);
  const muted = mutedFor(theme);

  const photoMode = v<string>('photoMode');
  const ribbon = v<number>('ribbon');
  const softness = v<number>('softness');
  const showRule = v<boolean>('rule');
  const person = people[0];

  const isWide = format.width > format.height;
  // The ribbon reaches further down on a tall card, so it stays a band rather
  // than becoming a thin stripe at the top of a story.
  const ribbonHeight = (isWide ? 0.52 : 0.40) * format.height * ribbon;

  return (
    <div style={{ position: 'absolute', inset: 0, background: paper, fontFamily: FONT_TEXT, overflow: 'hidden' }}>
      {/* The ribbon: a gradient field cut on a diagonal. */}
      <div
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: ribbonHeight,
          clipPath: `polygon(0 0, 100% 0, 100% ${100 - 14 * ribbon}%, 0 100%)`,
        }}
      >
        <GradientField brand={brand}>
          <Spheres brand={brand} shortEdge={shortEdge} softness={softness} variant="arc" scale={0.9} />
          <Grain opacity={0.07} />
        </GradientField>
      </div>

      {/* Brand lockup, always on the ribbon. */}
      <BrandMark
        brand={brand}
        width={shortEdge * 0.2}
        color={b.onGradient}
        style={{ position: 'absolute', top: sp.gutter, left: sp.gutter, zIndex: 3 }}
      />

      {/* The photo, when there is one. A circle overlapping the ribbon's lower
          edge, which is what ties the two halves of the card together. */}
      {photoMode === 'circle' && (
        <EditablePhoto
          personIndex={0}
          url={person.photoUrl}
          zoom={person.photoZoom}
          offset={person.photoOffset}
          exporting={exporting}
          frame={{ width: shortEdge * 0.3, height: shortEdge * 0.3 }}
          radius="50%"
          style={{
            position: 'absolute', zIndex: 4,
            width: shortEdge * 0.3, height: shortEdge * 0.3,
            right: sp.gutter,
            top: ribbonHeight - shortEdge * 0.15,
            boxShadow: `0 ${sp.hair * 2}px ${sp.block}px rgba(0,0,0,0.28)`,
            border: `${Math.round(shortEdge * 0.008)}px solid ${paper}`,
          }}
        />
      )}

      {photoMode === 'band' && (
        <EditablePhoto
          personIndex={0}
          url={person.photoUrl}
          zoom={person.photoZoom}
          offset={person.photoOffset}
          exporting={exporting}
          frame={{ width: format.width, height: ribbonHeight }}
          style={{ position: 'absolute', inset: 0, height: ribbonHeight, zIndex: 1, mixBlendMode: 'luminosity', opacity: 0.55 }}
        />
      )}

      {/* Content column. Bottom-anchored so the ribbon and the text always
          meet, however long the body runs. */}
      <div
        style={{
          position: 'absolute',
          left: sp.gutter,
          right: photoMode === 'circle' ? sp.gutter + shortEdge * 0.34 : sp.gutter,
          top: ribbonHeight + sp.block,
          bottom: sp.gutter,
          display: 'flex', flexDirection: 'column',
          zIndex: 3,
        }}
      >
        <EditableText
          field="eyebrow"
          value={v<string>('eyebrow')}
          exporting={exporting}
          placeholder="COMUNICADO"
          style={{
            fontFamily: FONT_TEXT, fontWeight: 700, letterSpacing: '0.22em',
            fontSize: type.micro, color: b.accent, textTransform: 'uppercase',
            marginBottom: sp.tight,
          }}
        />

        <EditableText
          field="title"
          as="h1"
          rich
          value={v<string>('title')}
          exporting={exporting}
          placeholder="Título do comunicado"
          style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: type.headline, lineHeight: 1.02, letterSpacing: '-0.02em',
            color: ink, margin: 0,
            // Balanced wrapping keeps a two-line headline from leaving one
            // orphan word on the second line.
            textWrap: 'balance' as never,
          }}
        />

        {showRule && (
          <div style={{
            height: Math.max(2, Math.round(shortEdge * 0.004)),
            width: shortEdge * 0.12,
            background: b.accent,
            margin: `${sp.block}px 0`,
            flexShrink: 0,
          }} />
        )}

        <EditableText
          field="body"
          as="p"
          rich
          value={v<string>('body')}
          exporting={exporting}
          placeholder="Escreva o comunicado aqui."
          style={{
            fontFamily: FONT_TEXT, fontWeight: 300,
            fontSize: type.body, lineHeight: 1.55,
            color: muted, margin: showRule ? 0 : `${sp.block}px 0 0`,
            // A measure cap, because a 1080px-wide paragraph is unreadable
            // and no amount of font-size slider fixes that.
            maxWidth: `${Math.round(shortEdge * 0.86)}px`,
            flex: 1,
            overflow: 'hidden',
          }}
        />

        <EditableText
          field="signature"
          value={v<string>('signature')}
          exporting={exporting}
          placeholder="Assinatura"
          style={{
            fontFamily: FONT_TEXT, fontWeight: 700, fontSize: type.caption,
            color: ink, marginTop: sp.block, letterSpacing: '0.04em',
          }}
        />
      </div>
    </div>
  );
};

export const hrUpdate: Template = {
  id: 'hr-update',
  name: 'Comunicado',
  tagline: 'Aviso do RH para o time',
  family: 'comunicacao',
  formats: ['post-square', 'post-portrait', 'story', 'landscape', 'email-banner'],
  groups: ['Conteúdo', 'Composição'],
  fields: [
    { kind: 'text', id: 'eyebrow', label: 'Etiqueta', default: 'COMUNICADO', group: 'Conteúdo', hint: 'Linha curta acima do título.' },
    { kind: 'richText', id: 'title', label: 'Título', default: 'Novidades por aqui', group: 'Conteúdo' },
    { kind: 'richText', id: 'body', label: 'Texto', default: 'Conte aqui o que o time precisa saber. Selecione qualquer trecho para deixar em negrito, itálico ou trocar a cor.', group: 'Conteúdo' },
    { kind: 'text', id: 'signature', label: 'Assinatura', default: 'Equipe de Gente & Cultura', group: 'Conteúdo' },
    {
      kind: 'select', id: 'photoMode', label: 'Foto', default: 'none', group: 'Composição',
      options: [
        { value: 'none', label: 'Sem foto' },
        { value: 'circle', label: 'Moldura' },
        { value: 'band', label: 'Na faixa' },
      ],
    },
    { kind: 'number', id: 'ribbon', label: 'Altura da faixa', default: 1, min: 0.55, max: 1.45, step: 0.01, group: 'Composição' },
    { kind: 'number', id: 'softness', label: 'Desfoque das esferas', default: 0.35, min: 0, max: 1, step: 0.01, group: 'Composição' },
    { kind: 'toggle', id: 'rule', label: 'Traço entre título e texto', default: true, group: 'Composição' },
  ],
  render,
};
