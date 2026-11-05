import React from 'react';
import type { FieldSpec, RenderContext } from '../types';
import { BRANDS, FONT_DISPLAY, FONT_TEXT, typeScale } from '../../design/brand';
import { GradientField, Grain, Spheres, inkFor, mutedFor, paperFor } from './Surface';
import { EditableText } from './Editable';
import { FitText } from './FitText';
import { Subject } from './Subject';
import { Mark, frameFor } from './Layout';

// The shared person card.
//
// Aniversário and Momentos had grown near-identical copies of the same solo
// layout — same frame, same gradient, same centred figure, differing only in
// which words they put on it. Two compositions times two templates would
// have been four copies, so the layout lives here once and the templates
// supply their own phrase and their own extra line.

export type Composition = 'typewall' | 'edge';

/** Mix a hex colour towards black. `amount` 0 = unchanged, 1 = black. */
const shade = (hex: string, amount: number): string => {
  const n = parseInt(hex.slice(1), 16);
  const f = 1 - Math.max(0, Math.min(1, amount));
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * f).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
};

/**
 * Fields every person card needs. Spread into a template's own list so the
 * two cannot drift apart, which is how the group farewell card ended up
 * fading its band to a different colour than the group job-change card.
 */
export const personPosterFields: FieldSpec[] = [
  {
    kind: 'select', id: 'composition', label: 'Composição', default: 'typewall', group: 'Composição',
    options: [
      { value: 'typewall', label: 'Muro de texto' },
      { value: 'edge', label: 'Bloco lateral' },
    ],
  },
  { kind: 'number', id: 'subjectScale', label: 'Tamanho da pessoa', default: 1, min: 0.75, max: 1.3, step: 0.01, group: 'Composição' },
  { kind: 'number', id: 'bleed', label: 'Sangria do título', default: 0.12, min: 0, max: 0.7, step: 0.01, group: 'Composição', hint: 'Quanto o texto passa das bordas. No muro de texto isso é proposital — é o que deixa as letras cortadas.' },
  { kind: 'number', id: 'wallLines', label: 'Linhas do muro', default: 4, min: 2, max: 6, step: 1, group: 'Composição', hint: 'Só no muro de texto. A frase se repete até preencher.' },
  { kind: 'number', id: 'softness', label: 'Difusão da luz', default: 0.45, min: 0, max: 1, step: 0.01, group: 'Composição' },
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
];

interface PersonPosterProps {
  ctx: RenderContext;
  /** The display phrase, already resolved to its language. */
  phrase: string;
  /** Field id backing the phrase, so it stays editable on the card. */
  phraseField: string;
  /** Raw stored value of that field, which may be empty (meaning "default"). */
  phraseValue: string;
  phrasePlaceholder: string;
  /** An optional extra line under the role — a date, a previous role. */
  extra?: React.ReactNode;
}

