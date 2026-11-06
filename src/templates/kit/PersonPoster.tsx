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
  // Reads on a diagonal: label and headline anchored to the top-left, the
  // figure standing bottom-right in front of a single brand disc, the name
  // in the clear corner the figure leaves behind. Nothing sits over the face
  // and nothing sits over the type.
  const wide = F.isWide;
  const discD = Math.round((wide ? format.height * 1.1 : format.width * 0.9) * disc);
  const discCx = Math.round(format.width * (wide ? 0.72 : 0.63));
  const discCy = Math.round(format.height * (wide ? 0.58 : 0.57));

  const subjectH = Math.round(format.height * (wide ? 0.88 : 0.72) * scale);
  const subjectW = Math.round(subjectH * 0.66);
  const subjectLeft = Math.round(discCx - subjectW / 2);

  // The headline takes the space the figure does not reach, plus a little of
  // the figure's own box — a cutout is narrower than the box that holds it.
  const headWidth = Math.round(Math.min(F.content.width, subjectLeft - F.margin + subjectW * 0.2));

  return (
    <div style={{ position: 'absolute', inset: 0, background: paper, fontFamily: FONT_TEXT, overflow: 'hidden' }}>
      {/* The depth is built in layers, back to front: atmosphere, the disc
          itself with its own lighting, the ring that proves it is a drawn
          object and not a fill, then the backlight the figure stands in. A
          flat circle behind a flat cutout is what made this read as a slide
          rather than as a poster. */}
      <div
        aria-hidden
        style={{
          position: 'absolute', zIndex: 0,
          left: discCx - discD * 0.72, top: discCy - discD * 0.72,
          width: discD * 1.44, height: discD * 1.44, borderRadius: '50%',
          background: `radial-gradient(circle, ${b.from}6B 0%, ${b.to}3D 48%, transparent 72%)`,
          filter: `blur(${Math.round(F.short * 0.075)}px)`,
        }}
      />

      <div
        aria-hidden
        style={{
          position: 'absolute', zIndex: 1,
          left: discCx - discD * 0.55, top: discCy - discD * 0.55,
          width: discD * 1.1, height: discD * 1.1, borderRadius: '50%',
          border: `${Math.max(1, Math.round(F.short * 0.0018))}px solid ${b.from}4D`,
        }}
      />

      <div
        aria-hidden
        style={{
          position: 'absolute', zIndex: 2,
          left: discCx - discD / 2, top: discCy - discD / 2,
          width: discD, height: discD, borderRadius: '50%',
          background: gradient(brand, 155),
          boxShadow: `0 ${Math.round(F.short * 0.045)}px ${Math.round(F.short * 0.13)}px rgba(0,0,0,0.45), inset 0 0 ${Math.round(F.short * 0.09)}px ${b.to}80`,
          overflow: 'hidden',
        }}
      >
        {/* The highlight is what gives the disc a direction of light. */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(58% 52% at 32% 24%, rgba(255,255,255,0.34) 0%, transparent 62%)`,
        }} />
      </div>

      {/* Backlight: the figure separates from the disc because something is
          lit behind it, not because of an outline. */}
      <div
        aria-hidden
        style={{
          position: 'absolute', zIndex: 3,
          left: Math.round(discCx - subjectW * 0.62), top: Math.round(format.height - subjectH * 0.92),
          width: Math.round(subjectW * 1.24), height: Math.round(subjectH * 0.82),
          background: 'radial-gradient(50% 46% at 50% 36%, rgba(255,255,255,0.30) 0%, transparent 70%)',
          filter: `blur(${Math.round(F.short * 0.02)}px)`,
        }}
      />

      {/* Contact shadow, so the figure stands on the card instead of floating
          over it. */}
      <div
        aria-hidden
        style={{
          position: 'absolute', zIndex: 3,
          left: Math.round(discCx - subjectW * 0.42), bottom: Math.round(F.short * 0.012),
          width: Math.round(subjectW * 0.84), height: Math.round(F.short * 0.045),
          borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(0,0,0,0.55) 0%, transparent 100%)',
          filter: `blur(${Math.round(F.short * 0.012)}px)`,
        }}
      />

      <div style={{
        position: 'absolute', zIndex: 5, left: F.margin, top: F.margin,
        width: headWidth, display: 'flex', flexDirection: 'column', gap: Math.round(F.short * 0.024),
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
          maxHeight={Math.round(format.height * 0.34)}
          maxLines={wide ? 2 : 3}
          lineHeight={0.88}
          style={{ textShadow: `0 ${Math.round(F.short * 0.016)}px ${Math.round(F.short * 0.05)}px rgba(0,0,0,0.45)` }}
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

      <div style={{
        position: 'absolute', zIndex: 6, left: F.margin, bottom: F.margin,
        display: 'flex', gap: Math.round(F.short * 0.022),
      }}>
        <span aria-hidden style={{ width: Math.max(2, Math.round(F.short * 0.004)), background: b.accent, borderRadius: 99 }} />
        {nameBlock(Math.round(format.width * (wide ? 0.34 : 0.46)))}
      </div>

      {/* Set up the right edge: the kind of mark a designer leaves and a
          generator never does. */}
      <div
        aria-hidden
        style={{
          position: 'absolute', zIndex: 6,
          right: Math.round(F.margin * 0.38), bottom: F.margin,
          writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          display: 'flex', alignItems: 'center', gap: Math.round(F.short * 0.016),
          fontFamily: FONT_TEXT, fontWeight: 700, fontSize: Math.round(type.micro * 0.82),
          letterSpacing: '0.34em', color: `${ink}8A`, textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ height: Math.round(F.short * 0.06), width: 1, background: `${ink}59` }} />
        {b.label}
      </div>

      {/* Vignette, drawn last over everything but the grain: it is what pulls
          the eye back to the centre of the frame. */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, zIndex: 7, pointerEvents: 'none',
          background: `radial-gradient(78% 68% at 56% 48%, transparent 38%, rgba(0,0,0,0.42) 100%)`,
        }}
      />

      <PhraseEditor
        field={phraseField} value={phraseValue} placeholder={phrasePlaceholder}
        exporting={exporting} left={F.margin} top={F.margin} width={headWidth}
        size={type.subtitle} caret={ink}
      />
      <Grain opacity={0.11} />
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
