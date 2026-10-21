import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { TemplateType, Orientation } from '../types';

// Extracted from App.tsx, which had grown to 5,200 lines. Everything here is
// independent of that component's state -- it was only ever in the same file
// by accident of growth.
// The card preview surface and the inline rich-text field that edits on top
// of it. Both exist to protect a dangerouslySetInnerHTML subtree from being
// torn down by unrelated renders, which is why they are memoized so
// aggressively -- see the comments on each.

export const MorphingCanvasImpl = ({ html, templateType, orientation, children }: { html: string, templateType: TemplateType, orientation: Orientation, children?: React.ReactNode }) => {
  const [displayHtml, setDisplayHtml] = useState(html);
  const [displayTemplate, setDisplayTemplate] = useState(templateType);
  const [displayOrientation, setDisplayOrientation] = useState(orientation);
  const [phase, setPhase] = useState<'idle' | 'fadeOut' | 'morph' | 'fadeIn'>('idle');
  const [displayChildren, setDisplayChildren] = useState(children);

  // Store the latest props in refs to access them inside timeouts without re-triggering
  const latestHtml = useRef(html);
  const latestTemplate = useRef(templateType);
  const latestOrientation = useRef(orientation);
  const latestChildren = useRef(children);

  useEffect(() => {
    latestHtml.current = html;
    latestTemplate.current = templateType;
    latestOrientation.current = orientation;
    latestChildren.current = children;
  }, [html, templateType, orientation, children]);

  useEffect(() => {
    if ((templateType !== displayTemplate || orientation !== displayOrientation) && phase === 'idle') {
      setPhase('fadeOut');
    } else if (templateType === displayTemplate && orientation === displayOrientation && phase === 'idle') {
      setDisplayHtml(html);
      setDisplayChildren(children);
    }
    // `children` is intentionally NOT a dependency here: JSX like `{renderHiringOverlay()}`
    // creates a brand-new element reference on every parent render, even when nothing
    // about it actually changed. Keying this effect on that reference meant it re-ran
    // (and called setDisplayChildren, which — unlike the string setDisplayHtml — always
    // sees a "new" value and always re-renders) on every unrelated App-wide render, e.g.
    // each time the floating format toolbar repositions during a text selection. That
    // extra render was enough to tear down and recreate the card's dangerouslySetInnerHTML
    // subtree, silently collapsing whatever text selection the user was mid-drag on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateType, orientation, html, displayTemplate, displayOrientation, phase]);

  useEffect(() => {
    if (phase === 'fadeOut') {
      const timer = setTimeout(() => {
        setDisplayHtml(latestHtml.current);
        setDisplayTemplate(latestTemplate.current);
        setDisplayOrientation(latestOrientation.current);
        setDisplayChildren(latestChildren.current);
        setPhase('morph');
      }, 120);
      return () => clearTimeout(timer);
    } else if (phase === 'morph') {
      const timer = setTimeout(() => {
        setPhase('fadeIn');
      }, 300); // 300ms morph duration
      return () => clearTimeout(timer);
    } else if (phase === 'fadeIn') {
      const timer = setTimeout(() => {
        setPhase('idle');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <motion.div
      layout
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="relative group transition-transform"
      style={{ 
        width: 'fit-content',
        height: 'fit-content'
      }}
    >
      <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg opacity-0 group-hover:opacity-40 transition duration-500 blur-lg pointer-events-none"></div>
      
      <div className="relative border border-transparent group-hover:border-cyan-500/50 transition-all duration-500 overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_30px_rgba(34,211,238,0.3)] bg-transparent"
           style={{ 
             borderRadius: '0',
           }}
      >
        <motion.div
          initial={false}
          animate={{
            opacity: phase === 'idle' ? 1 : (phase === 'fadeOut' ? 0 : (phase === 'fadeIn' ? 1 : 0)),
            filter: phase === 'fadeOut' ? 'brightness(1.5)' : 'brightness(1)',
            scale: phase === 'fadeIn' ? [1.03, 1] : 1,
          }}
          transition={{
            opacity: { duration: phase === 'fadeOut' ? 0.12 : 0.2 },
            filter: { duration: 0.12 },
            scale: { duration: 0.2, ease: "easeOut" }
          }}
          style={{ width: 'fit-content', height: 'fit-content', transformOrigin: 'center' }}
        >
          <div dangerouslySetInnerHTML={{ __html: displayHtml }} />
          {displayChildren}
        </motion.div>
      </div>
    </motion.div>
  );
};

// Memoized with a comparator that ignores `children`'s reference: JSX like
// `{renderHiringOverlay()}` is a brand-new element every render even when its
// actual content hasn't changed, so a plain re-render-on-any-prop-change would
// still re-execute this component (and its effects) on every unrelated
// App-wide render — e.g. each time the floating format toolbar repositions
// during a text selection — which was enough to tear down and recreate the
// card's dangerouslySetInnerHTML subtree mid-gesture, silently collapsing
// whatever the user was in the middle of selecting.
export const MorphingCanvas = React.memo(MorphingCanvasImpl, (prev, next) =>
  prev.html === next.html && prev.templateType === next.templateType && prev.orientation === next.orientation
);

// Sidebar rich-text fields (Título/Parágrafo/Resumo) suffer the same class of
// bug MorphingCanvas had: the app re-renders on every 'selectionchange' event
// (to reposition the floating Bold/Italic toolbar), and without a memo
// boundary that cascades into these dangerouslySetInnerHTML divs too, which
// can wipe out an in-progress selection or edit. Isolating them behind
// React.memo, keyed only on the props that actually matter, protects them
// the same way it protected the canvas.
export const RichTextField = React.memo(function RichTextField({ field, html, className, placeholder, style }: { field: string, html: string, className: string, placeholder?: string, style?: React.CSSProperties }) {
  return (
    <div
      contentEditable
      data-field={field}
      suppressContentEditableWarning
      dangerouslySetInnerHTML={{ __html: html || '' }}
      className={className}
      data-placeholder={placeholder}
      style={style}
    />
  );
}, (prev, next) => prev.field === next.field && prev.html === next.html && prev.className === next.className && prev.placeholder === next.placeholder);
