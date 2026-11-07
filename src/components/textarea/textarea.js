import { component, html, signal } from '../../../giant.js';

const { textarea } = html;

export const Textarea = component.Textarea((props) => {
  const { value = '', invalid = false, required = false, disabled = false, oninput, ...rest } = props;

  const text = signal.textValue(String(value));
  const prevValue = signal.prevValue(value);
  if (value !== prevValue.value) text.value = String(prevValue.value = value);

  const handleInput = (e) => {
    const { target } = e;
    const { selectionStart, selectionEnd } = target;
    text.value = target.value;
    oninput?.(e, text.value);
    // the re-render rewrites `value`; put the caret back where the user left it
    queueMicrotask(() => {
      if (document.activeElement === target) target.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  return [
    {
      getValue: () => text.value,
      setValue: (val) => { text.value = String(val); },
      clear: () => { text.value = ''; }
    },
    textarea({
      rows: 3,
      'style-width': 'full',
      'style-radius': 'small',
      'style-border': 'thin',
      'style-emphasis': 'field',
      'style-text': 'small',
      'style-pad': 'small',
      ...(invalid && { 'style-tone': 'danger' }),
      ...rest,
      value: text.value,
      disabled,
      required,
      'aria-invalid': String(!!invalid),
      'aria-disabled': disabled ? 'true' : undefined,
      'aria-required': required ? 'true' : undefined,
      oninput: handleInput,
    })
  ];
});
