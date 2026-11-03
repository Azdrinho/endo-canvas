import React, { useId } from 'react';
import { LOGO_TECHNOLOGY, LOGO_STUDIO, LOGO_OMNI, LOGO_GATOR, LOGO_CONSULTING } from './logos';
import type { BrandKey } from '../templates/types';

const ART: Record<BrandKey, string> = {
  technology: LOGO_TECHNOLOGY,
  studio: LOGO_STUDIO,
  omni: LOGO_OMNI,
  gator: LOGO_GATOR,
  consulting: LOGO_CONSULTING,
};

/**
 * A Salsa sub-brand lockup.
 *
 * Two copies of the same mark on one page would otherwise fight over their
 * SVG's internal ids — gradients and clip-paths are referenced by id, and the
 * first definition wins for both. The old build namespaced them with
 * Math.random(), which made that template the only one whose markup differed
 * on every render; React then rebuilt the card's DOM on every unrelated state
 * change. React's useId gives a value that is unique per instance and stable
 * across renders, which is what was wanted all along.
 */
export const BrandMark: React.FC<{
  brand: BrandKey;
  /** Width in px; height follows the artwork's ratio. */
  width: number;
  color?: string;
  style?: React.CSSProperties;
}> = ({ brand, width, color = '#FFFFFF', style }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const art = namespaceIds(ART[brand], uid);

  return (
    <svg
      viewBox="0 -30 1000 450"
      width={width}
      height={width * 0.45}
      aria-hidden
      style={{ display: 'block', fill: color, ...style }}
      dangerouslySetInnerHTML={{ __html: art }}
    />
  );
};

/** Rewrite every id, url(#id) and href="#id" in an SVG fragment. */
const namespaceIds = (svg: string, uid: string): string =>
  svg
    .replace(/id="([^"]+)"/g, (_m, id) => `id="${id}_${uid}"`)
    .replace(/url\(#([^)]+)\)/g, (_m, id) => `url(#${id}_${uid})`)
    .replace(/(xlink:href|href)="#([^"]+)"/g, (_m, attr, id) => `${attr}="#${id}_${uid}"`);
