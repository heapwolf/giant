import { component, html, design, signal } from '../../../giant.js';
// Assumed Button import based on your library structure
import { Button } from '../button/button.js';

const { div, input, span, style: styleTag, svg, path } = html;

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
const rgbaToHex = (r, g, b, a) => `#${toHex(r)}${toHex(g)}${toHex(b)}${a < 1 ? toHex(a * 255) : ''}`.toUpperCase();

const parseColor = (str) => {
  if (str.startsWith('#')) {
    let h = str.replace('#', '');
    if (h.length === 3) h = h.split('').map(x => x + x).join('');
    if (h.length === 4) h = h.split('').map(x => x + x).join('');
    return {
      r: parseInt(h.substring(0, 2), 16) || 0,
      g: parseInt(h.substring(2, 4), 16) || 0,
      b: parseInt(h.substring(4, 6), 16) || 0,
      a: h.length === 8 ? (parseInt(h.substring(6, 8), 16) / 255) : 1
    };
  }
  const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) return { r: +match[1], g: +match[2], b: +match[3], a: match[4] !== undefined ? +match[4] : 1 };
  return { r: 255, g: 0, b: 0, a: 1 };
};

export const ColorPicker = component.ColorPicker((props) => {
  const { class: customClass = '', ...rest } = props;

  const rootId = signal.rootId(`colorpicker-${Math.random().toString(36).slice(2, 9)}`);
  const isOpen = signal.isOpen(false);
  const isAnimatingOut = signal.isAnimatingOut(false);
  const promiseRef = signal.promiseRef({ resolve: null });

  const h = signal.h(0);
  const s = signal.s(100);
  const v = signal.v(100);
  const a = signal.a(1);
  const inputFormat = signal.inputFormat('hex');

  const rgb = () => hsvToRgb(h.value, s.value, v.value);
  const hexValue = () => rgbaToHex(rgb().r, rgb().g, rgb().b, a.value);

  const open = (initialColor = '#FF0000') => {
    const { r, g, b, a: initialA } = parseColor(initialColor);
    const hsv = rgbToHsv(r, g, b);
    h.value = hsv.h; s.value = hsv.s; v.value = hsv.v; a.value = initialA;

    isOpen.value = true;
    isAnimatingOut.value = false;
    return new Promise((resolve) => { promiseRef.value = { resolve }; });
  };

  const close = (save = false) => {
    if (!isOpen.value) return;
    isAnimatingOut.value = true;

    setTimeout(() => {
      isOpen.value = false;
      isAnimatingOut.value = false;
      if (promiseRef.value?.resolve) {
        promiseRef.value.resolve(save ? hexValue() : null);
        promiseRef.value = { resolve: null };
      }
    }, 200);
  };

  // FIX: Using closest() to grab the element since currentTarget is the document
  const createDragHandler = (updateFn, selector) => (e) => {
    const el = e.target.closest(selector);
    if (!el) return;

    const update = (evt) => {
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (evt.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (evt.clientY - rect.top) / rect.height));
      updateFn(x, y);
    };

    update(e);

    const onMove = (evt) => update(evt);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onSVDowndown = createDragHandler((x, y) => {
    s.value = x * 100;
    v.value = (1 - y) * 100;
  }, '[data-drag="sv"]');

  const onHueDown = createDragHandler((x) => {
    h.value = x * 360;
  }, '[data-drag="hue"]');

  const onAlphaDown = createDragHandler((x) => {
    a.value = x;
  }, '[data-drag="alpha"]');

  const handleHexInput = (e) => {
    let val = e.target.value;
    if (!val.startsWith('#')) val = '#' + val;
    if (val.length === 4 || val.length === 7 || val.length === 9) {
      const { r, g, b, a: newA } = parseColor(val);
      const hsv = rgbToHsv(r, g, b);
      h.value = hsv.h; s.value = hsv.s; v.value = hsv.v; a.value = newA;
    }
  };

  const handleRgbaInput = (channel) => (e) => {
    const val = parseFloat(e.target.value) || 0;
    const currentRgb = rgb();
    const newRgb = { ...currentRgb, [channel]: Math.max(0, Math.min(channel === 'a' ? 1 : 255, val)) };
    const hsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);
    h.value = hsv.h; s.value = hsv.s; v.value = hsv.v;
    if (channel === 'a') a.value = newRgb.a;
  };

  const isVisible = isOpen.value || isAnimatingOut.value;
  const pickerState = isAnimatingOut.value ? 'closing' : (isOpen.value ? 'open' : 'closed');

  if (!isVisible) return [open, close, null];

  const currentRgb = rgb();
  const currentColorStr = `rgba(${currentRgb.r}, ${currentRgb.g}, ${currentRgb.b}, ${a.value})`;
  const pureHueStr = `hsl(${h.value}, 100%, 50%)`;
  const checkerboard = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><path fill="%23e5e7eb" d="M0 0h4v4H0zm4 4h4v4H4z"/></svg>')`;

  return [
    open,
    close,
    div(
      {
        ...rest,
        id: rootId.value,
        'data-picker-state': pickerState,
        class: [
          design.layout.fixed,
          design.layout.inset0,
          design.layout.zModal,
          design.layout.flex,
          design.layout.itemsCenter,
          design.layout.justifyCenter,
          // FIX: Add the same root fade-in keyframe as the Dialog
          !isAnimatingOut.value && (design.animation?.fadeIn || 'animation-fade-in'),
          customClass
        ],
        style: {
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(2px)',
            opacity: isAnimatingOut.value ? 0 : 1,
            transition: 'opacity 0.2s ease-out',
            ...rest.style
        },
        onclick: (e) => e.target === e.currentTarget && close(false)
      },

      // FIX: Replicate the Dialog's style-tag exit transition pattern
      styleTag(`
        #${rootId.value} [data-picker-content] {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        #${rootId.value}[data-picker-state="open"] [data-picker-content] {
          opacity: 1;
          transform: scale(1);
        }
        #${rootId.value}[data-picker-state="closing"] [data-picker-content] {
          opacity: 0;
          transform: scale(0.96);
        }
      `),

      div(
        {
          'data-picker-content': 'true',
          class: [
            design.bg.bg,
            design.shape.radius3,
            design.effect.shadow3,
            design.shape.border1,
            design.border.border,
            // FIX: Add your design system's zoom-in keyframe for the panel
            !isAnimatingOut.value && (design.misc?.enterZoom96 || 'enter-zoom-96')
          ],
          style: { width: '260px', overflow: 'hidden' }
        },
        // S/V Drag Area
        div(
          {
            'data-drag': 'sv',
            onpointerdown: onSVDowndown,
            style: { width: '100%', height: '150px', position: 'relative', backgroundColor: pureHueStr, cursor: 'crosshair', touchAction: 'none' }
          },
          div({ style: { position: 'absolute', inset: 0, background: 'linear-gradient(to right, #fff, transparent)', pointerEvents: 'none' } }),
          div({ style: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, #000, transparent)', pointerEvents: 'none' } }),
          div({
            style: {
              position: 'absolute', left: `${s.value}%`, top: `${100 - v.value}%`, width: '12px', height: '12px',
              transform: 'translate(-50%, -50%)', borderRadius: '50%', border: '2px solid white',
              boxShadow: '0 0 2px rgba(0,0,0,0.4)', pointerEvents: 'none'
            }
          })
        ),

        // Controls Section
        div(
          { style: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' } },

          div(
            { style: { display: 'flex', gap: '12px', alignItems: 'center' } },
            div({
              style: { width: '32px', height: '32px', borderRadius: '50%', backgroundImage: checkerboard, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }
            }, div({ style: { width: '100%', height: '100%', borderRadius: '50%', backgroundColor: currentColorStr }})),

            div(
              { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' } },
              div(
                {
                  'data-drag': 'hue',
                  onpointerdown: onHueDown,
                  style: { height: '12px', borderRadius: '6px', cursor: 'pointer', touchAction: 'none', position: 'relative', background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }
                },
                div({ style: { position: 'absolute', left: `${(h.value / 360) * 100}%`, top: '50%', transform: 'translate(-50%, -50%)', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', pointerEvents: 'none' }})
              ),
              div(
                {
                  'data-drag': 'alpha',
                  onpointerdown: onAlphaDown,
                  style: { height: '12px', borderRadius: '6px', cursor: 'pointer', touchAction: 'none', position: 'relative', backgroundImage: checkerboard }
                },
                div({ style: { position: 'absolute', inset: 0, borderRadius: '6px', background: `linear-gradient(to right, transparent, rgb(${currentRgb.r}, ${currentRgb.g}, ${currentRgb.b}))`, pointerEvents: 'none' }}),
                div({ style: { position: 'absolute', left: `${a.value * 100}%`, top: '50%', transform: 'translate(-50%, -50%)', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', pointerEvents: 'none' }})
              )
            )
          ),

          div(
            { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
            div(
              {
                style: { cursor: 'pointer', userSelect: 'none', fontWeight: 'bold', fontSize: '12px', padding: '4px', color: '#666', border: '1px solid #ddd', borderRadius: '4px' },
                onclick: () => inputFormat.value = inputFormat.value === 'hex' ? 'rgba' : 'hex'
              },
              inputFormat.value.toUpperCase()
            ),

            inputFormat.value === 'hex'
              ? input({ value: hexValue(), oninput: handleHexInput, style: { flex: 1, width: '100%', fontSize: '12px', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' } })
              : div(
                  { style: { flex: 1, display: 'flex', gap: '4px' } },
                  ['r', 'g', 'b', 'a'].map(channel => input({
                    type: channel === 'a' ? 'number' : 'text', step: channel === 'a' ? '0.1' : '1',
                    value: channel === 'a' ? a.value.toFixed(2) : currentRgb[channel],
                    oninput: handleRgbaInput(channel),
                    style: { width: '100%', minWidth: '0', fontSize: '12px', padding: '6px 2px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }
                  }))
                )
          ),

          div(
            { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' } },
            Button({ onclick: () => close(false), class: [design.bg.bgMuted, design.fg.fgMuted], style: { padding: '6px 12px' } }, 'Cancel'),
            Button({ onclick: () => close(true), class: [design.bg.bgAction, design.fg.fgAction], style: { padding: '6px 12px' } }, 'Save')
          )
        )
      )
    )
  ];
});
