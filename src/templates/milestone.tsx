import React from 'react';
import type { Template, RenderContext, Person, Format, BrandKey, ThemeId, Locale } from './types';
import { FONT_DISPLAY, FONT_TEXT, BRANDS, COPY, t, typeScale } from '../design/brand';
import { BrandMark } from '../design/BrandMark';
import { GradientField, Grain, Spheres, inkFor, mutedFor, paperFor } from './kit/Surface';
import { EditableText, EditablePhoto } from './kit/Editable';
import { Mark, frameFor, groupRhythm } from './kit/Layout';
import { PersonPoster, personPosterFields } from './kit/PersonPoster';
import { FitText } from './kit/FitText';
import { Subject } from './kit/Subject';

// --- MOMENTOS ---------------------------------------------------------------
//
// One template where the old build had five renderers (welcome, farewell,
// job change, plus two group variants). They differed only in wording and
// had already drifted apart visually.
//
// Second pass, after an audit measured 26 collisions in the first one. The
// group layout had placed an absolutely positioned band, computed its height
// from whatever the grid left over, and dropped the headline inside it — so
// the moment a fourth person arrived the band shrank, the headline climbed,
// and it ran straight through the brand mark. Every one of those 26 was that
// single structural mistake.
//
// It is a flow layout now: a header row and a grid, stacked. Nothing is
// positioned against the card's edges, so nothing can be pushed into
// anything else. The composition got bolder at the same time — the group is
// no longer a uniform contact sheet but a hero tile with a rhythm beside it.

const MAX_PEOPLE = 12;

const momentPhrase = (moment: string, locale: Locale) => {
  switch (moment) {
    case 'farewell': return t(COPY.farewell, locale);
    case 'promotion': return t(COPY.newRole, locale);
    default: return t(COPY.welcome, locale);
  }
};

interface Shared {
  ctx: RenderContext;
  format: Format;
  brand: BrandKey;
  theme: ThemeId;
  phrase: string;
  softness: number;
}

const render = (ctx: RenderContext) => {
  const { v, format, theme, brand, locale, people } = ctx;
  const paper = paperFor(theme);
  const moment = v<string>('moment');
  const phrase = (v<string>('phrase') || momentPhrase(moment, locale)).trim();
  const softness = v<number>('softness');
  const roster = people.slice(0, MAX_PEOPLE);
  const shared: Shared = { ctx, format, brand, theme, phrase, softness };

  return (
    <div style={{ position: 'absolute', inset: 0, background: paper, fontFamily: FONT_TEXT, overflow: 'hidden' }}>
      {roster.length > 1
        ? <GroupLayout {...shared} roster={roster} />
        : <SoloLayout {...shared} person={roster[0]} moment={moment} />}
    </div>
  );
};

// --- ONE PERSON -------------------------------------------------------------
// Same device as the birthday card so the family reads as one system: the
// phrase set oversized and cropped by the frame, with the portrait in a hard
// cut sitting over it.

const SoloLayout: React.FC<Shared & { person: Person; moment: string }> = ({
  ctx, format, brand, phrase, moment,
}) => {
  const { v, exporting } = ctx;
  const F = frameFor(format, 'top-left');
  const type = typeScale(F.short);
  const b = BRANDS[brand];

  return (
    <PersonPoster
      ctx={ctx}
      phrase={phrase}
      phraseField="phrase"
      phraseValue={v<string>('phrase')}
      phrasePlaceholder="SEJA BEM-VINDO"
      extra={moment === 'promotion' && v<boolean>('showPrevious') && v<string>('previousRole') ? (
        <EditableText
          field="previousRole"
          value={v<string>('previousRole')}
          exporting={exporting}
          placeholder="Cargo anterior"
          style={{
            fontFamily: FONT_TEXT, fontWeight: 400, fontSize: type.micro,
            letterSpacing: '0.18em', color: b.accent, textTransform: 'uppercase',
            textDecoration: 'line-through', opacity: 0.8,
            marginTop: Math.round(F.short * 0.014),
          }}
        />
      ) : undefined}
    />
  );
};

// --- SEVERAL PEOPLE ---------------------------------------------------------

