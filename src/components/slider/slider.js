import { component, html, signal } from '../../../giant.js';

const { div } = html;

export const Slider = component.Slider(function (props = {}) {
  const { value, defaultValue = [0], min = 0, max = 100, step = 1, orientation = 'horizontal', disabled = false, onValueChange, ...rest } = props;

  const toArray = (v) => (Array.isArray(v) ? [...v] : [v]);
  const values = signal.values(toArray(value ?? defaultValue));
  const activeThumb = signal.activeThumbIndex(null);
  const prevValue = signal._prevPropValue(JSON.stringify(value));

  if (value !== undefined && JSON.stringify(value) !== prevValue.value) {
    values.value = toArray(value);
    prevValue.value = JSON.stringify(value);
  }

  const isVertical = orientation === 'vertical';
  const host = this;

  const valueAt = (e, rect) => {
    const pct = isVertical ? 1 - (e.clientY - rect.top) / (rect.height || 1) : (e.clientX - rect.left) / (rect.width || 1);
    return Math.round((min + (max - min) * Math.max(0, Math.min(1, pct))) / step) * step;
  };

  const handlePointerDown = (e) => {
    if (disabled) return;
    // no text selection anywhere on the page while dragging
    // TODO(style): no style-* value for a page-wide user-select lock (style-interactive="drag" on body would also trigger every knob's hover/press)
    e.preventDefault();
    document.body.style.userSelect = 'none';
    const rect = host.getBoundingClientRect();
    const start = valueAt(e, rect);
    const distances = values.value.map((v) => Math.abs(v - start));
    let index = distances.indexOf(Math.min(...distances));
    activeThumb.value = index;

    const update = (ev) => {
      const next = valueAt(ev, rect);
      if (values.value[index] === next) return;
      const sorted = values.value.map((v, i) => (i === index ? next : v)).sort((a, b) => a - b);
      // thumbs may cross over: keep dragging the one that now holds `next`
      activeThumb.value = index = sorted.indexOf(next);
      values.value = sorted;
      onValueChange?.(sorted);
    };

    const stop = (ev) => {
      activeThumb.value = null;
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', update);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      try { host.releasePointerCapture(ev.pointerId); } catch {}
    };

    try { host.setPointerCapture(e.pointerId); } catch {}
    window.addEventListener('pointermove', update);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    update(e);
  };

  // A native listener attached once to the host, always routed to this render's handler (fresh props/signals).
  if (host?.addEventListener) {
    if (!host._sliderPointerDown) host.addEventListener('pointerdown', host._sliderPointerDown = (e) => host._latestPointerDown(e));
    host._latestPointerDown = handlePointerDown;
  }

  const pct = (v) => ((v - min) / (max - min || 1)) * 100;
  const sorted = values.value;
  const rangeStart = sorted.length > 1 ? pct(sorted[0]) : 0;
  const rangeLength = pct(sorted[sorted.length - 1]) - rangeStart;
  // horizontal: full width, thickness from block padding; vertical: the reverse
  const AXIS = isVertical ? { 'style-height': 'full', 'style-pad-inline': 'xsmall' } : { 'style-width': 'full', 'style-pad-block': 'xsmall' };

  return div(
    {
      'style-layout': 'row',
      'style-justify': 'center',
      'style-position': 'relative',
      'style-interactive': disabled ? 'disabled' : 'drag',
      ...AXIS,
      ...rest,
    },
    div(
      { 'style-position': 'relative', 'style-radius': 'round', 'style-surface': 'muted', ...AXIS },
      div({
        'style-position': 'absolute',
        'style-inset': 'fill',
        'style-radius': 'round',
        'style-emphasis': 'soft',
        style: isVertical
          ? { top: 'auto', bottom: `${rangeStart}%`, height: `${rangeLength}%` }
          : { left: `${rangeStart}%`, width: `${rangeLength}%` }
      })
    ),
    ...sorted.map((v, i) =>
      div(
        {
          key: i,
          class: 'slider-thumb-wrapper',
          'style-position': 'absolute',
          'style-layer': activeThumb.value === i ? 'raised' : 'base',
          // TODO(style): no attribute to centre an absolutely positioned element on a point
          style: isVertical
            ? { bottom: `${pct(v)}%`, left: '50%', translate: '-50% 50%' }
            : { left: `${pct(v)}%`, top: '50%', translate: '-50% -50%' }
        },
        // 2px border + small padding = 20px
        div({ 'style-layout': 'block', 'style-pad': 'small', 'style-border': 'thick', 'style-radius': 'round', 'style-emphasis': 'knob' })
      )
    )
  );
});
