import { component, html, signal } from '../../../giant.js';

const { div } = html;

// The fill inherits style-tone from the root, e.g. Progress({ 'style-tone': 'success' }).
export const Progress = component.Progress((props = {}) => {
  const { value = null, max = 100, style = {}, ...rest } = props;

  const current = signal.value(value);
  const maxSignal = signal.max(max);
  const prevValue = signal._prevValue(value);

  if (value !== prevValue.value) {
    current.value = value;
    prevValue.value = value;
  }

  const m = maxSignal.value;
  const indeterminate = current.value == null;
  const safe = indeterminate ? null : Math.min(m, Math.max(0, current.value));
  const state = indeterminate ? 'indeterminate' : safe === m ? 'complete' : 'loading';

  return [
    {
      setValue: (v) => { current.value = v; },
      getValue: () => current.value,
      setMax: (v) => { maxSignal.value = v; }
    },
    div(
      {
        'style-position': 'relative',
        'style-width': 'full',
        'style-overflow': 'hidden',
        'style-radius': 'round',
        'style-surface': 'muted',
        ...rest,
        role: 'progressbar',
        'aria-valuemin': '0',
        'aria-valuemax': String(m),
        'aria-valuenow': safe,
        'data-state': state,
        // TODO(style): no small fixed height; a `style-height="xsmall"` (0.75rem track) would replace this.
        style: { height: '0.75rem', ...style }
      },
      div({
        'style-height': 'full',
        'style-emphasis': 'solid',
        'style-motion': 'all',
        'data-state': state,
        style: indeterminate ? undefined : { transform: `translateX(${(safe / m) * 100 - 100}%)` }
      })
    )
  ];
});
