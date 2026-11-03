import React from 'react';
import type { Template, RenderContext } from './types';
import { FONT_DISPLAY, FONT_TEXT, BRANDS, COPY, t, typeScale } from '../design/brand';
import { GradientField, Grain, Spheres, inkFor, mutedFor, paperFor } from './kit/Surface';
import { EditableText } from './kit/Editable';
import { Subject } from './kit/Subject';
import { Mark, frameFor } from './kit/Layout';
import { FitText } from './kit/FitText';

// --- ANIVERSÁRIO ------------------------------------------------------------
//
// Third pass. The second put the headline edge to edge and dropped an arch
// across the middle of it, so a word was bisected and the type looked jammed
// into the corner rather than placed. Two rules came out of that:
//
//   * The margin is a margin. Type sits inside it. Bleeding past the edge is
//     a decision taken for one element on one side, never the default for
//     everything.
//   * The subject overlaps the headline's baseline band, off to one side —
//     never across the middle of a word. A cutout stands in the same space
//     as the type and occludes it; a framed photo tucks under the last line.
//
// The card reads as mark, kicker, headline, then the figure standing on the
// name: four beats down one diagonal, rather than four stacked boxes.

const render = (ctx: RenderContext) => {
  const { v, format, theme, brand, locale, people, exporting } = ctx;
  const F = frameFor(format, 'top-left');
  const type = typeScale(F.short);
  const b = BRANDS[brand];
  const paper = paperFor(theme);
  const ink = inkFor(theme);
  const muted = mutedFor(theme);

  const person = people[0];
  const cutout = Boolean(person.cutout);
  const bleed = v<number>('bleed');
  const scale = v<number>('subjectScale');
  const softness = v<number>('softness');

  const raw = (v<string>('greeting') || t(COPY.birthday, locale)).trim();
  const parts = raw.split('\n');
  const headline = (parts.length > 1 ? parts.slice(1).join(' ') : parts[0]).trim();
  const kicker = parts.length > 1 ? parts[0].trim() : '';

  const kickerH = kicker ? Math.round(type.subtitle * 1.5) : 0;
  const headlineTop = F.content.top + kickerH;
  // The headline gets a band, and FitText measures the string to fill it
  // without exceeding it. The previous version guessed a size from the
  // character count, which on a landscape card produced a headline twice the
  // width of the card.
  const headlineBand = Math.round(F.content.height * (F.isWide ? 0.46 : 0.40));
  const headlineBottom = headlineTop + headlineBand;

  // The figure stands on the card's base line and reaches up into the
  // headline's last line. A wide card gives it the right third, a tall one
  // the right half.
  const subjectH = Math.round(format.height * (F.isWide ? 0.78 : 0.62) * scale);
  const subjectW = Math.round(F.content.width * (F.isWide ? 0.40 : 0.62) * scale);
  const subjectLeft = Math.round(format.width - F.margin - subjectW + (cutout ? subjectW * 0.10 : 0));
  const subjectTop = cutout
    ? format.height - subjectH
    : Math.round(Math.min(headlineBottom - headlineBand * 0.18, format.height - F.margin - subjectH));

  const nameMaxWidth = Math.round(
    (cutout ? subjectLeft + subjectW * 0.2 : subjectLeft) - F.margin - F.short * 0.03,
  );

  return (
    <div style={{ position: 'absolute', inset: 0, background: paper, fontFamily: FONT_TEXT, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.92 }}>
        <GradientField brand={brand} angle={F.isWide ? 112 : 152} sweep={false}>
          <Spheres brand={brand} shortEdge={F.short} softness={0.5 + softness * 0.5} variant="orbit" scale={1.3} />
        </GradientField>
      </div>
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(${F.isWide ? 98 : 172}deg, ${paper} 4%, ${paper}D4 32%, transparent 76%)`,
        }}
      />

      {kicker && (
        <div style={{
          position: 'absolute', zIndex: 3,
          left: F.content.left, top: F.content.top,
          fontFamily: FONT_DISPLAY, fontWeight: 700,
          fontSize: type.subtitle, letterSpacing: '0.06em',
          color: b.accent, textTransform: 'uppercase',
        }}>{kicker}</div>
      )}

      <FitText
        text={headline.toUpperCase()}
        family={FONT_DISPLAY}
        color={ink}
        width={Math.round(F.content.width * bleed)}
        maxHeight={headlineBand}
        maxLines={F.isWide ? 1 : 2}
        style={{ position: 'absolute', left: F.content.left, top: headlineTop, zIndex: 2, pointerEvents: 'none' }}
      />

      <EditableText
        field="greeting"
        value={v<string>('greeting')}
        exporting={exporting}
        placeholder="FELIZ ANIVERSÁRIO"
        style={{
          position: 'absolute', zIndex: 7,
          left: F.content.left, top: F.content.top,
          width: F.content.width * 0.42, minHeight: type.subtitle,
          fontFamily: FONT_DISPLAY, fontSize: type.subtitle,
          color: 'transparent', caretColor: ink, opacity: exporting ? 0 : 1,
        }}
      />

      <Subject
        person={person}
        index={0}
        exporting={exporting}
        short={F.short}
        cut={v<string>('cut') as never}
        box={{ left: subjectLeft, top: subjectTop, width: subjectW, height: subjectH }}
      />

      <div style={{ position: 'absolute', zIndex: 5, left: F.margin, bottom: F.margin, maxWidth: nameMaxWidth }}>
        <EditableText
          field="person:0:name"
          value={person.name}
          exporting={exporting}
          placeholder="Nome da pessoa"
          style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: type.title, lineHeight: 0.94, letterSpacing: '-0.015em',
            color: ink, textTransform: 'uppercase',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(F.short * 0.018), marginTop: Math.round(F.short * 0.016) }}>
          <span style={{ width: Math.round(F.short * 0.045), height: 3, background: b.accent, flexShrink: 0 }} />
          <EditableText
            field="person:0:role"
            value={person.role}
            exporting={exporting}
            placeholder="Cargo"
            style={{
              fontFamily: FONT_TEXT, fontWeight: 400, fontSize: type.caption,
              letterSpacing: '0.16em', color: muted, textTransform: 'uppercase',
            }}
          />
        </div>
      </div>

      {v<boolean>('showDate') && (
        <EditableText
          field="dateLabel"
          value={v<string>('dateLabel')}
          exporting={exporting}
          placeholder="12/06"
          style={{
            position: 'absolute', zIndex: 6,
            right: F.margin, top: F.content.top,
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: type.title, lineHeight: 0.9, letterSpacing: '-0.02em',
            color: b.accent, textAlign: 'right',
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
  tagline: 'Pôster com a pessoa em pé sobre o nome',
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
      hint: 'Ignorado quando a foto já está com o fundo recortado.',
    },
    { kind: 'number', id: 'subjectScale', label: 'Tamanho da pessoa', default: 1, min: 0.7, max: 1.35, step: 0.01, group: 'Composição' },
    { kind: 'number', id: 'bleed', label: 'Sangria do título', default: 1, min: 1, max: 1.45, step: 0.01, group: 'Composição', hint: 'Acima de 1 o título avança pela borda direita.' },
    { kind: 'number', id: 'softness', label: 'Difusão da luz', default: 0.45, min: 0, max: 1, step: 0.01, group: 'Composição' },
  ],
  render,
};
