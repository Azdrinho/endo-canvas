import React from 'react';
import type { Person } from '../types';
import { EditablePhoto } from './Editable';
import { cutShape } from './Layout';

// The person on the card, in the two ways they can appear.
//
// A framed photo can only ever sit *beside* the typography — the frame's
// edge is a hard boundary and everything inside it reads as a separate
// picture pasted on. That is what made the first compositions feel flat, and
// what made an arch dropped over a headline read as a mask cutting a word in
// half rather than as depth.
//
// A cutout has no boundary. It stands in the same space as the type, bleeds
// off the card edge, and occludes whatever is behind it. That single
// difference is most of what separates a poster from a slide.

interface SubjectProps {
  person: Person;
  index: number;
  exporting: boolean;
  /** Box the subject occupies, in card pixels. */
  box: { left: number; top: number; width: number; height: number };
  /** Shape used only when the photo is framed. */
  cut?: 'arch' | 'circle' | 'blade' | 'none';
  /** Drop shadow strength, relative to the card's short edge. */
  short: number;
  zIndex?: number;
}

export const Subject: React.FC<SubjectProps> = ({ person, index, exporting, box, cut = 'arch', short, zIndex = 4 }) => {
  const framed = !person.cutout;

  return (
    <EditablePhoto
      personIndex={index}
      url={person.photoUrl}
      zoom={person.photoZoom}
      offset={person.photoOffset}
      exporting={exporting}
      frame={{ width: box.width, height: box.height }}
      style={{
        position: 'absolute',
        left: box.left, top: box.top, width: box.width, height: box.height,
        zIndex,
        ...(framed
          ? {
            boxShadow: `0 ${Math.round(short * 0.028)}px ${Math.round(short * 0.085)}px rgba(0,0,0,0.42)`,
            ...cutShape(cut, Math.round(box.width * 0.5)),
          }
          : {
            // No frame, no clip. The grounding shadow is cast by the figure
            // itself rather than by a rectangle around it.
            background: 'transparent',
            filter: `drop-shadow(0 ${Math.round(short * 0.022)}px ${Math.round(short * 0.05)}px rgba(0,0,0,0.5))`,
            overflow: 'visible',
          }),
      }}
      objectFit={framed ? 'cover' : 'contain'}
      anchor={framed ? 'center' : 'bottom'}
    />
  );
};
