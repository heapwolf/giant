import { component, html } from '../../../giant.js';

const { label, span } = html;

export const Label = component.Label(({ required = false, disabled = false, ...rest }, ...children) =>
  label(
    {
      'style-layout': 'inline-block',
      'style-text': 'small',
      'style-weight': 'medium',
      'style-leading': 'tight',
      'style-interactive': disabled ? 'disabled' : 'clickable',
      ...rest,
      'data-disabled': String(disabled),
    },
    ...children,
    required && span({ 'aria-hidden': 'true', 'style-tone': 'danger', 'style-pad-inline': 'xsmall', 'style-interactive': 'static' }, '*')
  )
);
