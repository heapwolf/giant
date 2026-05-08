import { component, html, design, signal } from '../../../giant.js';

const { div, button, h3, svg, path } = html;

export const Accordion = component.Accordion((props, ...children) => {
  /**
   * A container for a collection of accordion items.
   * @param {Object} props - The component properties.
   * @param {'single' | 'multiple'} [props.type='single'] - Determines whether one or multiple items can be opened at the same time.
   * @param {boolean} [props.collapsible=true] - When type is "single", allows closing content when clicking trigger for an open item.
   * @param {string|string[]} [props.value] - The controlled value of the item(s) to expand.
   * @param {string|string[]} [props.defaultValue] - The uncontrolled default value of the item(s) to expand.
   * @param {(value: string | string[]) => void} [props.onValueChange] - Event handler called when the expanded state of an item changes.
   * @param {string} [props.class] - Additional CSS classes.
   * @param {...any} children - The AccordionItem children.
   */
  const {
    type = 'single',
    collapsible = true,
    value,
    defaultValue,
    onValueChange,
    class: customClass = '',
    ...rest
  } = props;

  let initial = value !== undefined ? value : defaultValue;
  if (initial === undefined) initial = [];
  const initialArr = Array.isArray(initial) ? initial : [initial].filter(Boolean);

  const values = signal.values(initialArr);
  const prevValue = signal.prevValue(JSON.stringify(value));

  if (value !== undefined && JSON.stringify(value) !== prevValue.value) {
    values.value = Array.isArray(value) ? value : [value].filter(Boolean);
    prevValue.value = JSON.stringify(value);
  }

  const toggle = (val) => {
    let current = [...values.value];
    const isOpen = current.includes(val);

    if (type === 'single') {
      values.value = isOpen && collapsible ? [] : [val];
    } else {
      values.value = isOpen ? current.filter(v => v !== val) : [...current, val];
    }

    if (typeof onValueChange === 'function') {
      onValueChange(type === 'single' ? values.value[0] : values.value);
    }
  };

  const syncNode = (node, currentItemValue = null) => {
    if (!node) return node;

    if (node.nodeType === 1) {
      let activeValue = currentItemValue;
      const nodeType = node.getAttribute('data-accordion-type');

      if (nodeType === 'item') activeValue = node.getAttribute('data-value');

      const isOpen = activeValue ? values.value.includes(activeValue) : false;
      const dataState = isOpen ? 'open' : 'closed';

      if (nodeType) node.setAttribute('data-state', dataState);

      if (nodeType === 'chevron') {
        node.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
        node.style.transition = 'transform 0.2s ease';
      }

      if (nodeType === 'trigger') {
        if (!node._hasAccordionClick) {
          node._hasAccordionClick = true;
          node.addEventListener('click', () => {
            if (node.disabled) return;
            toggle(activeValue);
          });
        }
      }

      if (nodeType === 'content') {
        node.style.display = isOpen ? '' : 'none';
      }

      Array.from(node.children).forEach(child => syncNode(child, activeValue));
      return node;
    }

    if (node._type) {
      if (node._type === '#dom' && node.node) {
        syncNode(node.node, currentItemValue);
        return node;
      }

      const clone = { ...node, attributes: { ...node.attributes } };
      if (node.children) clone.children = [...node.children];

      let activeValue = currentItemValue;
      const nodeType = clone.attributes['data-accordion-type'];

      if (nodeType === 'item') activeValue = clone.attributes['data-value'];

      const isOpen = activeValue ? values.value.includes(activeValue) : false;
      const dataState = isOpen ? 'open' : 'closed';

      if (nodeType) clone.attributes['data-state'] = dataState;

      if (nodeType === 'chevron') {
        clone.attributes.style = {
          ...clone.attributes.style,
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        };
      }

      if (nodeType === 'trigger') {
        const originalOnClick = clone.attributes.onclick || clone.attributes.onClick;
        clone.attributes.onclick = (e) => {
          if (clone.attributes.disabled) return;
          toggle(activeValue);
          if (typeof originalOnClick === 'function') originalOnClick(e);
        };
      }

      if (nodeType === 'content') {
        clone.attributes.style = {
          ...clone.attributes.style,
          display: isOpen ? '' : 'none'
        };
      }

      if (clone.children) {
        clone.children = clone.children.map(child => syncNode(child, activeValue));
      }

      return clone;
    }

    return node;
  };

  return div(
    {
      ...rest,
      class: [design.size.wFull, customClass]
    },
    ...children.map(child => syncNode(child))
  );
});

export const AccordionItem = component.AccordionItem((props, ...children) => {
  /**
   * An individual item within the accordion.
   * @param {Object} props - The component properties.
   * @param {string} [props.value] - A unique value for the item. Auto-generated if omitted.
   * @param {string} [props.class] - Additional CSS classes.
   * @param {Object} [props.style] - Inline CSS styles.
   * @param {...any} children - The AccordionTrigger and AccordionContent children.
   */
  const {
    value = `item-${Math.random().toString(36).slice(2, 9)}`,
    class: customClass = '',
    style = {},
    ...rest
  } = props;

  return div(
    {
      ...rest,
      'data-accordion-type': 'item',
      'data-value': value,
      class: ['accordion-item', design.border.border, customClass],
      style: { borderBottomWidth: '1px', borderBottomStyle: 'solid', ...style }
    },
    ...children
  );
});

export const AccordionTrigger = component.AccordionTrigger((props, ...children) => {
  /**
   * The button that toggles the accordion item's expanded state.
   * @param {Object} props - The component properties.
   * @param {string} [props.class] - Additional CSS classes.
   * @param {Object} [props.style] - Inline CSS styles.
   * @param {...any} children - The label or content inside the trigger.
   */
  const { class: customClass = '', style = {}, ...rest } = props;

  const ChevronIcon = svg(
    {
      'data-accordion-type': 'chevron',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      style: { width: '1rem', height: '1rem', flexShrink: 0 }
    },
    path({ d: 'm6 9 6 6 6-6' })
  );

  return h3(
    { class: [design.layout.flex, design.size.wFull], style: { margin: 0 } },
    button(
      {
        ...rest,
        type: 'button',
        'data-accordion-type': 'trigger',
        class: [
          design.layout.flex,
          design.layout.itemsCenter,
          design.typography.weightMedium,
          design.animation.transitionAll,
          'hover:underline',
          customClass
        ],
        style: {
          flex: 1,
          justifyContent: 'space-between',
          padding: '1rem 0',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          ...style
        }
      },
      ...children,
      ChevronIcon
    )
  );
});

export const AccordionContent = component.AccordionContent((props, ...children) => {
  /**
   * The content area that is revealed when an accordion item is expanded.
   * @param {Object} props - The component properties.
   * @param {string} [props.class] - Additional CSS classes.
   * @param {Object} [props.style] - Inline CSS styles.
   * @param {...any} children - The HTML content to display inside the accordion panel.
   */
  const { class: customClass = '', style = {}, ...rest } = props;

  return div(
    {
      ...rest,
      'data-accordion-type': 'content',
      class: [design.typography.size1, customClass],
      style: { overflow: 'hidden', ...style }
    },
    div({ style: { paddingBottom: '1rem' } }, ...children)
  );
});
