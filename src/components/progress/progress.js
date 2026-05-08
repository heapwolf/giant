import { component, html, design, signal } from '../../../giant.js';

const { div } = html;

export const Progress = component.Progress((props, ...children) => {
  const {
    value = null,
    max = 100,
    getValueLabel,
    indicatorClass = '',
    class: className = '',
    style = {},
    ...rest
  } = props;

  const currentValue = signal.value(value);
  const maxSignal = signal.max(max);
  const prevValue = signal._prevValue(value);

  if (value !== undefined && value !== prevValue.value) {
    currentValue.value = value;
    prevValue.value = value;
  }

  const val = currentValue.value;
  const m = maxSignal.value;
  const isIndeterminate = val === null || val === undefined;
  const safeValue = isIndeterminate ? null : Math.min(m, Math.max(0, val));
  const percentage = isIndeterminate ? null : (safeValue / m) * 100;
  const state = isIndeterminate ? 'indeterminate' : safeValue === m ? 'complete' : 'loading';

  return [
    {
      setValue: (v) => { currentValue.value = v; },
      getValue: () => currentValue.value,
      setMax: (newM) => { maxSignal.value = newM; }
    },
    div(
      {
        ...rest,
        role: 'progressbar',
        'aria-valuemin': '0',
        'aria-valuemax': String(m),
        'aria-valuenow': isIndeterminate ? null : safeValue,
        'data-state': state,
        class: [
          design.layout.relative,
          design.size.wFull,
          design.shape.radiusRound,
          design.bg.bgSurfaceMuted,
          className
        ],
        style: { height: '0.75rem', overflow: 'hidden', display: 'block', ...style }
      },
      div({
        class: [
          design.layout.flex,
          design.size.wFull,
          design.size.hFull,
          indicatorClass
        ],
        'data-state': state,
        style: {
          backgroundColor: indicatorClass ? undefined : 'var(--color-primary, var(--color-primary-5, blue))',
          height: '100%',
          width: '100%',
          transform: isIndeterminate ? undefined : `translateX(${percentage - 100}%)`,
          transition: 'transform 600ms cubic-bezier(0.65, 0, 0.35, 1)'
        }
      })
    )
  ];
});
