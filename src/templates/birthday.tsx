import React from 'react';
import type { Template, RenderContext } from './types';
import { FONT_DISPLAY, FONT_TEXT, BRANDS, COPY, t, typeScale } from '../design/brand';
import { GradientField, Grain, Spheres, inkFor, mutedFor, paperFor } from './kit/Surface';
import { EditableText, EditablePhoto } from './kit/Editable';
import { Mark, Oversize, cutShape, frameFor } from './kit/Layout';

// --- ANIVERSÁRIO ------------------------------------------------------------
//
// Second pass. The first was a gradient wedge with the greeting sitting in
// the empty half of it — a sticker on a photo. The type and the portrait
// never met, which is what made it read as flat and safe.
//
// This one is built on three things:
//
//   1. The greeting is set enormous and runs off both edges, so the card
//      reads as a crop of something larger rather than a slide with a
//      heading on it.
//   2. The portrait sits in a hard arch that overlaps that type. The
//      occlusion is the depth — it is what puts the person in front of the
//      words instead of next to them.
//   3. Extreme scale contrast: a display word in the hundreds of pixels
//      against a 16px kicker, with nothing in between competing.
//
// The date becomes a graphic element in its own right rather than a label:
// set as a large numeral pair on the brand accent, anchored to the arch.

const render = (ctx: RenderContext) => {
  const { v, format, theme, brand, locale, people, exporting } = ctx;
  const F = frameFor(format, 'top-left');
  const type = typeScale(F.short);
  const b = BRANDS[brand];
  const paper = paperFor(theme);
  const ink = inkFor(theme);
  const muted = mutedFor(theme);

  const person = people[0];
  const drop = v<number>('drop');
  const softness = v<number>('softness');
  const bleed = v<number>('bleed');
  const cut = v<string>('cut');

  const raw = (v<string>('greeting') || t(COPY.birthday, locale)).trim();
  const lines = raw.split('\n');
  const headline = lines[lines.length - 1] || raw;
  const kicker = lines.length > 1 ? lines.slice(0, -1).join(' ') : '';

  // The portrait column. Narrower and taller than a half-split, so the arch
  // reads as an object placed on the card rather than as one of two panels.
  const archW = Math.round(F.content.width * (F.isWide ? 0.40 : 0.62));
  const archH = Math.round(format.height * (F.isWide ? 0.74 : 0.56));
  const archLeft = F.isWide
    ? Math.round(format.width - F.margin - archW)
    : Math.round((format.width - archW) / 2 + F.content.width * 0.06);
  // Display size is driven by the longest word, so a long greeting bleeds
  // rather than shrinking — the bleed is the point.
  const longest = headline.split(' ').reduce((a, w) => (w.length > a.length ? w : a), '');
  const display = Math.round((format.width / Math.max(longest.length, 5)) * 1.72 * bleed);

  // Explicit vertical flow instead of three things each positioned from the
  // frame edge and trusting the others to miss. The first pass had the
  // kicker landing on the headline and the date landing on it too.
  const kickerH = kicker ? Math.round(type.subtitle * 1.25) : 0;
  const headlineTop = F.content.top + kickerH;
  const headlineH = Math.round(display * 0.82);

  // Anchored to the headline rather than to the card's bottom edge, so the
  // overlap is always the type's lower third -- that occlusion is where the
  // depth comes from -- at every format. Declared after the headline
  // metrics it depends on, which the first version was not: it read
  // `display` above its own definition and took the whole app down.
  const archTop = Math.round(Math.min(
    headlineTop + headlineH * 0.72 + format.height * 0.05 * (drop - 0.5) * 2,
    format.height - F.margin - archH,
  ));

  return (
    <div style={{ position: 'absolute', inset: 0, background: paper, fontFamily: FONT_TEXT, overflow: 'hidden' }}>
      {/* Brand light, not a brand rectangle: a soft mass of gradient behind
          the subject instead of a panel beside them. */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.92 }}>
        <GradientField brand={brand} angle={F.isWide ? 115 : 150} sweep={false}>
          <Spheres brand={brand} shortEdge={F.short} softness={0.55 + softness * 0.45} variant="orbit" scale={1.35} />
        </GradientField>
      </div>
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          background: theme === 'dark'
            ? `linear-gradient(${F.isWide ? 100 : 170}deg, ${paper} 6%, ${paper}D9 34%, transparent 78%)`
            : `linear-gradient(${F.isWide ? 100 : 170}deg, ${paper} 6%, ${paper}CC 34%, transparent 78%)`,
        }}
      />

      {/* The oversized greeting, cropped by both edges. */}
      <Oversize
        size={display}
        style={{
          left: -display * 0.07,
          top: headlineTop,
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          color: ink,
          opacity: theme === 'dark' ? 0.97 : 0.95,
          zIndex: 2,
        }}
      >
        {headline.toUpperCase()}
      </Oversize>

      {kicker && (
        <div style={{
          position: 'absolute', zIndex: 3,
          left: F.content.left, top: F.content.top,
          fontFamily: FONT_DISPLAY, fontWeight: 700,
          fontSize: type.subtitle, letterSpacing: '0.04em',
          color: b.accent, textTransform: 'uppercase',
        }}>{kicker}</div>
      )}

      {/* Hidden field so the greeting stays editable even though it is drawn
          as two separate pieces above. */}
      <EditableText
        field="greeting"
        value={v<string>('greeting')}
        exporting={exporting}
        placeholder="FELIZ ANIVERSÁRIO"
        style={{
          position: 'absolute', zIndex: 6,
          left: F.content.left, top: F.content.top,
          width: F.content.width * 0.5, minHeight: type.subtitle,
          fontFamily: FONT_DISPLAY, fontSize: type.subtitle,
          color: 'transparent', caretColor: ink,
          opacity: exporting ? 0 : 1,
        }}
      />

      {/* The portrait, over the type. */}
      <EditablePhoto
        personIndex={0}
        url={person.photoUrl}
        zoom={person.photoZoom}
        offset={person.photoOffset}
        exporting={exporting}
        frame={{ width: archW, height: archH }}
        style={{
          position: 'absolute', zIndex: 4,
          left: archLeft, top: archTop, width: archW, height: archH,
          boxShadow: `0 ${Math.round(F.short * 0.03)}px ${Math.round(F.short * 0.09)}px rgba(0,0,0,0.42)`,
          ...cutShape(cut as never, Math.round(archW * 0.5)),
        }}
      />

      {/* Name block, hung off the arch's base line. */}
      <div style={{
        position: 'absolute', zIndex: 5,
        left: F.isWide ? F.content.left : F.margin,
        bottom: F.margin,
        maxWidth: F.isWide ? archLeft - F.content.left - F.short * 0.04 : F.content.width,
      }}>
        <EditableText
          field="person:0:name"
          value={person.name}
          exporting={exporting}
          placeholder="Nome da pessoa"
          style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: type.title, lineHeight: 0.96, letterSpacing: '-0.015em',
            color: ink, textTransform: 'uppercase',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(F.short * 0.018), marginTop: Math.round(F.short * 0.014) }}>
          <span style={{ width: Math.round(F.short * 0.05), height: 3, background: b.accent, flexShrink: 0 }} />
          <EditableText
            field="person:0:role"
            value={person.role}
            exporting={exporting}
            placeholder="Cargo"
            style={{
              fontFamily: FONT_TEXT, fontWeight: 400,
              fontSize: type.caption, letterSpacing: '0.16em',
              color: muted, textTransform: 'uppercase',
            }}
          />
        </div>
      </div>

      {/* The date as a graphic element, not a label. */}
      {v<boolean>('showDate') && (
        <EditableText
          field="dateLabel"
          value={v<string>('dateLabel')}
          exporting={exporting}
          placeholder="12/06"
          style={{
            position: 'absolute', zIndex: 6,
            right: F.margin,
            bottom: F.margin,
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: type.headline, lineHeight: 0.8, letterSpacing: '-0.03em',
            color: b.accent,
          }}
        />
      )}

      <Grain opacity={0.05} />
      <Mark brand={brand} format={format} slot="top-left" color={ink} />
    </div>
  );
};

