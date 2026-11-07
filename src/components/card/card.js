import { component, html } from '../../../giant.js';

const { div, h3, p } = html;

const PAD = { 'style-pad': 'large' };

const VARIANTS = {
  default: { 'style-surface': 'raised', 'style-border': 'thin' },
  outline: { 'style-border': 'thin' },
  transparent: {},
  sunk: { 'style-surface': 'muted' }
};

/** @param {'default'|'outline'|'transparent'|'sunk'} [props.variant='default'] */
export const Card = component.Card(({ variant, ...props } = {}, ...children) =>
  div({ ...(VARIANTS[variant] || VARIANTS.default), 'style-radius': 'medium', ...props }, ...children));

export const CardHeader = component.CardHeader((props = {}, ...children) =>
  div({ 'style-layout': 'stack', 'style-gap': 'small', ...PAD, ...props }, ...children));

export const CardTitle = component.CardTitle((props = {}, ...children) =>
  h3({ 'style-weight': 'semibold', 'style-leading': 'tight', 'style-margin': 'none', ...props }, ...children));

export const CardDescription = component.CardDescription((props = {}, ...children) =>
  p({ 'style-text': 'small', 'style-tone': 'muted', 'style-margin': 'none', ...props }, ...children));

// TODO(style): no single-side padding; `style-pad-start="none"` would replace the paddingBlockStart below.
export const CardContent = component.CardContent(({ style = {}, ...props } = {}, ...children) =>
  div({ ...PAD, ...props, style: { paddingBlockStart: 0, ...style } }, ...children));

export const CardFooter = component.CardFooter((props = {}, ...children) =>
  div({ 'style-layout': 'row', 'style-gap': 'small', ...PAD, ...props }, ...children));
