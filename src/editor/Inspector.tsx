import React, { useMemo } from 'react';
import { useEditor } from '../store/editor';
import { getTemplate } from '../templates/registry';
import type { FieldSpec } from '../templates/types';
import { BRANDS, BRAND_ORDER } from '../design/brand';
import { ColorPicker, FieldShell, Section, Segmented, Slider, TextInput, Toggle, UI } from './controls';

// The inspector is generated from the template's field declarations. Nothing
// here knows what a "sphere blur" is; it knows what a number field is. That
// is the whole reason adding a control to a template no longer means editing
// the sidebar, the data model and the database — the mistake that left an
// entire panel's settings unsaved in the previous build.

const Control: React.FC<{ field: FieldSpec }> = ({ field }) => {
  // Falls back to the declared default rather than rendering an empty
  // control: a card's values start out empty and fill in as they are edited.
  const value = useEditor(s => s.card.values[field.id] ?? field.default);
  const setValue = useEditor(s => s.setValue);
  const commit = useEditor(s => s.commit);
  const select = useEditor(s => s.select);
  const selected = useEditor(s => s.selection === field.id);

  const set = (v: never) => setValue(field.id, v, { transient: true });
  const setAndCommit = (v: never) => { setValue(field.id, v); };

  const body = () => {
    switch (field.kind) {
      case 'text':
        return <TextInput value={String(value ?? '')} onChange={set as never} onCommit={commit} multiline={field.multiline} placeholder={field.placeholder} />;
      case 'richText':
        return <TextInput value={String(value ?? '')} onChange={set as never} onCommit={commit} multiline placeholder={field.placeholder} />;
      case 'number':
        return <Slider label={field.label} value={Number(value ?? field.default)} min={field.min} max={field.max} step={field.step} unit={field.unit} onChange={set as never} onCommit={commit} />;
      case 'toggle':
        return <Toggle label={field.label} value={Boolean(value)} onChange={setAndCommit as never} />;
      case 'select':
        return <Segmented value={String(value ?? field.default)} options={field.options} onChange={setAndCommit as never} columns={field.options.length > 3 ? 2 : field.options.length} />;
      case 'color':
        return <ColorPicker value={String(value ?? field.default)} onChange={set as never} onCommit={commit} />;
      case 'image':
        return <TextInput value={String(value ?? '')} onChange={set as never} onCommit={commit} placeholder="URL da imagem" />;
    }
  };

  // Slider and toggle carry their own label inside the control.
  const selfLabelled = field.kind === 'number' || field.kind === 'toggle';

  return (
    <div
      onFocusCapture={() => select(field.id)}
      style={{
        borderRadius: 10,
        outline: selected ? `1px solid rgba(255,255,255,0.22)` : 'none',
        outlineOffset: 4,
        transition: 'outline-color 150ms',
      }}
    >
      {selfLabelled
        ? <>{body()}{field.hint && <p style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(138,138,148,0.75)', lineHeight: 1.4 }}>{field.hint}</p>}</>
        : <FieldShell label={field.label} hint={field.hint}>{body()}</FieldShell>}
    </div>
  );
};

export const Inspector: React.FC = () => {
  const templateId = useEditor(s => s.card.templateId);
  const brand = useEditor(s => s.card.brand);
  const theme = useEditor(s => s.card.theme);
  const locale = useEditor(s => s.card.locale);
  const setBrand = useEditor(s => s.setBrand);
  const setTheme = useEditor(s => s.setTheme);
  const setLocale = useEditor(s => s.setLocale);

  const template = getTemplate(templateId);

  const grouped = useMemo(() => {
    const order = template.groups ?? [];
    const map = new Map<string, FieldSpec[]>();
    for (const g of order) map.set(g, []);
    for (const f of template.fields) {
      const key = f.group ?? 'Conteúdo';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return [...map.entries()].filter(([, fields]) => fields.length > 0);
  }, [template]);

  return (
    <aside
      aria-label="Propriedades"
      style={{
        width: 288, flexShrink: 0, height: '100%', overflowY: 'auto',
        background: UI.panel, borderLeft: `1px solid ${UI.line}`,
        padding: '18px 16px 40px',
      }}
    >
      <Section title="Marca">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
          {BRAND_ORDER.map(key => {
            const b = BRANDS[key];
            const active = key === brand;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setBrand(key)}
                title={b.label}
                aria-label={b.label}
                aria-pressed={active}
                style={{
                  height: 34, borderRadius: 8, cursor: 'pointer',
                  background: `linear-gradient(135deg, ${b.from}, ${b.to})`,
                  border: active ? `2px solid ${UI.accent}` : `1px solid ${UI.line}`,
                  boxShadow: active ? '0 0 0 3px rgba(255,255,255,0.08)' : 'none',
                  transition: 'box-shadow 150ms, border-color 150ms',
                }}
              />
            );
          })}
        </div>
      </Section>

      <Section title="Aparência">
        <Segmented
          value={theme}
          options={[{ value: 'light' as const, label: 'Claro' }, { value: 'dark' as const, label: 'Escuro' }]}
          onChange={setTheme}
        />
        <Segmented
          value={locale}
          options={[
            { value: 'pt' as const, label: 'PT' },
            { value: 'en' as const, label: 'EN' },
            { value: 'es' as const, label: 'ES' },
          ]}
          onChange={setLocale}
        />
      </Section>

      {grouped.map(([group, fields]) => (
        <Section key={group} title={group}>
          {fields.map(f => <Control key={f.id} field={f} />)}
        </Section>
      ))}
    </aside>
  );
};
