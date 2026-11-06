import React from 'react';
import type { FieldSpec, RenderContext } from '../types';
import { BRANDS, FONT_DISPLAY, FONT_TEXT, gradient, typeScale } from '../../design/brand';
import { Grain, inkFor, mutedFor, paperFor } from './Surface';
import { EditableText } from './Editable';
import { FitText } from './FitText';
import { Subject } from './Subject';
import { Mark, frameFor } from './Layout';

// The shared person card.
//
// Aniversário and Momentos had grown near-identical copies of the same solo
// layout, so it lives here once and the templates supply their own words.
//
// The composition is the one every working spotlight poster uses: the figure
// is cut out and placed in front of ONE geometric form, and the type sits in
// clear space beside it. The previous version set the phrase as a wall of
// type *behind* the person — that only works with a full-length figure and a
// condensed face; with a half-body corporate headshot the letters came out
// of the model's head and nothing could be read.

export type Composition = 'spotlight' | 'edge';

/**
 * Fields every person card needs. Spread into a template's own list so the
 * two cannot drift apart, which is how the group farewell card ended up
 * fading its band to a different colour than the group job-change card.
 */
export const personPosterFields: FieldSpec[] = [
  {
    kind: 'select', id: 'composition', label: 'Composição', default: 'spotlight', group: 'Composição',
    options: [
      { value: 'spotlight', label: 'Holofote' },
      { value: 'edge', label: 'Bloco lateral' },
    ],
  },
  { kind: 'number', id: 'subjectScale', label: 'Tamanho da pessoa', default: 1, min: 0.75, max: 1.3, step: 0.01, group: 'Composição' },
  { kind: 'number', id: 'discSize', label: 'Tamanho do disco', default: 1, min: 0.6, max: 1.35, step: 0.01, group: 'Composição', hint: 'A forma de marca atrás da pessoa.' },
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
  /** Small caps line above the headline. */
  label?: string;
  /** An optional extra line under the role — a date, a previous role. */
  extra?: React.ReactNode;
}

