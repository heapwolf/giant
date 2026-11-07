import { component, html, signal } from '../../../giant.js';

const BASE = {
  'style-layout': 'inline',
  'style-gap': 'xsmall',
  'style-border': 'thin',
  'style-radius': 'small',
  'style-text': 'xsmall',
  'style-weight': 'medium',
  'style-case': 'upper',
  'style-font': 'mono',
  'style-pad-block': 'none',
  'style-pad-inline': 'small',
  'style-interactive': 'static',
  'style-motion': 'all',
};

const VARIANTS = {
  default: { 'style-tone': 'accent', 'style-emphasis': 'soft' },
  secondary: { 'style-tone': 'neutral', 'style-emphasis': 'soft' },
  destructive: { 'style-tone': 'danger', 'style-emphasis': 'soft' },
  outline: { 'style-tone': 'neutral', 'style-emphasis': 'outline' },
};

export const Badge = component.Badge((props = {}, ...children) => {
  const { variant, ...rest } = props;
  const current = signal.variant(variant || 'default');

  // a changed `variant` prop wins over setVariant()
  if (variant !== undefined && variant !== current._lastProp) current.value = variant;
  current._lastProp = variant;

  return [
    { setVariant: (v) => { current.value = v; } },
    html.div({ ...BASE, ...(VARIANTS[current.value] || VARIANTS.default), ...rest }, ...children)
  ];
});
