import { component, html, signal } from '../../../giant.js';
import { Button } from '../button/button.js';

const { div, input } = html;

// Colour-model paint (white/black ramps, hue rainbow, checkerboard) is not theme colour, so it stays in `style`.
const HUE_RAMP = 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)';
const CHECKERBOARD = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><path fill="%23e5e7eb" d="M0 0h4v4H0zm4 4h4v4H4z"/></svg>')`;

// TODO(style): no attribute to centre an absolutely positioned element on a point (translate -50%)
const thumbAt = (left, top = '50%') => ({ left, top, translate: '-50% -50%' });

const FILL = { 'style-position': 'absolute', 'style-inset': 'fill', 'style-interactive': 'inert' };
const BAR = { 'style-position': 'relative', 'style-pad-block': 'small', 'style-radius': 'round', 'style-interactive': 'drag' };
const KNOB = { 'style-position': 'absolute', 'style-pad': 'small', 'style-radius': 'round', 'style-surface': 'raised', 'style-interactive': 'inert' };
const FIELD = {
  'style-emphasis': 'field',
  'style-border': 'thin',
  'style-radius': 'small',
  'style-flex': 'grow',
  'style-text': 'xsmall',
  'style-pad': 'xsmall',
  'style-text-align': 'center',
};

const hsvToRgb = (h, s, v) => {
  s /= 100; v /= 100;
  const f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  return { r: Math.round(f(5) * 255), g: Math.round(f(3) * 255), b: Math.round(f(1) * 255) };
};

const rgbToHsv = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const v = Math.max(r, g, b), c = v - Math.min(r, g, b);
  const h = c && ((v === r) ? (g - b) / c : ((v === g) ? 2 + (b - r) / c : 4 + (r - g) / c));
  return { h: 60 * (h < 0 ? h + 6 : h) || 0, s: v ? (c / v) * 100 : 0, v: v * 100 };
};

const toHex = (c) => Math.round(c).toString(16).padStart(2, '0');
const rgbaToHex = ({ r, g, b }, a) => `#${toHex(r)}${toHex(g)}${toHex(b)}${a < 1 ? toHex(a * 255) : ''}`.toUpperCase();

const parseColor = (str) => {
  if (str.startsWith('#')) {
    let hex = str.slice(1);
    if (hex.length < 5) hex = [...hex].map((x) => x + x).join('');
    const byte = (i) => parseInt(hex.substring(i, i + 2), 16) || 0;
    return { r: byte(0), g: byte(2), b: byte(4), a: hex.length === 8 ? byte(6) / 255 : 1 };
  }
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 } : { r: 255, g: 0, b: 0, a: 1 };
};

