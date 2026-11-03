import React from 'react';
import type { Template, RenderContext, Person } from './types';
import { FONT_DISPLAY, FONT_TEXT, BRANDS, COPY, t, typeScale, space } from '../design/brand';
import { BrandMark } from '../design/BrandMark';
import { GradientField, Grain, Spheres, inkFor, mutedFor, paperFor } from './kit/Surface';
import { EditableText, EditablePhoto } from './kit/Editable';

// --- MOMENTOS ---------------------------------------------------------------
//
// One template where the old build had three — Welcome Aboard, See You Soon
// and Job Change — plus separate group variants of two of them, which is five
// near-identical renderers. They differ in exactly one thing: the words. So
// they are one template with a `moment` switch.
//
// That is not only less code. Those five drifted apart over time: the group
// farewell card faded its band into the body colour while the group job-change
// card faded into white, leaving a grey seam in dark mode on one and not the
// other. Sharing the renderer makes that class of difference impossible.
//
// The layout adapts to how many people are on it rather than being a separate
// card: one person gets a split composition, several get a band and a grid.

const MAX_PEOPLE = 12;

const momentPhrase = (moment: string, locale: RenderContext['locale']) => {
  switch (moment) {
    case 'farewell': return t(COPY.farewell, locale);
    case 'promotion': return t(COPY.newRole, locale);
    default: return t(COPY.welcome, locale);
  }
};

const render = (ctx: RenderContext) => {
  const { v, format, theme, brand, locale, people, exporting } = ctx;
  const shortEdge = Math.min(format.width, format.height);
  const type = typeScale(shortEdge);
  const sp = space(shortEdge);
  const b = BRANDS[brand];
  const paper = paperFor(theme);
  const ink = inkFor(theme);
  const muted = mutedFor(theme);

  const moment = v<string>('moment');
  const softness = v<number>('softness');
  const phrase = v<string>('phrase') || momentPhrase(moment, locale);
  const roster = people.slice(0, MAX_PEOPLE);
  const isGroup = roster.length > 1;
  const isWide = format.width > format.height;

  return (
    <div style={{ position: 'absolute', inset: 0, background: paper, fontFamily: FONT_TEXT, overflow: 'hidden' }}>
      {isGroup
        ? <GroupLayout {...{ ctx, phrase, softness, roster, shortEdge, type, sp, b, paper, ink, muted, isWide }} />
        : <SoloLayout {...{ ctx, phrase, softness, person: roster[0], shortEdge, type, sp, b, paper, ink, muted, isWide, moment }} />}
    </div>
  );
};

// --- ONE PERSON -------------------------------------------------------------

const SoloLayout: React.FC<any> = ({ ctx, phrase, softness, person, shortEdge, type, sp, b, ink, muted, isWide, moment }) => {
  const { format, brand, exporting, v } = ctx as RenderContext;
  // The gradient panel takes the lead on a wide card and the base on a tall
  // one, so the portrait always gets the larger, better-proportioned area.
  const panel = isWide ? 0.46 : 0.42;

  return (
    <>
      <EditablePhoto
        personIndex={0}
        url={person.photoUrl}
        zoom={person.photoZoom}
        offset={person.photoOffset}
        exporting={exporting}
        frame={{
          width: isWide ? format.width * (1 - panel) : format.width,
          height: isWide ? format.height : format.height * (1 - panel),
        }}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: isWide ? `${(1 - panel) * 100}%` : '100%',
          height: isWide ? '100%' : `${(1 - panel) * 100}%`,
        }}
      />

      <div style={{
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: isWide ? `${panel * 100}%` : '100%',
        height: isWide ? '100%' : `${panel * 100}%`,
        zIndex: 2,
      }}>
        <GradientField brand={brand} angle={isWide ? 155 : 120}>
          <Spheres brand={brand} shortEdge={shortEdge} softness={softness} variant="corners" scale={0.75} />
          <Grain opacity={0.06} />
        </GradientField>

        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          padding: sp.gutter,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: sp.tight,
        }}>
          <EditableText
            field="phrase"
            value={phrase}
            exporting={exporting}
            placeholder="SEJA BEM-VINDO"
            style={{
              fontFamily: FONT_DISPLAY, fontWeight: 700,
              fontSize: type.display, lineHeight: 0.94, letterSpacing: '-0.025em',
              color: b.onGradient, whiteSpace: 'pre-line',
            }}
          />

          <div style={{ height: Math.max(2, shortEdge * 0.004), width: shortEdge * 0.1, background: 'rgba(255,255,255,0.75)', margin: `${sp.tight}px 0` }} />

          <EditableText
            field="person:0:name"
            value={person.name}
            exporting={exporting}
            placeholder="Nome da pessoa"
            style={{
              fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: type.subtitle,
              color: b.onGradient, textTransform: 'uppercase', lineHeight: 1.05,
            }}
          />
          <EditableText
            field="person:0:role"
            value={person.role}
            exporting={exporting}
            placeholder="Cargo"
            style={{
              fontFamily: FONT_TEXT, fontWeight: 300, fontSize: type.caption,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.85)',
            }}
          />

          {moment === 'promotion' && v<boolean>('showPrevious') && (
            <EditableText
              field="previousRole"
              value={v<string>('previousRole')}
              exporting={exporting}
              placeholder="Cargo anterior"
              style={{
                fontFamily: FONT_TEXT, fontWeight: 300, fontSize: type.micro,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.6)', textDecoration: 'line-through',
                marginTop: sp.hair,
              }}
            />
          )}
        </div>
      </div>

      <BrandMark
        brand={brand}
        width={shortEdge * 0.18}
        color={b.onGradient}
        style={{ position: 'absolute', left: sp.gutter, top: sp.gutter, zIndex: 4 }}
      />
      <span style={{ display: 'none' }}>{ink}{muted}</span>
    </>
  );
};