export const birthday: Template = {
  id: 'birthday',
  name: 'Aniversário',
  tagline: 'Tipografia sangrada com o retrato por cima',
  family: 'pessoas',
  formats: ['post-square', 'post-portrait', 'story', 'landscape'],
  groups: ['Conteúdo', 'Composição'],
  fields: [
    { kind: 'text', id: 'greeting', label: 'Saudação', default: '', group: 'Conteúdo', hint: 'Vazio usa a saudação do idioma. Quebre a linha para criar um kicker acima.' },
    { kind: 'toggle', id: 'showDate', label: 'Mostrar data', default: true, group: 'Conteúdo' },
    { kind: 'text', id: 'dateLabel', label: 'Data', default: '12/06', group: 'Conteúdo' },
    {
      kind: 'select', id: 'cut', label: 'Recorte da foto', default: 'arch', group: 'Composição',
      options: [
        { value: 'arch', label: 'Arco' },
        { value: 'circle', label: 'Círculo' },
        { value: 'blade', label: 'Lâmina' },
        { value: 'none', label: 'Reto' },
      ],
    },
    { kind: 'number', id: 'bleed', label: 'Sangria do título', default: 1, min: 0.7, max: 1.5, step: 0.01, group: 'Composição', hint: 'Acima de 1 o título corta nas bordas de propósito.' },
    { kind: 'number', id: 'drop', label: 'Altura do retrato', default: 0.5, min: 0, max: 1, step: 0.01, group: 'Composição' },
    { kind: 'number', id: 'softness', label: 'Difusão da luz', default: 0.4, min: 0, max: 1, step: 0.01, group: 'Composição' },
  ],
  render,
};