export const ColorPicker = component.ColorPicker((props) => {
  const isOpen = signal.isOpen(false);
  const isClosing = signal.isAnimatingOut(false);
  const pending = signal.promiseRef({ resolve: null });
  const h = signal.h(0);
  const s = signal.s(100);
  const v = signal.v(100);
  const a = signal.a(1);
  const format = signal.inputFormat('hex');

  const rgb = hsvToRgb(h.value, s.value, v.value);

  const setRgb = ({ r, g, b }) => {
    const hsv = rgbToHsv(r, g, b);
    h.value = hsv.h; s.value = hsv.s; v.value = hsv.v;
  };

  const open = (initialColor = '#FF0000') => {
    const color = parseColor(initialColor);
    setRgb(color);
    a.value = color.a;
    isOpen.value = true;
    isClosing.value = false;
    return new Promise((resolve) => { pending.value = { resolve }; });
  };

  const close = (save = false) => {
    if (!isOpen.value) return;
    isClosing.value = true;
    // let the fade-out finish before unmounting
    setTimeout(() => {
      isOpen.value = false;
      isClosing.value = false;
      pending.value.resolve?.(save ? rgbaToHex(hsvToRgb(h.value, s.value, v.value), a.value) : null);
      pending.value = { resolve: null };
    }, 200);
  };

  // events are delegated, so find the drag surface from the target
  const onDrag = (selector, apply) => (e) => {
    const el = e.target.closest(selector);
    if (!el) return;
    const update = (ev) => {
      const rect = el.getBoundingClientRect();
      apply(
        Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width)),
        Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height))
      );
    };
    const stop = () => {
      window.removeEventListener('pointermove', update);
      window.removeEventListener('pointerup', stop);
    };
    update(e);
    window.addEventListener('pointermove', update);
    window.addEventListener('pointerup', stop);
  };

  const handleHexInput = (e) => {
    const val = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
    if ([4, 7, 9].includes(val.length)) {
      const color = parseColor(val);
      setRgb(color);
      a.value = color.a;
    }
  };

  const handleChannelInput = (channel) => (e) => {
    const val = Math.max(0, Math.min(channel === 'a' ? 1 : 255, parseFloat(e.target.value) || 0));
    if (channel === 'a') a.value = val;
    else setRgb({ ...rgb, [channel]: val });
  };

  if (!isOpen.value) return [open, close, null];

  return [
    open,
    close,
    div(
      {
        'style-position': 'fixed',
        'style-inset': 'fill',
        'style-layer': 'modal',
        'style-layout': 'center',
        'style-surface': 'scrim',
        // fade-out also slides the panel back out (see giant.css)
        'style-motion': isClosing.value ? 'fade-out' : 'fade-in',
        ...props,
        'data-backdrop': true,
        // events are delegated, so e.currentTarget is document: the backdrop is marked instead
        onclick: (e) => e.target.hasAttribute('data-backdrop') && close(false)
      },

      div(
        { 'style-width': 'small', 'style-surface': 'overlay', 'style-radius': 'medium', 'style-border': 'thin', 'style-overflow': 'hidden', 'style-motion': 'slide-in' },

        // saturation (x) / value (y) area
        div(
          {
            'data-drag': 'sv',
            onpointerdown: onDrag('[data-drag="sv"]', (x, y) => { s.value = x * 100; v.value = (1 - y) * 100; }),
            'style-position': 'relative',
            'style-ratio': 'video',
            'style-interactive': 'drag',
            style: { backgroundColor: `hsl(${h.value}, 100%, 50%)` }
          },
          div({ ...FILL, style: { background: 'linear-gradient(to right, #fff, transparent)' } }),
          div({ ...FILL, style: { background: 'linear-gradient(to top, #000, transparent)' } }),
          // 2px white ring around xsmall padding = 12px
          div({
            'style-position': 'absolute',
            'style-pad': 'xsmall',
            'style-radius': 'round',
            'style-border': 'thick',
            'style-interactive': 'inert',
            style: { ...thumbAt(`${s.value}%`, `${100 - v.value}%`), borderColor: '#fff' }
          })
        ),

        div(
          { 'style-layout': 'stack', 'style-pad': 'medium', 'style-gap': 'medium' },

          div(
            { 'style-layout': 'row', 'style-gap': 'medium' },
            // current colour over a checkerboard
            div(
              { 'style-position': 'relative', 'style-pad': 'medium', 'style-radius': 'round', 'style-border': 'thin', style: { backgroundImage: CHECKERBOARD } },
              div({ ...FILL, 'style-radius': 'round', style: { backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a.value})` } })
            ),
            div(
              { 'style-layout': 'stack', 'style-gap': 'small', 'style-flex': 'grow' },
              div(
                { ...BAR, 'data-drag': 'hue', onpointerdown: onDrag('[data-drag="hue"]', (x) => { h.value = x * 360; }), style: { background: HUE_RAMP } },
                div({ ...KNOB, style: thumbAt(`${(h.value / 360) * 100}%`) })
              ),
              div(
                { ...BAR, 'data-drag': 'alpha', onpointerdown: onDrag('[data-drag="alpha"]', (x) => { a.value = x; }), style: { backgroundImage: CHECKERBOARD } },
                div({ ...FILL, 'style-radius': 'round', style: { background: `linear-gradient(to right, transparent, rgb(${rgb.r}, ${rgb.g}, ${rgb.b}))` } }),
                div({ ...KNOB, style: thumbAt(`${a.value * 100}%`) })
              )
            )
          ),

          div(
            { 'style-layout': 'row', 'style-gap': 'small' },
            Button(
              { variant: 'outline', size: 'sm', onclick: () => { format.value = format.value === 'hex' ? 'rgba' : 'hex'; } },
              format.value.toUpperCase()
            ),
            format.value === 'hex'
              ? input({ ...FIELD, value: rgbaToHex(rgb, a.value), oninput: handleHexInput })
              : div(
                  { 'style-layout': 'row', 'style-gap': 'xsmall', 'style-flex': 'grow' },
                  ['r', 'g', 'b', 'a'].map((channel) => input({
                    ...FIELD,
                    'style-pad-inline': 'none',
                    type: channel === 'a' ? 'number' : 'text',
                    step: channel === 'a' ? '0.1' : '1',
                    value: channel === 'a' ? a.value.toFixed(2) : rgb[channel],
                    oninput: handleChannelInput(channel)
                  }))
                )
          ),

          div(
            { 'style-layout': 'row', 'style-justify': 'end', 'style-gap': 'small' },
            Button({ variant: 'secondary', size: 'sm', onclick: () => close(false) }, 'Cancel'),
            Button({ size: 'sm', onclick: () => close(true) }, 'Save')
          )
        )
      )
    )
  ];
});
