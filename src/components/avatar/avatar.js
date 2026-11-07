import { component, html, signal } from '../../../giant.js';

const { div, img } = html;

// Generated avatar palettes [mid, start, end]; the colours live in an SVG data URI, where CSS variables don't apply.
const PALETTES = [
  ['#0f172a', '#2563eb', '#38bdf8'], ['#1e1b4b', '#7c3aed', '#c084fc'],
  ['#431407', '#ea580c', '#facc15'], ['#052e16', '#16a34a', '#86efac'],
  ['#3b0764', '#db2777', '#f9a8d4'], ['#111827', '#4f46e5', '#22d3ee'],
  ['#164e63', '#0891b2', '#a7f3d0'], ['#450a0a', '#dc2626', '#fb7185']
];

// "ada.lovelace@x.io" → "AL", "ada" → "AD"
const initials = (value) => {
  const local = value.split('@')[0];
  const parts = local.split(/[\s._\-+]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : local.slice(0, 2) || '?').toUpperCase();
};

// Deterministic gradient avatar (data URI) for any string, seeded by its FNV-1a hash.
const generateAvatar = (value) => {
  const text = String(value).trim();
  const key = text.toLowerCase();
  let seed = 2166136261;
  for (let i = 0; i < key.length; i++) seed = Math.imul(seed ^ key.charCodeAt(i), 16777619);
  seed >>>= 0;

  const [mid, start, end] = PALETTES[seed % PALETTES.length];
  const label = initials(text).replace(/[&<>]/g, (c) => `&#${c.charCodeAt(0)};`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${start}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${end}"/></linearGradient>
<radialGradient id="r" cy=".35" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<rect width="100" height="100" fill="url(#g)"/>
<g opacity=".34" transform="rotate(${seed % 360} 50 50)"><circle cx="${20 + (seed % 60)}" cy="${18 + ((seed >> 3) % 64)}" r="34" fill="${end}"/><circle cx="${24 + ((seed >> 6) % 56)}" cy="${24 + ((seed >> 9) % 56)}" r="28" fill="${start}"/><path d="M0 72C28 48 58 96 100 54V100H0Z" fill="#fff" opacity=".16"/></g>
<rect width="100" height="100" fill="url(#r)"/>
<text x="50" y="54" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, sans-serif" font-size="${label.length === 1 ? 42 : 34}" font-weight="700" fill="#fff">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/** `generate` (any stable string, e.g. an email) renders a deterministic avatar with `alt` (default: the string). */
export const Avatar = component.Avatar(({ generate, alt, ...props } = {}, ...children) => div({
  'style-position': 'relative',
  'style-layout': 'inline',
  'style-size': 'medium',
  'style-overflow': 'hidden',
  'style-radius': 'round',
  'style-surface': 'muted',
  ...props
}, generate ? AvatarImage({ src: generateAvatar(generate), alt: alt ?? String(generate), draggable: 'false' }) : null, ...children));

// Hides itself when the image fails to load; a new src retries.
export const AvatarImage = component.AvatarImage((props = {}) => {
  const hasError = signal.hasError(false);
  const prevSrc = signal.prevSrc(props.src);

  if (prevSrc.value !== props.src) {
    hasError.value = false;
    prevSrc.value = props.src;
  }
  if (hasError.value) return null;

  return img({
    'style-position': 'absolute',
    'style-inset': 'fill',
    'style-width': 'full',
    'style-height': 'full',
    'style-fit': 'cover',
    alt: '',
    ...props,
    onerror: () => { hasError.value = true; }
  });
});

export const AvatarFallback = component.AvatarFallback((props = {}, ...children) => div({
  'style-layout': 'row',
  'style-justify': 'center',
  'style-width': 'full',
  'style-height': 'full',
  'style-tone': 'muted',
  'style-weight': 'medium',
  ...props
}, ...children));