export const PersonPoster: React.FC<PersonPosterProps> = ({
  ctx, phrase, phraseField, phraseValue, phrasePlaceholder, label, extra,
}) => {
  const { v, format, theme, brand, people, exporting } = ctx;
  const mode = v<string>('composition') as Composition;
  const F = frameFor(format, mode === 'edge' ? 'bottom-left' : 'top-right');
  const type = typeScale(F.short);
  const b = BRANDS[brand];
  const paper = paperFor(theme);
  const ink = inkFor(theme);
  const muted = mutedFor(theme);

  const person = people[0];
  const scale = v<number>('subjectScale');
  const disc = v<number>('discSize');

  const nameBlock = (width: number, nameColor: string = ink, roleColor: string = muted) => (
    <div style={{ width, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <EditableText
        field="person:0:name"
        value={person.name}
        exporting={exporting}
        placeholder="Nome da pessoa"
        style={{
          fontFamily: FONT_DISPLAY, fontWeight: 700,
          fontSize: type.title, lineHeight: 1.0, letterSpacing: '0.01em',
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
          marginTop: Math.round(F.short * 0.014),
        }}
      />
      {extra}
    </div>
  );

  if (mode === 'edge') {
    // --- Asymmetric block -------------------------------------------------
    // A solid brand block holds a third of the frame, the phrase runs up its
    // inner edge, and the figure is cropped by the opposite edge.
    const blockW = Math.round(format.width * 0.33);
    const subjectH = Math.round(format.height * 0.96 * scale);
    const subjectW = Math.round(subjectH * 0.74);
    const subjectLeft = Math.round(format.width - subjectW * 0.82);
    const runLength = format.height - F.margin * 2;

    return (
      <div style={{ position: 'absolute', inset: 0, background: paper, fontFamily: FONT_TEXT, overflow: 'hidden' }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(70% 60% at 72% 30%, ${b.from}3D 0%, transparent 70%)`,
        }} />

        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: blockW, background: gradient(brand, 165), zIndex: 2 }} />

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
          {nameBlock(Math.round(format.width * 0.34))}
        </div>

        <PhraseEditor
          field={phraseField} value={phraseValue} placeholder={phrasePlaceholder}
          exporting={exporting} left={blockW + F.margin} top={F.margin}
          width={Math.round(F.content.width * 0.4)} size={type.subtitle} caret={ink}
        />
        <Grain opacity={0.05} />
        <Mark brand={brand} format={format} slot="bottom-left" color={b.onGradient} width={F.short * 0.13} />
      </div>
    );
  }

  // --- Spotlight ----------------------------------------------------------
  //
  // Clean and fluid, which is the whole brief. One flowing form, the figure
  // in front of it, type in open space, and nothing else — the previous pass
  // stacked a ring, a vignette, visible grain, an accent rule and a vertical
  // caption on top of each other and the card stopped breathing.
  //
  // The form is asymmetric and tilted and runs off the right edge, so the
  // movement comes from the shape itself rather than from decoration laid
  // over it.
  const wide = F.isWide;
  const blobW = Math.round((wide ? format.width * 0.72 : format.width * 1.02) * disc);
  const blobH = Math.round(blobW * 1.06);
  const blobCx = Math.round(format.width * (wide ? 0.74 : 0.66));
  const blobCy = Math.round(format.height * (wide ? 0.56 : 0.58));
  const FLUID = '62% 38% 44% 56% / 48% 42% 58% 52%';

  const subjectH = Math.round(format.height * (wide ? 0.86 : 0.7) * scale);
  const subjectW = Math.round(subjectH * 0.66);
  const subjectLeft = Math.round(blobCx - subjectW / 2);

  // The headline takes the space the figure does not reach, plus a little of
  // the figure's own box — a cutout is narrower than the box that holds it.
  const headWidth = Math.round(Math.min(F.content.width, subjectLeft - F.margin + subjectW * 0.18));

  const blob = (grow: number, style: React.CSSProperties) => ({
    position: 'absolute' as const,
    left: Math.round(blobCx - (blobW * grow) / 2),
    top: Math.round(blobCy - (blobH * grow) / 2),
    width: Math.round(blobW * grow), height: Math.round(blobH * grow),
    borderRadius: FLUID,
    ...style,
  });

  return (
    <div style={{ position: 'absolute', inset: 0, background: paper, fontFamily: FONT_TEXT, overflow: 'hidden' }}>
      {/* Two layers only: the form, and its own soft echo. */}
      <div aria-hidden style={blob(1.3, {
        zIndex: 0,
        background: `radial-gradient(circle at 36% 30%, ${b.from}3D 0%, ${b.to}1F 55%, transparent 76%)`,
        filter: `blur(${Math.round(F.short * 0.05)}px)`,
        transform: 'rotate(-14deg)',
      })} />
      <div aria-hidden style={blob(1, {
        zIndex: 1,
        background: gradient(brand, 148),
        transform: 'rotate(-8deg)',
      })} />

      <div style={{
        position: 'absolute', zIndex: 5, left: F.margin, top: F.margin,
        width: headWidth, display: 'flex', flexDirection: 'column', gap: Math.round(F.short * 0.026),
      }}>
        {label && (
          <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(F.short * 0.018) }}>
            <span style={{ width: Math.round(F.short * 0.05), height: 2, background: b.accent }} />
            <span style={{
              fontFamily: FONT_TEXT, fontWeight: 700, fontSize: type.micro,
              letterSpacing: '0.28em', color: b.accent, textTransform: 'uppercase',
            }}>{label}</span>
          </div>
        )}
        <FitText
          text={phrase.replace(/\n/g, ' ').toUpperCase()}
          family={FONT_DISPLAY}
          color={ink}
          width={headWidth}
          maxHeight={Math.round(format.height * 0.32)}
          maxLines={wide ? 2 : 3}
          lineHeight={0.9}
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

      <div style={{ position: 'absolute', zIndex: 6, left: F.margin, bottom: F.margin }}>
        {nameBlock(Math.round(format.width * (wide ? 0.34 : 0.46)))}
      </div>

      <PhraseEditor
        field={phraseField} value={phraseValue} placeholder={phrasePlaceholder}
        exporting={exporting} left={F.margin} top={F.margin} width={headWidth}
        size={type.subtitle} caret={ink}
      />
      <Grain opacity={0.04} />
      <Mark brand={brand} format={format} slot="top-right" color={ink} width={F.short * 0.13} />
    </div>
  );
};

/**
 * The phrase stays editable through a transparent overlay: the visible copy
 * is laid out by FitText, which measures and may re-wrap it, and one element
 * cannot be both measured and contenteditable.
 */
const PhraseEditor: React.FC<{
  field: string; value: string; placeholder: string; exporting: boolean;
  left: number; top: number; width: number; size: number; caret: string;
}> = ({ field, value, placeholder, exporting, left, top, width, size, caret }) => (
  <EditableText
    field={field}
    value={value}
    exporting={exporting}
    placeholder={placeholder}
    style={{
      position: 'absolute', zIndex: 8, left, top, width, minHeight: size,
      fontFamily: FONT_DISPLAY, fontSize: size,
      color: 'transparent', caretColor: caret, opacity: exporting ? 0 : 1,
    }}
  />
);
