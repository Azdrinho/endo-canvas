import React from 'react';
import type { Template, RenderContext, Person, Format, BrandKey, ThemeId, Locale } from './types';
import { FONT_DISPLAY, FONT_TEXT, BRANDS, COPY, t, typeScale } from '../design/brand';
import { BrandMark } from '../design/BrandMark';
import { GradientField, Grain, Spheres, inkFor, mutedFor, paperFor } from './kit/Surface';
import { EditableText, EditablePhoto } from './kit/Editable';
import { Mark, frameFor, groupRhythm } from './kit/Layout';
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
  ctx, format, brand, theme, phrase, softness, person, moment,
}) => {
  const { v, exporting } = ctx;
  // The mark sits at the foot on the person cards.
  //
  // Top-left it reserved 116px of the card's head, which pushed the headline
  // down to y=219 on a 1080 square -- straight into the centred figure's
  // face, so the second line was covered through its middle and the phrase
  // stopped reading. At the foot, the headline starts at the margin and the
  // figure's head reaches only the last line's lower edge: that overlap
  // reads as depth rather than as censorship.
  const F = frameFor(format, 'bottom-right');
  const type = typeScale(F.short);
  const b = BRANDS[brand];
  const paper = paperFor(theme);
  const ink = inkFor(theme);
  const muted = mutedFor(theme);

  const lines = phrase.split('\n');
  const lead = lines[0];
  const tail = lines.slice(1).join(' ');

  const cutout = Boolean(person.cutout);
  const headlineTop = F.content.top;
  // A band the headline is fitted into, rather than a size guessed from the
  // character count — which is what put "WELCOME ABOARD" twice the width of
  // a landscape card with both words running off the edges.
  const headlineBand = Math.round(F.content.height * (F.isWide ? 0.44 : 0.38));

  // Centred, large, standing on the base line and in front of the phrase —
  // but sized so the head clears the phrase's last line instead of sitting
  // across the middle of it.
  const subjectH = Math.round(format.height * (F.isWide ? 0.84 : 0.72) * v<number>('subjectScale'));
  const subjectW = Math.round(subjectH * (F.isWide ? 0.78 : 0.86));
  const subjectLeft = Math.round((format.width - subjectW) / 2);
  const subjectTop = cutout
    ? format.height - subjectH
    : Math.round(Math.min(headlineTop + headlineBand * 0.82, format.height - F.margin - subjectH));

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.9 }}>
        <GradientField brand={brand} angle={F.isWide ? 110 : 150} sweep={false}>
          <Spheres brand={brand} shortEdge={F.short} softness={0.5 + softness * 0.5} variant="orbit" scale={1.3} />
        </GradientField>
      </div>
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(${F.isWide ? 100 : 172}deg, ${paper} 8%, ${paper}D0 36%, transparent 80%)`,
        }}
      />

      <FitText
        text={[lead, tail].filter(Boolean).join(' ').toUpperCase()}
        family={FONT_DISPLAY}
        color={ink}
        width={F.content.width}
        maxHeight={headlineBand}
        maxLines={2}
        tilt={v<number>('tilt')}
        style={{ position: 'absolute', left: F.content.left, top: headlineTop, zIndex: 2, pointerEvents: 'none' }}
      />

      <EditableText
        field="phrase"
        value={v<string>('phrase')}
        exporting={exporting}
        placeholder="SEJA BEM-VINDO"
        style={{
          position: 'absolute', zIndex: 6,
          left: F.content.left, top: F.content.top,
          width: F.content.width * 0.45, minHeight: type.subtitle,
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

      <div style={{
        position: 'absolute', zIndex: 5,
        left: F.margin, bottom: F.margin,
        maxWidth: Math.round(F.content.width * 0.47),
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
              fontFamily: FONT_TEXT, fontWeight: 400, fontSize: type.caption,
              letterSpacing: '0.16em', color: muted, textTransform: 'uppercase',
            }}
          />
        </div>

        {moment === 'promotion' && v<boolean>('showPrevious') && v<string>('previousRole') && (
          <EditableText
            field="previousRole"
            value={v<string>('previousRole')}
            exporting={exporting}
            placeholder="Cargo anterior"
            style={{
              fontFamily: FONT_TEXT, fontWeight: 400, fontSize: type.micro,
              letterSpacing: '0.16em', color: muted, textTransform: 'uppercase',
              textDecoration: 'line-through', marginTop: Math.round(F.short * 0.01),
              opacity: 0.75,
            }}
          />
        )}
      </div>

      <Grain opacity={0.05} />
      <Mark brand={brand} format={format} slot="bottom-right" color={ink} />
    </>
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
    {
      kind: 'select', id: 'cut', label: 'Recorte da foto', default: 'arch', group: 'Composição',
      options: [
        { value: 'arch', label: 'Arco' },
        { value: 'circle', label: 'Círculo' },
        { value: 'blade', label: 'Lâmina' },
        { value: 'none', label: 'Reto' },
      ],
    },
    { kind: 'number', id: 'tilt', label: 'Perspectiva do título', default: 0.35, min: -1, max: 1, step: 0.01, group: 'Composição', hint: 'O lado livre recua; o sinal escolhe qual borda fica fixa.' },
    { kind: 'number', id: 'subjectScale', label: 'Tamanho da pessoa', default: 1, min: 0.75, max: 1.3, step: 0.01, group: 'Composição' },
    { kind: 'number', id: 'softness', label: 'Difusão da luz', default: 0.4, min: 0, max: 1, step: 0.01, group: 'Composição' },
  ],
  render,
};
