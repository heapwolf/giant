import { component, html } from '../../../giant.js';

const BASE = {
  'style-layout': 'inline',
  'style-gap': 'small',
  'style-radius': 'small',
  'style-border': 'thin',
  'style-weight': 'medium',
  'style-tone': 'neutral',
};

const VARIANTS = {
  primary: { 'style-emphasis': 'solid' },
  secondary: { 'style-emphasis': 'soft' },
  outline: { 'style-emphasis': 'outline' },
  ghost: { 'style-emphasis': 'ghost' },
  link: { 'style-emphasis': 'link', 'style-pad-block': 'none', 'style-pad-inline': 'none' },
  destructive: { 'style-emphasis': 'solid', 'style-tone': 'danger' },
  attention: { 'style-emphasis': 'solid', 'style-tone': 'success' },
};

const SIZES = {
  sm: { 'style-text': 'xsmall', 'style-pad-block': 'xsmall', 'style-pad-inline': 'xsmall', 'style-case': 'upper', 'style-tracking': 'wide' },
  md: { 'style-text': 'small', 'style-pad-block': 'small', 'style-pad-inline': 'small' },
  lg: { 'style-text': 'medium', 'style-pad-block': 'small', 'style-pad-inline': 'medium' },
  icon: { 'style-pad': 'small', 'style-ratio': 'square' },
};

// A disabled native button never fires click, so `loading` only has to disable it.
export const Button = component.Button(({ variant = 'primary', size = 'md', loading, disabled, type = 'button', ...rest } = {}, ...children) =>
  html.button({
    ...BASE,
    ...SIZES[size],
    ...VARIANTS[variant],
    ...rest,
    type,
    disabled: Boolean(disabled || loading),
    'aria-busy': loading ? 'true' : undefined,
  }, ...children)
);
