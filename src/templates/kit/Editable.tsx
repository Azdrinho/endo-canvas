import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor } from '../../store/editor';

// Direct manipulation, which is the whole point of the rebuild. In the old
// editor every property was a slider parked off the side of the canvas: you
// tuned a number and watched a picture change somewhere else. Here the thing
// you want to change is the thing you click.

const selectedRing = (active: boolean, exporting: boolean) =>
  !exporting && active
    ? { outline: '2px solid #FFFFFF', outlineOffset: 3, borderRadius: 2 }
    : undefined;

/** `person:<index>:<key>` -> the person it addresses, or null for a card field. */
const parsePersonField = (field: string): { index: number; key: 'name' | 'role' } | null => {
  const m = /^person:(\d+):(name|role)$/.exec(field);
  return m ? { index: Number(m[1]), key: m[2] as 'name' | 'role' } : null;
};

interface EditableTextProps {
  field: string;
  /** Rendered value. Plain text unless `rich`. */
  value: string;
  rich?: boolean;
  exporting: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
  as?: 'div' | 'h1' | 'h2' | 'p' | 'span';
}

/**
 * Text you edit where it sits. Paste is forced to plain text: copying a name
 * out of Teams or Word drags that app's entire styling layer along, and in
 * the previous editor one such paste put an unclosed <span> into a card and
 * destroyed the layout. Formatting comes from the selection toolbar, which is
 * the only thing that emits markup this app understands.
 */
export const EditableText: React.FC<EditableTextProps> = ({
  field, value, rich, exporting, placeholder, style, className, as = 'div',
}) => {
  const ref = useRef<HTMLElement>(null);
  const selection = useEditor(s => s.selection);
  const setValue = useEditor(s => s.setValue);
  const setPerson = useEditor(s => s.setPerson);
  const select = useEditor(s => s.select);
  const commit = useEditor(s => s.commit);
  const active = selection === field;

  // A field id of the form `person:0:name` belongs to the cast, not to the
  // card. Routing on the id keeps one component for both, and keeps the
  // selection ids consistent with EditablePhoto, which already addresses
  // people this way.
  const bound = parsePersonField(field);

  // The DOM node owns the text while it has focus; writing React's value back
  // into it mid-typing would collapse the caret to the start on every
  // keystroke. Synced only when the value changes from elsewhere (undo, a
  // template switch, another control).
  useEffect(() => {
    const el = ref.current;
    if (!el || el === document.activeElement) return;
    if (rich) {
      if (el.innerHTML !== value) el.innerHTML = value;
    } else if (el.textContent !== value) {
      el.textContent = value;
    }
  }, [value, rich]);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    e.preventDefault();
    document.execCommand('insertText', false, text);
  }, []);

  const onBlur = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const next = rich ? el.innerHTML : (el.textContent ?? '');
    if (next === value) return;
    if (bound) setPerson(bound.index, { [bound.key]: next } as never);
    else setValue(field, next);
    commit();
  }, [field, rich, value, setValue, setPerson, commit, bound]);

  const Tag = as as React.ElementType;
  const isEmpty = !value;

  return (
    <Tag
      ref={ref as never}
      data-field={field}
      data-editable="text"
      contentEditable={!exporting}
      suppressContentEditableWarning
      spellCheck={false}
      onPaste={onPaste}
      onBlur={onBlur}
      onFocus={() => select(field)}
      onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
      className={className}
      style={{
        outline: 'none',
        cursor: exporting ? 'default' : 'text',
        minWidth: isEmpty && !exporting ? '2ch' : undefined,
        ...style,
        ...selectedRing(active, exporting),
      }}
      // Shown through CSS so it never becomes part of the exported value.
      data-placeholder={!exporting && isEmpty ? placeholder : undefined}
    />
  );
};

interface EditablePhotoProps {
  /** Index into the people array. */
  personIndex: number;
  url: string;
  zoom: number;
  offset: { x: number; y: number };
  exporting: boolean;
  /** Frame size in card pixels, used to convert a drag into a pan fraction. */
  frame: { width: number; height: number };
  radius?: number | string;
  style?: React.CSSProperties;
  /** Shown when there is no photo yet. */
  onPick?: () => void;
  /** `contain` for a cutout, so the figure is never cropped by its box. */
  objectFit?: 'cover' | 'contain';
  /** A cutout is anchored to the bottom of its box so it stands on a line. */
  anchor?: 'center' | 'bottom';
}

