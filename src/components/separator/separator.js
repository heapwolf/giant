import { component, html } from '../../../giant.js';

export const Separator = component.Separator((props = {}) => {
  const { orientation = 'horizontal', decorative = true, ...rest } = props;
  const horizontal = orientation === 'horizontal';

  return html.div({
    'style-flex': 'none',
    ...(horizontal
      ? { 'style-divider': 'top', 'style-width': 'full' }
      : { 'style-divider': 'start', 'style-height': 'full' }),
    ...rest,
    role: decorative ? 'none' : 'separator',
    'aria-orientation': decorative ? undefined : orientation,
    'data-orientation': orientation
  });
});
