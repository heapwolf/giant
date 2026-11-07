import { component, html, signal } from '../../../giant.js';

const { button, span, input } = html;

// thumb and an equally sized spacer: the track is two thumbs wide and the thumb slides over the spacer
const KNOB = { 'style-layout': 'block', 'style-pad': 'small', 'style-radius': 'round' };

export const Switch = component.Switch((props = {}, ...children) => {
  const { checked, defaultChecked = false, onChange, onclick, disabled = false, required = false, name, value = 'on', ...rest } = props;

  const isChecked = signal.isChecked(checked ?? defaultChecked);
  const prevChecked = signal.prevChecked(checked);
  if (checked !== undefined && checked !== prevChecked.value) isChecked.value = prevChecked.value = checked;

  const setChecked = (next, event) => {
    isChecked.value = next;
    onChange?.(next, event);
  };

  return [
    setChecked,
    {
      'style-layout': 'inline',
      'style-gap': 'small',
      'style-interactive': disabled ? 'static' : 'clickable',
      onclick(e) {
        if (disabled) return e.preventDefault();
        const next = !isChecked.value;
        setChecked(next, e);
        // a bubbling `change` from the switch, so form-level and `onchange` listeners see user toggles
        this.querySelector('[role="switch"]').dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { checked: next, value: next } }));
        onclick?.(e);
      },
    },
    button(
      {
        'style-layout': 'inline',
        'style-justify': 'start',
        'style-pad': 'xsmall',
        'style-radius': 'round',
        'style-emphasis': isChecked.value ? 'solid' : 'soft',
        ...rest,
        type: 'button',
        role: 'switch',
        'aria-checked': String(isChecked.value),
        'aria-required': required ? 'true' : undefined,
        'data-state': isChecked.value ? 'checked' : 'unchecked',
        disabled,
      },
      span({ ...KNOB, 'style-emphasis': 'knob', style: { translate: isChecked.value ? '100% 0' : '0 0' } }),
      span({ ...KNOB, 'aria-hidden': 'true' }),
      // native input for form submission and `required` validation
      name && input({
        type: 'checkbox', name, value, checked: isChecked.value, required,
        tabindex: '-1', 'aria-hidden': 'true', 'style-visibility': 'screen-reader',
      })
    ),
    ...children
  ];
});