// --- SEVERAL PEOPLE ---------------------------------------------------------

const GroupLayout: React.FC<any> = ({ ctx, phrase, softness, roster, shortEdge, type, sp, b, paper, ink, muted }) => {
  const { format, brand, exporting } = ctx as RenderContext;

  // Columns chosen so a tile never falls below a size where the name stops
  // fitting; the card grows downward instead of shrinking the faces.
  const count = roster.length;
  const columns = count <= 2 ? count : count <= 6 ? 3 : 4;
  const gap = sp.tight;
  const gridWidth = format.width - sp.gutter * 2;
  const tile = (gridWidth - gap * (columns - 1)) / columns;
  const rows = Math.ceil(count / columns);
  const bandHeight = format.height - sp.gutter * 2 - rows * tile - (rows - 1) * gap - sp.block;

  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: Math.max(bandHeight, shortEdge * 0.22) }}>
        <GradientField brand={brand} angle={120}>
          <Spheres brand={brand} shortEdge={shortEdge} softness={softness} variant="arc" scale={0.7} />
          <Grain opacity={0.06} />
        </GradientField>

        <BrandMark
          brand={brand}
          width={shortEdge * 0.16}
          color={b.onGradient}
          style={{ position: 'absolute', left: sp.gutter, top: sp.gutter, zIndex: 3 }}
        />

        <EditableText
          field="phrase"
          value={phrase}
          exporting={exporting}
          placeholder="SEJA BEM-VINDO"
          style={{
            position: 'absolute', zIndex: 3,
            left: sp.gutter, right: sp.gutter, bottom: sp.block,
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: type.headline, lineHeight: 0.96, letterSpacing: '-0.025em',
            color: b.onGradient, whiteSpace: 'pre-line',
          }}
        />
      </div>

      <div style={{
        position: 'absolute',
        left: sp.gutter, right: sp.gutter, bottom: sp.gutter,
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
        zIndex: 2,
      }}>
        {roster.map((person: Person, i: number) => (
          <div key={person.id} style={{ position: 'relative', height: tile, borderRadius: Math.round(shortEdge * 0.02), overflow: 'hidden', background: paper }}>
            <EditablePhoto
              personIndex={i}
              url={person.photoUrl}
              zoom={person.photoZoom}
              offset={person.photoOffset}
              exporting={exporting}
              frame={{ width: tile, height: tile }}
              style={{ position: 'absolute', inset: 0 }}
            />
            <div
              aria-hidden
              style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.25) 38%, transparent 62%)',
              }}
            />
            {/* Editable on the tile, like everywhere else. These were plain
                text at first, which left no way at all to type a name once a
                card had more than one person on it. */}
            <div style={{ position: 'absolute', left: sp.tight, right: sp.tight, bottom: sp.tight, zIndex: 2 }}>
              <EditableText
                field={`person:${i}:name`}
                value={person.name}
                exporting={exporting}
                placeholder="Nome"
                style={{
                  fontFamily: FONT_DISPLAY, fontWeight: 700,
                  fontSize: Math.round(tile * 0.095), lineHeight: 1.08,
                  color: '#FFFFFF', textTransform: 'uppercase',
                }}
              />
              <EditableText
                field={`person:${i}:role`}
                value={person.role}
                exporting={exporting}
                placeholder="Cargo"
                style={{
                  fontFamily: FONT_TEXT, fontWeight: 300,
                  fontSize: Math.round(tile * 0.062), lineHeight: 1.2,
                  color: 'rgba(255,255,255,0.82)', textTransform: 'uppercase',
                  letterSpacing: '0.08em', marginTop: 2,
                  maxHeight: Math.round(tile * 0.062) * 2.4, overflow: 'hidden',
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <span style={{ display: 'none' }}>{ink}{muted}</span>
    </>
  );
};

export const milestone: Template = {
  id: 'milestone',
  name: 'Momentos',
  tagline: 'Boas-vindas, despedida e promoção',
  family: 'pessoas',
  formats: ['post-square', 'post-portrait', 'story', 'landscape'],
  groups: ['Conteúdo', 'Composição'],
  group: { min: 1, max: MAX_PEOPLE },
  fields: [
    {
      kind: 'select', id: 'moment', label: 'Momento', default: 'welcome', group: 'Conteúdo',
      options: [
        { value: 'welcome', label: 'Boas-vindas' },
        { value: 'farewell', label: 'Despedida' },
        { value: 'promotion', label: 'Promoção' },
      ],
    },
    { kind: 'text', id: 'phrase', label: 'Frase', default: '', group: 'Conteúdo', hint: 'Vazio usa a frase do momento e do idioma.' },
    { kind: 'toggle', id: 'showPrevious', label: 'Mostrar cargo anterior', default: true, group: 'Conteúdo', hint: 'Só aparece no momento Promoção.' },
    { kind: 'text', id: 'previousRole', label: 'Cargo anterior', default: '', group: 'Conteúdo' },
    { kind: 'number', id: 'softness', label: 'Desfoque das esferas', default: 0.3, min: 0, max: 1, step: 0.01, group: 'Composição' },
  ],
  render,
};
