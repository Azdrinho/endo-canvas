import React from 'react';
import type { Template, RenderContext } from './types';
import { BRANDS, COPY, FONT_DISPLAY, t, typeScale } from '../design/brand';
import { EditableText } from './kit/Editable';
import { PersonPoster, personPosterFields } from './kit/PersonPoster';
import { frameFor } from './kit/Layout';

// --- ANIVERSÁRIO ------------------------------------------------------------
//
// The layout lives in kit/PersonPoster, shared with Momentos: the two had
// grown near-identical copies of the same composition and only ever differed
// in their words. This file supplies the greeting and the date.

const render = (ctx: RenderContext) => {
  const { v, format, brand, locale, exporting } = ctx;
  const F = frameFor(format, 'top-left');
  const type = typeScale(F.short);
  const b = BRANDS[brand];

  const phrase = (v<string>('greeting') || t(COPY.birthday, locale)).replace(/\s*\n\s*/g, ' ').trim();

  return (
    <PersonPoster
      ctx={ctx}
      phrase={phrase}
      phraseField="greeting"
      phraseValue={v<string>('greeting')}
      phrasePlaceholder="FELIZ ANIVERSÁRIO"
      extra={v<boolean>('showDate') ? (
        <EditableText
          field="dateLabel"
          value={v<string>('dateLabel')}
          exporting={exporting}
          placeholder="12/06"
          style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: type.micro,
            letterSpacing: '0.18em', color: b.accent,
            marginTop: Math.round(F.short * 0.016),
          }}
        />
      ) : undefined}
    />
  );
};

export const birthday: Template = {
  id: 'birthday',
  name: 'Aniversário',
  tagline: 'Pôster com a pessoa dentro do texto',
  family: 'pessoas',
  formats: ['post-square', 'post-portrait', 'story', 'landscape'],
  groups: ['Conteúdo', 'Composição'],
  fields: [
    { kind: 'text', id: 'greeting', label: 'Saudação', default: '', group: 'Conteúdo', hint: 'Vazio usa a saudação do idioma.' },
    { kind: 'toggle', id: 'showDate', label: 'Mostrar data', default: true, group: 'Conteúdo' },
    { kind: 'text', id: 'dateLabel', label: 'Data', default: '12/06', group: 'Conteúdo' },
    ...personPosterFields,
  ],
  render,
};