const GroupLayout: React.FC<Shared & { roster: Person[] }> = ({
  ctx, format, brand, theme, phrase, softness, roster,
}) => {
  const { exporting, v } = ctx;
  const F = frameFor(format, 'top-left');
  const type = typeScale(F.short);
  const b = BRANDS[brand];
  const paper = paperFor(theme);
  const ink = inkFor(theme);
  const gap = Math.round(F.short * 0.022);
  const radius = Math.round(F.short * 0.028);

  // A real flow: the header takes the space its content needs and the grid
  // takes the rest. Nothing is positioned against an edge, so nothing can be
  // pushed into anything else however many people arrive.
  // Fixed share of the card rather than derived from a font size, so the
  // header cannot grow into the grid as the phrase changes.
  const headerH = Math.round(format.height * 0.26);
  const phraseBand = Math.round(headerH * 0.58);
  const gridH = format.height - F.margin * 2 - headerH;
  const rhythm = groupRhythm(roster.length, F.content.width, gridH, gap);

  const tile = (person: Person, index: number, w: number, h: number) => (
    <div
      key={person.id}
      style={{ position: 'relative', width: w, height: h, borderRadius: radius, overflow: 'hidden', background: `${b.to}22` }}
    >
      <EditablePhoto
        personIndex={index}
        url={person.photoUrl}
        zoom={person.photoZoom}
        offset={person.photoOffset}
        exporting={exporting}
        frame={{ width: w, height: h }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 34%, transparent 58%)',
        }}
      />
      <div style={{
        position: 'absolute', left: Math.round(w * 0.065), right: Math.round(w * 0.065),
        bottom: Math.round(w * 0.06), zIndex: 2,
      }}>
        <EditableText
          field={`person:${index}:name`}
          value={person.name}
          exporting={exporting}
          placeholder="Nome"
          style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: Math.round(Math.min(w, h) * 0.088), lineHeight: 1.04,
            color: '#FFFFFF', textTransform: 'uppercase',
          }}
        />
        <EditableText
          field={`person:${index}:role`}
          value={person.role}
          exporting={exporting}
          placeholder="Cargo"
          style={{
            fontFamily: FONT_TEXT, fontWeight: 400,
            fontSize: Math.round(Math.min(w, h) * 0.052), lineHeight: 1.25,
            color: 'rgba(255,255,255,0.84)', textTransform: 'uppercase',
            letterSpacing: '0.1em', marginTop: Math.round(w * 0.012),
            maxHeight: Math.round(Math.min(w, h) * 0.052) * 2.6, overflow: 'hidden',
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.85 }}>
        <GradientField brand={brand} angle={128} sweep={false}>
          <Spheres brand={brand} shortEdge={F.short} softness={0.5 + softness * 0.5} variant="arc" scale={1.15} />
        </GradientField>
      </div>
      <div
        aria-hidden
        style={{ position: 'absolute', inset: 0, background: `linear-gradient(176deg, transparent 0%, ${paper}E6 52%, ${paper} 72%)` }}
      />

      {/* Header and grid in one column. */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3,
        padding: F.margin,
        display: 'flex', flexDirection: 'column',
      }}>
        <header style={{ height: headerH, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <BrandMark brand={brand} width={F.short * 0.17} color={ink} />
          <FitText
            text={phrase.replace(/\n/g, ' ').toUpperCase()}
            family={FONT_DISPLAY}
            color={ink}
            width={F.content.width}
            maxHeight={phraseBand}
            maxLines={2}
        tilt={v<number>('tilt')}
          />
        </header>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', gap, alignItems: 'stretch' }}>
          {rhythm.kind === 'hero' ? (
            <>
              {tile(roster[0], 0, rhythm.heroW, gridH)}
              <div style={{ display: 'flex', flexDirection: 'column', gap, flex: 1 }}>
                {roster.slice(1).map((p, i) => tile(p, i + 1, rhythm.restW, rhythm.restH))}
              </div>
            </>
          ) : (
            <div style={{
              display: 'grid', width: '100%',
              gridTemplateColumns: `repeat(${rhythm.columns}, 1fr)`,
              gridAutoRows: `${rhythm.tileH}px`,
              gap,
            }}>
              {roster.map((p, i) => tile(p, i, rhythm.tileW, rhythm.tileH))}
            </div>
          )}
        </div>
      </div>

      <Grain opacity={0.045} />
      <span style={{ display: 'none' }}>{v<string>('moment')}</span>
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
    ...personPosterFields,
  ],
  render,
};
