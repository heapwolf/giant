import { component, html, signal } from '../../../giant.js';

const { span, input, svg, path } = html;

// exported for the docs
export const CheckboxIndicator = ({ isChecked }) =>
  svg(
    {
      viewBox: '0 0 24 24', width: '14', height: '14', fill: 'none', stroke: 'currentColor',
      'stroke-width': '4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      'data-state': isChecked ? 'checked' : 'unchecked',
    },
    isChecked && path({ d: 'M20 6 L9 17 L4 12', 'style-motion': 'fade-in' })
  );

export const Checkbox = component.Checkbox((props, ...children) => {
  const { checked, defaultChecked = false, onChange, onclick, disabled = false, required = false, name, value = 'on', id, ...rest } = props;

  const isChecked = signal.isChecked(checked ?? defaultChecked);
  const isDisabled = signal.disabled(disabled);
  const prevChecked = signal._prevChecked(checked);
  const prevDisabled = signal._prevDisabled(disabled);

  if (checked !== undefined && checked !== prevChecked.value) isChecked.value = prevChecked.value = checked;
  if (disabled !== prevDisabled.value) isDisabled.value = prevDisabled.value = disabled;

  // controlled (`checked` given): only report the change; uncontrolled: also flip the state
  const setChecked = (next, event) => {
    if (checked === undefined) isChecked.value = next;
    onChange?.(next, event);
  };

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDisabled.value) return;
    setChecked(!isChecked.value, e);
    if (e.type === 'click') onclick?.(e);
  };

  return [
    {
      check: () => setChecked(true),
      uncheck: () => setChecked(false),
      toggle: () => setChecked(!isChecked.value),
      getValue: () => isChecked.value,
      enable: () => { isDisabled.value = false; },
      disable: () => { isDisabled.value = true; },
    },
    span(
      {
        'style-layout': 'inline',
        'style-gap': 'small',
        'style-position': 'relative',
        'style-interactive': isDisabled.value ? 'disabled' : 'clickable',
        ...rest,
        'data-checkbox-root': true,
        role: 'checkbox',
        tabindex: isDisabled.value ? '-1' : '0',
        'aria-checked': String(isChecked.value),
        'aria-disabled': isDisabled.value ? 'true' : undefined,
        'data-state': isChecked.value ? 'checked' : 'unchecked',
        onclick: handleToggle,
        onkeydown: (e) => (e.key === ' ' || e.key === 'Enter') && handleToggle(e),
      },
      // native input for form submission and `required` validation
      input({
        id, type: 'checkbox', name, value, checked: isChecked.value, required, disabled: isDisabled.value,
        tabindex: '-1', 'aria-hidden': 'true', 'style-visibility': 'screen-reader',
      }),
      span(
        {
          'aria-hidden': 'true',
          'style-layout': 'inline',
          'style-size': 'xsmall',
          'style-radius': 'small',
          'style-border': 'thin',
          'style-motion': 'colors',
          ...(isChecked.value ? { 'style-emphasis': 'solid' } : { 'style-surface': 'raised' }),
        },
        CheckboxIndicator({ isChecked: isChecked.value })
      ),
      ...children
    )
  ];
});
