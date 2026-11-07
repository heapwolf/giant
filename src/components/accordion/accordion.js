import { component, html, signal } from '../../../giant.js';

const { div, button, h3, svg, path } = html;

/**
 * Accordion root.
 * @param {'single'|'multiple'} [props.type='single'] - Whether one or several items can be open.
 * @param {boolean} [props.collapsible=true] - In single mode, whether the open item can be closed.
 * @param {string|string[]} [props.value] - Controlled open item(s).
 * @param {string|string[]} [props.defaultValue] - Initially open item(s).
 * @param {(value: string|string[]) => void} [props.onValueChange]
 */
export const Accordion = component.Accordion((props, ...children) => {
  const { type = 'single', collapsible = true, value, defaultValue, onValueChange, ...rest } = props;

  const toArray = (v) => (Array.isArray(v) ? v : [v].filter(Boolean));
  const values = signal.values(toArray(value !== undefined ? value : defaultValue));
  const prevValue = signal.prevValue(JSON.stringify(value));

  if (value !== undefined && JSON.stringify(value) !== prevValue.value) {
    values.value = toArray(value);
    prevValue.value = JSON.stringify(value);
  }

  const toggle = (val) => {
    const isOpen = values.value.includes(val);
    if (type === 'single') values.value = isOpen && collapsible ? [] : [val];
    else values.value = isOpen ? values.value.filter((v) => v !== val) : [...values.value, val];
    onValueChange?.(type === 'single' ? values.value[0] : values.value);
  };

  const stateFor = (part, isOpen) => {
    const state = { 'data-state': isOpen ? 'open' : 'closed' };
    if (part === 'chevron') state.style = { transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' };
    if (part === 'content') state.hidden = !isOpen;
    if (part === 'trigger') state['aria-expanded'] = String(isOpen);
    return state;
  };

  // Injects open state into item parts (DOM nodes on the client, VNodes otherwise); itemValue comes from the enclosing item.
  const syncNode = (node, itemValue = null) => {
    if (node?.nodeType === 1) {
      const part = node.getAttribute('data-accordion-type');
      if (part === 'item') itemValue = node.getAttribute('data-value');

      if (part) {
        const val = itemValue;
        for (const [k, v] of Object.entries(stateFor(part, values.value.includes(val)))) {
          if (k === 'hidden') node.hidden = v;
          else if (k === 'style') Object.assign(node.style, v);
          else node.setAttribute(k, v);
        }
        if (part === 'trigger' && !node._hasAccordionClick) {
          node._hasAccordionClick = true;
          node.addEventListener('click', () => { if (!node.disabled) toggle(val); });
        }
      }

      Array.from(node.children).forEach((child) => syncNode(child, itemValue));
      return node;
    }

    if (!node?._type) return node;
    if (node._type === '#dom') {
      if (node.node) syncNode(node.node, itemValue);
      return node;
    }

    const attributes = { ...node.attributes };
    const { 'data-accordion-type': part, onclick } = attributes;
    if (part === 'item') itemValue = attributes['data-value'];

    if (part) {
      const val = itemValue;
      const { style, ...state } = stateFor(part, values.value.includes(val));
      Object.assign(attributes, state);
      if (style) attributes.style = { ...attributes.style, ...style };
      if (part === 'trigger') {
        attributes.onclick = (e) => {
          if (attributes.disabled) return;
          toggle(val);
          onclick?.(e);
        };
      }
    }

    return { ...node, attributes, children: node.children?.map((child) => syncNode(child, itemValue)) };
  };

  return div({ 'style-width': 'full' }, rest, ...children.map((child) => syncNode(child)));
});

/** One accordion item; `value` is auto-generated when omitted. */
export const AccordionItem = component.AccordionItem(
  ({ value = `item-${Math.random().toString(36).slice(2, 9)}`, ...rest }, ...children) =>
    div({ 'style-divider': 'bottom' }, rest, { 'data-accordion-type': 'item', 'data-value': value }, ...children)
);

export const AccordionTrigger = component.AccordionTrigger((props, ...children) => h3(
  { 'style-layout': 'row', 'style-margin': 'none', 'style-text': 'medium' },
  button(
    {
      'style-layout': 'row',
      'style-justify': 'between',
      'style-gap': 'medium',
      'style-width': 'full',
      'style-pad-block': 'medium',
      'style-weight': 'medium',
      'style-text-align': 'start',
      'style-interactive': 'clickable',
      'style-decoration': 'hover'
    },
    props,
    { type: 'button', 'data-accordion-type': 'trigger' },
    ...children,
    svg(
      {
        'data-accordion-type': 'chevron',
        viewBox: '0 0 24 24',
        width: '16',
        height: '16',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'style-flex': 'none',
        'style-motion': 'all'
      },
      path({ d: 'm6 9 6 6 6-6' })
    )
  )
));

export const AccordionContent = component.AccordionContent((props, ...children) => div(
  { 'style-text': 'small', 'style-overflow': 'hidden' },
  props,
  { 'data-accordion-type': 'content' },
  div({ 'style-pad-block': 'small' }, ...children)
));