/**
 * A photo you drag to reframe and scroll to zoom, inside its own frame.
 *
 * Pan is stored as a fraction of the frame, not in pixels. The old editor
 * stored pixels, so the same value meant a different crop in every format and
 * every group tile, and the editor had to publish a compensation ratio on
 * each tile so the joystick would not crawl. A fraction is the same crop
 * everywhere, with nothing to compensate.
 */
export const EditablePhoto: React.FC<EditablePhotoProps> = ({
  personIndex, url, zoom, offset, exporting, frame, radius, style, onPick,
  objectFit = 'cover', anchor = 'center',
}) => {
  const setPerson = useEditor(s => s.setPerson);
  const commit = useEditor(s => s.commit);
  const select = useEditor(s => s.select);
  const selection = useEditor(s => s.selection);
  const field = `person:${personIndex}:photo`;
  const active = selection === field;
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; scale: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (exporting || !url) return;
    e.stopPropagation();
    e.preventDefault();
    select(field);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    // Measured from the rendered element so the drag tracks the cursor
    // exactly at any canvas zoom, rather than being derived from state.
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    drag.current = {
      x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y,
      scale: rect.width || frame.width,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x) / d.scale;
    const dy = (e.clientY - d.y) / (d.scale * (frame.height / frame.width));
    setPerson(personIndex, {
      photoOffset: {
        x: Math.max(-1, Math.min(1, d.ox + dx)),
        y: Math.max(-1, Math.min(1, d.oy + dy)),
      },
    }, { transient: true });
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    commit();
  };

  const onWheel = (e: React.WheelEvent) => {
    if (exporting || !url) return;
    e.stopPropagation();
    const step = e.deltaY < 0 ? 0.06 : -0.06;
    // Read from the store rather than from props: a trackpad fires a burst of
    // these inside one frame, and every one of them would otherwise read the
    // same render-old zoom, so a long scroll would move exactly one step.
    const current = useEditor.getState().people[personIndex]?.photoZoom ?? 1;
    setPerson(personIndex, { photoZoom: Math.min(4, Math.max(1, current + step)) }, { transient: true });
  };

  // A burst has no natural end event, so the gesture is closed on a short
  // idle timer -- that makes one scroll one undo step.
  const wheelIdle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleWheelCommit = () => {
    if (wheelIdle.current) clearTimeout(wheelIdle.current);
    wheelIdle.current = setTimeout(() => commit(), 220);
  };

  return (
    <div
      data-field={field}
      data-editable="photo"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={(e) => { onWheel(e); scheduleWheelCommit(); }}
      onDoubleClick={() => !exporting && onPick?.()}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: radius,
        cursor: exporting || !url ? 'default' : 'grab',
        touchAction: 'none',
        ...style,
        ...selectedRing(active, exporting),
      }}
    >
      {url ? (
        <img
          src={url}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit,
            objectPosition: anchor === 'bottom' ? 'center bottom' : 'center',
            // Translate before scale, in percentages, so the crop is
            // identical at any rendered size.
            transform: `scale(${zoom}) translate(${offset.x * 100}%, ${offset.y * 100}%)`,
            // A cutout grows upward from where it stands; a framed photo
            // scales about its middle.
            transformOrigin: anchor === 'bottom' ? 'center bottom' : 'center',
            userSelect: 'none',
          }}
        />
      ) : (
        <PhotoPlaceholder exporting={exporting} onPick={onPick} />
      )}
    </div>
  );
};

const PhotoPlaceholder: React.FC<{ exporting: boolean; onPick?: () => void }> = ({ exporting, onPick }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onPick?.(); }}
    disabled={exporting}
    style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 12,
      background: 'rgba(255,255,255,0.06)',
      border: exporting ? 'none' : '2px dashed rgba(255,255,255,0.28)',
      color: 'rgba(255,255,255,0.65)',
      font: "500 20px 'Orkney', sans-serif",
      cursor: exporting ? 'default' : 'pointer',
    }}
  >
    {!exporting && (
      <>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
        <span>Adicionar foto</span>
      </>
    )}
  </button>
);
