import { component, html, signal } from '../../../giant.js';
import { Tooltip } from '../tooltip/tooltip.js';

const { input, div, span } = html;

const SIZES = {
  sm: { 'style-text': 'xsmall', 'style-pad-block': 'xsmall', 'style-pad-inline': 'small' },
  md: { 'style-text': 'small', 'style-pad-block': 'small', 'style-pad-inline': 'small' },
  lg: { 'style-text': 'medium', 'style-pad-block': 'small', 'style-pad-inline': 'medium' },
};

const VARIANTS = {
  default: { 'style-emphasis': 'field', 'style-border': 'thin', 'style-surface': 'raised' },
  ghost: { 'style-emphasis': 'ghost' },
};

export const Input = component.Input((props) => {
  const { id, value = '', variant = 'default', size = 'md', invalid = false, errorMessage = '', required = false, disabled = false, oninput, ...rest } = props;

  const text = signal.value(String(value));
  const prevValue = signal._prevValue(value);
  const isInvalid = signal.invalid(!!invalid);
  const prevInvalid = signal._prevInvalid(invalid);
  const error = signal.errorMessage(errorMessage);
  const prevError = signal._prevErrorMessage(errorMessage);

  if (value !== prevValue.value) text.value = String(prevValue.value = value);
  if (invalid !== prevInvalid.value) isInvalid.value = !!(prevInvalid.value = invalid);
  if (errorMessage !== prevError.value) error.value = prevError.value = errorMessage;
  const showInvalid = isInvalid.value || !!error.value;

  const handleInput = (e) => {
    const { target } = e;
    const { selectionStart, selectionEnd } = target;
    text.value = target.value;
    // typing again dismisses the error
    isInvalid.value = false;
    error.value = '';
    oninput?.(e, text.value);
    // the re-render rewrites `value`; put the caret back where the user left it
    // (setSelectionRange throws on email, number, … inputs)
    queueMicrotask(() => {
      if (document.activeElement === target && /^(text|search|password|tel|url)$/.test(target.type)) target.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  return [
    // host methods must be named: giant exposes them on the element by key
    {
      getValue: () => text.value,
      setValue: (val) => { text.value = String(val); },
      clear: () => { text.value = ''; },
      setInvalid: (st) => { isInvalid.value = !!st; },
      // shows `msg` in a danger tooltip under the input; a falsy msg clears it
      setError: (msg) => { isInvalid.value = !!msg; error.value = msg || ''; },
    },
    Tooltip({
      content: id ? span({ id: `${id}-error` }, error.value) : error.value,
      forceOpen: !!error.value,
      disabled: !error.value,
      variant: 'danger',
      position: 'bottom',
      'style-width': 'full',
    }, input({
      id,
      type: 'text',
      'style-width': 'full',
      'style-radius': 'small',
      ...(SIZES[size] || SIZES.md),
      ...(VARIANTS[variant] || VARIANTS.default),
      ...(showInvalid && variant !== 'ghost' && { 'style-tone': 'danger' }),
      ...rest,
      value: text.value,
      disabled,
      required,
      'aria-invalid': String(showInvalid),
      'aria-errormessage': id && error.value ? `${id}-error` : undefined,
      'aria-disabled': disabled ? 'true' : undefined,
      'aria-required': required ? 'true' : undefined,
      oninput: handleInput,
    }))
  ];
});

// a field container: draws the border, hover state and :focus-within ring for the ghost input inside
export const InputGroup = component.InputGroup(({ invalid = false, disabled = false, ...rest } = {}, ...children) =>
  div({
    'style-layout': 'row',
    'style-align': 'stretch',
    'style-width': 'full',
    'style-radius': 'small',
    'style-border': 'thin',
    'style-emphasis': 'field',
    'style-overflow': 'hidden',
    ...(invalid && { 'style-tone': 'danger' }),
    ...(disabled && { 'style-interactive': 'disabled', 'aria-disabled': 'true' }),
    ...rest,
  }, ...children)
);

const addon = (divider) => (props, ...children) => div({
  'style-layout': 'row',
  'style-justify': 'center',
  'style-pad-inline': 'small',
  'style-tone': 'muted',
  'style-text': 'small',
  'style-divider': divider,
  ...props,
}, ...children);

export const InputLeftAddon = component.InputLeftAddon(addon('end'));
export const InputRightAddon = component.InputRightAddon(addon('start'));
