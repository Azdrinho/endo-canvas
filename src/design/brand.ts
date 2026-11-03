import type { BrandKey, Locale } from '../templates/types';

// The Salsa visual system, stated once. The old app spread these values
// across a dozen template functions as literals, so the cyan in the header
// drifted from the cyan in the spheres and nobody could tell which was right.

export const INK = {
  /** Card background, light theme. Never pure white — it flattens the spheres. */
  paper: '#F4F4F6',
  /** Card background, dark theme. Never pure black, same reason. */
  carbon: '#141418',
  onPaper: '#17171C',
  onCarbon: '#F6F6F8',
  mutedOnPaper: 'rgba(23,23,28,0.55)',
  mutedOnCarbon: 'rgba(246,246,248,0.60)',
} as const;

export interface BrandTheme {
  key: BrandKey;
  label: string;
  /** The two ends of the brand's gradient. */
  from: string;
  to: string;
  /** Sits on top of the gradient — always legible against both ends. */
  onGradient: string;
  /** Accent for small marks and rules on a plain surface. */
  accent: string;
}

export const BRANDS: Record<BrandKey, BrandTheme> = {
  technology: { key: 'technology', label: 'Technology', from: '#22D3EE', to: '#594C99', onGradient: '#FFFFFF', accent: '#2BA7C4' },
  studio: { key: 'studio', label: 'Studio', from: '#F4BECF', to: '#E84E6F', onGradient: '#FFFFFF', accent: '#D8415F' },
  omni: { key: 'omni', label: 'Omni', from: '#CB9FF7', to: '#6813A5', onGradient: '#FFFFFF', accent: '#7C2BBE' },
  gator: { key: 'gator', label: 'Gator', from: '#13694A', to: '#0D2B2A', onGradient: '#FFFFFF', accent: '#13694A' },
  consulting: { key: 'consulting', label: 'Consulting', from: '#FCD8A9', to: '#E6AB3E', onGradient: '#2A1F08', accent: '#C98F26' },
};

export const BRAND_ORDER: BrandKey[] = ['technology', 'studio', 'omni', 'gator', 'consulting'];

export const gradient = (brand: BrandKey, angle = 135) => {
  const b = BRANDS[brand];
  return `linear-gradient(${angle}deg, ${b.from} 0%, ${b.to} 100%)`;
};

/** A softer wash of the brand, for large areas that sit behind text. */
export const gradientWash = (brand: BrandKey, angle = 135) => {
  const b = BRANDS[brand];
  return `linear-gradient(${angle}deg, ${b.from}26 0%, ${b.to}26 100%)`;
};

// --- TYPE SCALE -------------------------------------------------------------
//
// Expressed as a fraction of the card's short edge rather than in absolute
// pixels, so one composition holds together from a 1080 square to a 1920
// landscape instead of needing a hand-tuned font size per format — which is
// what the old templates did, with a different magic number at every call
// site.

export const typeScale = (shortEdge: number) => ({
  display: Math.round(shortEdge * 0.115),
  headline: Math.round(shortEdge * 0.072),
  title: Math.round(shortEdge * 0.046),
  subtitle: Math.round(shortEdge * 0.030),
  body: Math.round(shortEdge * 0.0225),
  caption: Math.round(shortEdge * 0.017),
  micro: Math.round(shortEdge * 0.0135),
});

/** Layout rhythm, also relative to the short edge. */
export const space = (shortEdge: number) => ({
  gutter: Math.round(shortEdge * 0.075),
  block: Math.round(shortEdge * 0.045),
  tight: Math.round(shortEdge * 0.018),
  hair: Math.round(shortEdge * 0.008),
});

export const FONT_DISPLAY = "'Akira', 'Orkney', 'Inter', sans-serif";
export const FONT_TEXT = "'Orkney', 'Inter', system-ui, sans-serif";

// --- COPY -------------------------------------------------------------------

type Phrase = Record<Locale, string>;

export const COPY = {
  birthday: { pt: 'FELIZ\nANIVERSÁRIO', en: 'HAPPY\nBIRTHDAY', es: 'FELIZ\nCUMPLEAÑOS' } as Phrase,
  birthdayMonth: { pt: 'ANIVERSARIANTES', en: 'BIRTHDAYS', es: 'CUMPLEAÑOS' } as Phrase,
  welcome: { pt: 'SEJA\nBEM-VINDO', en: 'WELCOME\nABOARD', es: 'BIENVENIDO\nA BORDO' } as Phrase,
  farewell: { pt: 'ATÉ\nLOGO', en: 'SEE YOU\nSOON', es: 'HASTA\nPRONTO' } as Phrase,
  newRole: { pt: 'NOVO\nCARGO', en: 'NEW\nROLE', es: 'NUEVO\nCARGO' } as Phrase,
  previousRole: { pt: 'ANTES', en: 'BEFORE', es: 'ANTES' } as Phrase,
  months: {
    pt: ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'],
    en: ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'],
    es: ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'],
  },
};

export const t = (phrase: Phrase, locale: Locale): string => phrase[locale] ?? phrase.pt;
