import React, { useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useEditor } from '../store/editor';
import { getTemplate } from '../templates/registry';
import { UI } from './controls';

// The people on the card, as a filmstrip under the canvas.
//
// In the old editor, putting several people on a card meant turning on a
// "group mode" toggle in a corner and then clicking rows in a list that also
// served a completely different purpose, with no indication of who was on the
// card or who the photo controls were pointed at. Here the card's cast is
// visible at all times, in order, with the add and remove controls on it.

export const PeopleBar: React.FC = () => {
  const people = useEditor(s => s.people);
  const templateId = useEditor(s => s.card.templateId);
  const setPerson = useEditor(s => s.setPerson);
  const addPerson = useEditor(s => s.addPerson);
  const removePerson = useEditor(s => s.removePerson);
  const select = useEditor(s => s.select);
  const selection = useEditor(s => s.selection);

  const template = getTemplate(templateId);
  const limit = template.group?.max ?? 1;
  const fileInput = useRef<HTMLInputElement>(null);
  const pendingIndex = useRef(0);

  const pickPhoto = (index: number) => {
    pendingIndex.current = index;
    fileInput.current?.click();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      // Reset the framing with the photo: a crop dialled in for the previous
      // image is never right for the new one, and inheriting it is what made
      // a freshly chosen photo land half off the frame before.
      setPerson(pendingIndex.current, {
        photoUrl: String(reader.result),
        photoZoom: 1,
        photoOffset: { x: 0, y: 0 },
      });
    };
    reader.readAsDataURL(file);
  };

  if (limit === 1 && people.length === 1) {
    return <SoloBar onPick={() => pickPhoto(0)} />;
  }

  return (
    <div style={{
      flexShrink: 0, height: 92, display: 'flex', alignItems: 'center', gap: 10,
      padding: '0 16px', background: UI.panel, borderTop: `1px solid ${UI.line}`,
      overflowX: 'auto',
    }}>
      <input ref={fileInput} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />

      <AnimatePresence initial={false} mode="popLayout">
        {people.map((person, i) => {
          const field = `person:${i}:photo`;
          const active = selection === field;
          return (
            <motion.div
              key={person.id}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              style={{ position: 'relative', flexShrink: 0 }}
            >
              <button
                type="button"
                onClick={() => select(field)}
                onDoubleClick={() => pickPhoto(i)}
                title={person.name || `Pessoa ${i + 1}`}
                style={{
                  width: 58, height: 58, borderRadius: 11, overflow: 'hidden',
                  padding: 0, cursor: 'pointer', display: 'block',
                  background: UI.raised,
                  border: active ? `2px solid ${UI.accent}` : `1px solid ${UI.line}`,
                  boxShadow: active ? '0 0 0 3px rgba(255,255,255,0.1)' : 'none',
                  transition: 'box-shadow 150ms, border-color 150ms',
                }}
              >
                {person.photoUrl
                  ? <img src={person.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 18, color: UI.muted }}>+</span>}
              </button>

              {people.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePerson(person.id)}
                  aria-label={`Tirar ${person.name || `pessoa ${i + 1}`} do card`}
                  style={{
                    position: 'absolute', top: -5, right: -5, width: 19, height: 19,
                    borderRadius: '50%', border: `1px solid ${UI.line}`,
                    background: '#0E0E10', color: UI.muted, cursor: 'pointer',
                    fontSize: 12, lineHeight: 1, display: 'grid', placeItems: 'center',
                  }}
                >×</button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {people.length < limit && (
        <motion.button
          layout
          type="button"
          onClick={addPerson}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          style={{
            width: 58, height: 58, flexShrink: 0, borderRadius: 11,
            border: `1px dashed rgba(255,255,255,0.22)`, background: 'transparent',
            color: UI.muted, cursor: 'pointer', fontSize: 20, fontFamily: 'inherit',
          }}
          title="Adicionar pessoa"
          aria-label="Adicionar pessoa"
        >+</motion.button>
      )}

      <span style={{ marginLeft: 6, fontSize: 11, color: UI.muted, whiteSpace: 'nowrap' }}>
        {people.length}/{limit} no card
      </span>
    </div>
  );
};

const SoloBar: React.FC<{ onPick: () => void }> = ({ onPick }) => {
  const person = useEditor(s => s.people[0]);
  const setPerson = useEditor(s => s.setPerson);
  const commit = useEditor(s => s.commit);
  const fileInput = useRef<HTMLInputElement>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPerson(0, { photoUrl: String(reader.result), photoZoom: 1, photoOffset: { x: 0, y: 0 } });
    reader.readAsDataURL(file);
  };

  return (
    <div style={{
      flexShrink: 0, height: 72, display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 16px', background: UI.panel, borderTop: `1px solid ${UI.line}`,
    }}>
      <input ref={fileInput} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />

      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        style={{
          width: 48, height: 48, borderRadius: 10, overflow: 'hidden', padding: 0,
          background: UI.raised, border: `1px solid ${UI.line}`, cursor: 'pointer',
          color: UI.muted, fontSize: 18,
        }}
        title="Trocar foto"
      >
        {person.photoUrl ? <img src={person.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '+'}
      </button>

      <div style={{ display: 'flex', gap: 8, flex: 1, maxWidth: 520 }}>
        <input
          value={person.name}
          onChange={(e) => setPerson(0, { name: e.target.value }, { transient: true })}
          onBlur={commit}
          placeholder="Nome"
          style={inputStyle}
        />
        <input
          value={person.role}
          onChange={(e) => setPerson(0, { role: e.target.value }, { transient: true })}
          onBlur={commit}
          placeholder="Cargo"
          style={inputStyle}
        />
      </div>

      <span style={{ fontSize: 11, color: UI.muted, marginLeft: 'auto' }}>
        Arraste a foto no card para enquadrar · role para aproximar
      </span>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  flex: 1, minWidth: 0, height: 36, padding: '0 11px',
  background: UI.raised, color: UI.ink, border: `1px solid ${UI.line}`,
  borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit',
};
