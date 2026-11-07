import { component, html } from '../../../giant.js';

// prop → style attribute; values are the attribute's vocabulary
const PROPS = {
  size: 'style-text',
  weight: 'style-weight',
  align: 'style-text-align',
  leading: 'style-leading',
  tracking: 'style-tracking',
  transform: 'style-case',
  decoration: 'style-decoration',
  wrap: 'style-wrap',
  color: 'style-tone'
};

export const Text = component.Text((props = {}, ...children) => {
  /**
   * Polymorphic typography. `as` picks the tag (default p); every other prop
   * in PROPS sets the matching style-* attribute, e.g. size: 'large', color: 'muted'.
   */
  const { as = 'p', size = 'medium', weight = 'regular', ...rest } = props;
  const attrs = {};
  for (const [k, v] of Object.entries({ size, weight, ...rest })) attrs[PROPS[k] || k] = v;
  return (html[as] || html.p)(attrs, ...children);
});