export const PersonPoster: React.FC<PersonPosterProps> = ({
  ctx, phrase, phraseField, phraseValue, phrasePlaceholder, extra,
}) => {
  const { v, format, theme, brand, people, exporting } = ctx;
  const mode = v<string>('composition') as Composition;
  const F = frameFor(format, mode === 'edge' ? 'bottom-left' : 'bottom-right');
  const type = typeScale(F.short);
  const b = BRANDS[brand];
  const paper = paperFor(theme);
  const ink = inkFor(theme);
  const muted = mutedFor(theme);

  const person = people[0];
  const cutout = Boolean(person.cutout);
  const scale = v<number>('subjectScale');
  const softness = v<number>('softness');
  const bleed = v<number>('bleed');

  // The wall is dark type on a bright gradient, like the reference: mixing
  // the brand's far end down to ~35% gives a shade that belongs to the
  // gradient instead of a neutral black sitting on top of it.
  const wallInk = shade(b.to, 0.62);
  const wallMuted = `${wallInk}B8`;

  const backdrop = (
    <>
      <div style={{ position: 'absolute', inset: 0, opacity: mode === 'edge' ? 0.92 : 1 }}>
        <GradientField brand={brand} angle={F.isWide ? 112 : 152} sweep={mode !== 'edge'}>
          <Spheres brand={brand} shortEdge={F.short} softness={0.5 + softness * 0.5} variant="orbit" scale={1.3} />
        </GradientField>
      </div>
      {mode === 'edge' && (
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(${F.isWide ? 98 : 172}deg, ${paper}F2 2%, ${paper}99 38%, transparent 78%)`,
          }}
        />
      )}
    </>
  );

  // The editable phrase is a transparent overlay rather than the visible
  // text: the visible copy is laid out by FitText, which measures and may
  // wrap it, and a contenteditable cannot be both.
  const phraseEditor = (
    <EditableText
      field={phraseField}
      value={phraseValue}
      exporting={exporting}
      placeholder={phrasePlaceholder}
      style={{
        position: 'absolute', zIndex: 8,
        left: F.margin, top: F.margin,
        width: F.content.width * 0.42, minHeight: type.subtitle,
        fontFamily: FONT_DISPLAY, fontSize: type.subtitle,
        color: 'transparent', caretColor: ink, opacity: exporting ? 0 : 1,
      }}
    />
  );

  const nameBlock = (align: 'left' | 'center', width: number, nameColor: string = ink, roleColor: string = muted) => (
    <div style={{ width, textAlign: align, display: 'flex', flexDirection: 'column', alignItems: align === 'center' ? 'center' : 'flex-start' }}>
      <EditableText
        field="person:0:name"
        value={person.name}
        exporting={exporting}
        placeholder="Nome da pessoa"
        style={{
          fontFamily: FONT_DISPLAY, fontWeight: 700,
          fontSize: type.subtitle, lineHeight: 1.0, letterSpacing: '0.01em',
          color: nameColor, textTransform: 'uppercase',
        }}
      />
      <EditableText
        field="person:0:role"
        value={person.role}
        exporting={exporting}
        placeholder="Cargo"
        style={{
          fontFamily: FONT_TEXT, fontWeight: 400, fontSize: type.micro,
          letterSpacing: '0.22em', color: roleColor, textTransform: 'uppercase',
          marginTop: Math.round(F.short * 0.012),
        }}
      />
      {extra}
    </div>
  );

  if (mode === 'edge') {
    // --- C: asymmetric block --------------------------------------------
    // A solid brand block holds a third of the frame, the phrase runs up its
    // inner edge, and the figure is cropped by the opposite edge. Most of
    // the card is deliberately empty.
    const blockW = Math.round(format.width * 0.33);
    const subjectH = Math.round(format.height * 0.96 * scale);
    const subjectW = Math.round(subjectH * 0.74);
    // Cropped by the right edge: the figure runs past it on purpose.
    const subjectLeft = Math.round(format.width - subjectW * 0.82);
    const runLength = format.height - F.margin * 2;

    return (
      <div style={{ position: 'absolute', inset: 0, background: paper, fontFamily: FONT_TEXT, overflow: 'hidden' }}>
        {backdrop}

        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: blockW, background: b.to, zIndex: 2 }} />

        {/* Rotated so the fit width becomes the vertical run. */}
        <div
          style={{
            position: 'absolute', zIndex: 3,
            left: Math.round(blockW * 0.42), bottom: F.margin,
            width: runLength, transformOrigin: 'left bottom', transform: 'rotate(-90deg)',
          }}
        >
          <FitText
            text={phrase.replace(/\n/g, ' ').toUpperCase()}
            family={FONT_DISPLAY}
            color={b.onGradient}
            width={runLength}
            maxHeight={Math.round(blockW * 0.9)}
            maxLines={1}
          />
        </div>

        <Subject
          person={person}
          index={0}
          exporting={exporting}
          short={F.short}
          cut={v<string>('cut') as never}
          box={{ left: subjectLeft, top: format.height - subjectH, width: subjectW, height: subjectH }}
          zIndex={4}
        />

        <div style={{ position: 'absolute', zIndex: 6, left: blockW + F.margin, bottom: F.margin }}>
          {nameBlock('left', Math.round(format.width * 0.34))}
        </div>

        {phraseEditor}
        <Grain opacity={0.05} />
        <Mark brand={brand} format={format} slot="bottom-left" color={b.onGradient} width={F.short * 0.13} />
      </div>
    );
  }

  // --- B: wall of type ---------------------------------------------------
  //
  // The phrase IS the background. Not a headline sitting on a gradient: a
  // stack of rows that each span the full card width, bleeding past both
  // side edges, set dark against a bright gradient so the type reads as a
  // printed wall with the person standing in front of it.
  //
  // A short phrase ("SEJA BEM-VINDO" is two words) would otherwise make two
  // lines and leave two thirds of the card empty, so the words repeat until
  // the wall is full — which is also what the reference does.
  const rows = Math.round(v<number>('wallLines'));
  const wallWidth = Math.round(format.width * (1 + bleed));
  const wallLeft = Math.round((format.width - wallWidth) / 2);
  // The wall stops short of the foot of the card: the name and the mark need
  // clean gradient to sit on, and on top of the letters they were unreadable.
  const captionH = Math.round(F.short * 0.15);
  const wallH = format.height - captionH;
  const rowH = wallH / rows;
  const words = phrase.replace(/\n/g, ' ').toUpperCase().split(/\s+/).filter(Boolean);
  const stream = words.length ? Array.from({ length: Math.ceil(rows / words.length) }, () => words).flat() : [''];
  const lines = Array.from({ length: rows }, (_, i) =>
    stream.slice(Math.floor((i * stream.length) / rows), Math.floor(((i + 1) * stream.length) / rows)).join(' ') || stream[0]);

  const subjectH = Math.round(wallH * 0.98 * scale);
  const subjectW = Math.round(subjectH * 0.62);

  return (
    <div style={{ position: 'absolute', inset: 0, background: paper, fontFamily: FONT_TEXT, overflow: 'hidden' }}>
      {backdrop}

      {/* Bleeding past both side edges is the composition here, so the
          wrapper marks it exempt from the margin audit every other element
          obeys. */}
      <div
        data-bleed="1"
        style={{
          position: 'absolute', left: wallLeft, top: 0, width: wallWidth, height: wallH,
          overflow: 'hidden',
          zIndex: 2, pointerEvents: 'none', display: 'flex', flexDirection: 'column',
        }}
      >
        {lines.map((line, i) => (
          // Each row gets an equal slice of the height and its own size, so
          // every row reaches both edges. Letters overrun their row and
          // touch the next one, which is the look, not a bug.
          <div key={i} style={{ height: rowH, display: 'flex', alignItems: 'center', overflow: 'visible' }}>
            <FitText
              text={line}
              family={FONT_DISPLAY}
              color={wallInk}
              width={wallWidth}
              maxSize={rowH * 1.9}
              maxLines={1}
              lineHeight={1}
            />
          </div>
        ))}
      </div>

      <Subject
        person={person}
        index={0}
        exporting={exporting}
        short={F.short}
        cut={v<string>('cut') as never}
        box={{
          left: Math.round((format.width - subjectW) / 2),
          top: cutout ? wallH - subjectH : Math.round(format.height * 0.14),
          width: subjectW,
          height: subjectH,
        }}
        zIndex={4}
      />

      <div style={{
        position: 'absolute', zIndex: 6, left: F.margin, right: F.margin,
        top: wallH, height: captionH,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {nameBlock('center', F.content.width, wallInk, wallMuted)}
      </div>

      {phraseEditor}
      <Grain opacity={0.07} />
      <Mark brand={brand} format={format} slot="bottom-right" color={wallInk} width={F.short * 0.13} />
    </div>
  );
};
