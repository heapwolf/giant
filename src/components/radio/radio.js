import { component, html, signal } from '../../../giant.js';

const { div, input } = html;

// attributes each part gets while its item is checked
const CHECKED = {
  circle: { 'style-emphasis': 'outline' },
  dot: { 'style-emphasis': 'solid' },
};

export const Radio = component.Radio((props, ...children) => {
  const { value, defaultValue, name, onValueChange, ...rest } = props;
  const groupName = name ?? signal._groupName(`radio-group-${Math.random().toString(36).slice(2, 9)}`).value;
  const currentValue = value ?? defaultValue;

  // Walks the items (real DOM nodes once mounted, VNodes before) and pushes name/checked state into them.
  const syncNode = (node, itemValue = null) => {
    if (node?._type === '#dom' && node.node) {
      syncNode(node.node, itemValue);
      return node;
    }
    const isDom = node?.nodeType === 1;
    if (!isDom && !node?._type) return node;

    const attrs = isDom ? null : { ...node.attributes };
    const get = (k) => (isDom ? node.getAttribute(k) : attrs[k]);
    const set = (k, v) => {
      if (isDom) v == null ? node.removeAttribute(k) : node.setAttribute(k, v);
      else if (v == null) delete attrs[k];
      else attrs[k] = v;
    };

    if (get('data-radio-type') === 'item') itemValue = get('data-value');
    if (itemValue !== null) {
      const isChecked = itemValue === currentValue;
      const target = get('data-radio-target');
      if (target === 'input') {
        set('name', groupName);
        if (isDom) {
          node.checked = isChecked;
          node._radioChange = () => onValueChange?.(itemValue);
          if (!node._radioBound) {
            node._radioBound = true;
            node.addEventListener('change', () => !node.disabled && node._radioChange());
          }
        } else {
          attrs.checked = isChecked;
          const own = attrs.onchange;
          attrs.onchange = (e) => {
            if (attrs.disabled) return;
            onValueChange?.(itemValue);
            own?.(e);
          };
        }
      }
      for (const [k, v] of Object.entries(CHECKED[target] || {})) set(k, isChecked ? v : null);
    }

    if (isDom) {
      Array.from(node.children).forEach((child) => syncNode(child, itemValue));
      return node;
    }
    return { ...node, attributes: attrs, ...(node.children && { children: node.children.map((c) => syncNode(c, itemValue)) }) };
  };

  return div(
    { role: 'radiogroup', 'style-layout': 'stack', 'style-gap': 'small', ...rest },
    ...children.map((child) => syncNode(child))
  );
});

const PART = { 'style-pad': 'xsmall', 'style-radius': 'round', 'style-motion': 'colors' };

export const RadioItem = component.RadioItem(({ value, disabled = false, ...rest }, ...children) =>
  div(
    {
      'data-radio-type': 'item',
      'data-value': value,
      'style-layout': 'inline',
      'style-gap': 'small',
      'style-position': 'relative',
      'style-interactive': disabled ? 'disabled' : undefined,
      ...rest
    },
    // 2px ring + xsmall padding around an 8px dot = 20px
    div(
      { 'data-radio-target': 'circle', 'aria-hidden': 'true', 'style-layout': 'center', 'style-border': 'thick', 'style-surface': 'base', ...PART },
      div({ 'data-radio-target': 'dot', 'style-layout': 'block', ...PART })
    ),
    // the real radio, invisible and stretched over the item so it takes clicks, focus and arrow keys
    // TODO(style): no focus-within ring for a non-field container, so keyboard focus is not drawn
    input({
      'data-radio-target': 'input',
      type: 'radio',
      value,
      disabled,
      'style-position': 'absolute',
      'style-inset': 'fill',
      'style-width': 'full',
      'style-height': 'full',
      'style-margin': 'none',
      'style-interactive': disabled ? 'disabled' : 'clickable',
      'style-visibility': 'invisible',
    }),
    div({ 'style-text': 'small', 'style-weight': 'medium' }, ...children)
  )
);
