import { component, html, design, signal } from '../../../giant.js';

const { div, button } = html;

export const Tabs = component.Tabs((props, ...children) => {
  /**
   * @function Tabs
   * @description Stateful tabs root component with controlled/uncontrolled support.
   *
   * @param {Object} props
   * @param {string} [props.value] - Controlled active tab value.
   * @param {string} [props.defaultValue] - Initial uncontrolled active tab value.
   * @param {(value: string) => void} [props.onValueChange] - Callback fired when active tab changes.
   * @param {string} [props.class] - Additional CSS classes.
   * @param {'horizontal'|'vertical'} [props.orientation='horizontal'] - Tab layout orientation.
   * @param {'pill'|string} [props.variant='pill'] - Visual style variant.
   * @param {...any} children - Tab list and content nodes.
   */
  const {
    value,
    defaultValue,
    onValueChange,
    class: customClass = '',
    orientation = 'horizontal',
    variant = 'pill',
    ...rest
  } = props;

  // --- 1. STATE INITIALIZATION (Replaces this.state) ---
  const activeTab = signal.activeTab(value !== undefined ? value : defaultValue);
  const prevValue = signal._prevValue(value);

  // --- 2. SYNC CONTROLLED STATE ---
  if (value !== undefined && value !== prevValue.value) {
    activeTab.value = value;
    prevValue.value = value;
  }

  const tabValues = [];

  // --- 3. API METHODS ---
  const getTab = () => activeTab.value;

  const setTab = (val) => {
    activeTab.value = val;
    if (typeof onValueChange === 'function') onValueChange(val);
  };

  const nextTab = () => {
    const idx = tabValues.indexOf(activeTab.value);
    if (idx > -1 && idx < tabValues.length - 1) {
      setTab(tabValues[idx + 1]);
    } else if (tabValues.length) {
      setTab(tabValues[0]);
    }
  };

  const prevTab = () => {
    const idx = tabValues.indexOf(activeTab.value);
    if (idx > 0) {
      setTab(tabValues[idx - 1]);
    } else if (tabValues.length) {
      setTab(tabValues[tabValues.length - 1]);
    }
  };

  /**
   * @function syncNode
   * @description Recursively injects active tab state into tab list, triggers, and content.
   * Handles both Real DOM elements (Client) and VNodes (Server/Fallback).
   */
  const syncNode = (node) => {
    if (!node) return node;

    // --- CLIENT SIDE: Synchronize Real DOM Nodes ---
    if (node.nodeType === 1) {
      if (node.getAttribute('role') === 'tablist') {
        const flexDir = orientation === 'vertical' ? 'column' : 'row';
        node.style.flexDirection = flexDir;
      }

      if (node.getAttribute('data-tab-type') === 'trigger') {
        const val = node.getAttribute('data-value');
        if (!tabValues.includes(val)) tabValues.push(val);

        const isActive = activeTab.value === val;

        node.setAttribute('data-state', isActive ? 'active' : 'inactive');
        node.setAttribute('aria-selected', isActive ? 'true' : 'false');
        node.setAttribute('tabindex', isActive ? '0' : '-1');

        node.style.color = isActive ? 'var(--color-fg)' : 'var(--color-fg-muted)';

        if (variant === 'pill') {
          node.style.backgroundColor = isActive ? 'var(--color-bg)' : 'transparent';
          node.style.boxShadow = isActive ? 'var(--effect-shadow-1)' : 'none';
        }

        if (!node._hasTabClick) {
          node._hasTabClick = true;
          node.addEventListener('click', (e) => {
            if (node.disabled) return;
            setTab(val);
          });
        }
      }

      if (node.getAttribute('data-tab-type') === 'content') {
        const val = node.getAttribute('data-value');
        const isActive = activeTab.value === val;

        node.setAttribute('data-state', isActive ? 'active' : 'inactive');
        node.setAttribute('tabindex', isActive ? '0' : '-1');
        node.style.display = isActive ? '' : 'none';
      }

      Array.from(node.children).forEach(child => syncNode(child));
      return node;
    }

    // --- SERVER SIDE: Synchronize Virtual DOM Nodes ---
    if (node._type) {
      if (node._type === '#dom' && node.node) {
        syncNode(node.node);
        return node;
      }

      const clone = { ...node, attributes: { ...node.attributes } };
      if (node.children) clone.children = [...node.children];

      if (clone.attributes.role === 'tablist') {
        const flexDir = orientation === 'vertical' ? 'column' : 'row';
        clone.attributes.style = { ...clone.attributes.style, flexDirection: flexDir };
      }

      if (clone.attributes['data-tab-type'] === 'trigger') {
        const val = clone.attributes['data-value'];
        if (!tabValues.includes(val)) tabValues.push(val);

        const isActive = activeTab.value === val;

        clone.attributes['data-state'] = isActive ? 'active' : 'inactive';
        clone.attributes['aria-selected'] = isActive ? 'true' : 'false';
        clone.attributes.tabindex = isActive ? 0 : -1;

        clone.attributes.style = {
          ...clone.attributes.style,
          color: isActive ? 'var(--color-fg)' : 'var(--color-fg-muted)'
        };

        if (variant === 'pill') {
          clone.attributes.style.backgroundColor = isActive ? 'var(--color-bg)' : 'transparent';
          clone.attributes.style.boxShadow = isActive ? 'var(--effect-shadow-1)' : 'none';
        }

        const originalOnClick = clone.attributes.onclick || clone.attributes.onClick;
        clone.attributes.onclick = (e) => {
          if (clone.attributes.disabled) return;
          setTab(val);
          if (typeof originalOnClick === 'function') originalOnClick(e);
        };
      }

      if (clone.attributes['data-tab-type'] === 'content') {
        const val = clone.attributes['data-value'];
        const isActive = activeTab.value === val;

        clone.attributes['data-state'] = isActive ? 'active' : 'inactive';
        clone.attributes.tabindex = isActive ? 0 : -1;

        clone.attributes.style = {
          ...clone.attributes.style,
          display: isActive ? '' : 'none'
        };
      }

      if (clone.children) {
        clone.children = clone.children.map(child => syncNode(child));
      }

      return clone;
    }

    return node;
  };

  return [
    // --- 4. HOST DESCRIPTOR PATTERN ---
    // Safely binds the API methods directly to the root element for external use
    { setTab, getTab, nextTab, prevTab },

    // --- 5. ROOT DOM ---
    div(
      {
        ...rest,
        class: [design.layout.flex, customClass],
        style: {
          flexDirection: orientation === 'vertical' ? 'row' : 'column',
          gap: orientation === 'vertical' ? '1rem' : '0',
          ...rest.style
        },
        'data-orientation': orientation
      },
      ...children.map(child => syncNode(child))
    )
  ];
});

export const TabsList = component.TabsList((props, ...children) => {
  const { class: customClass = '', style = {}, ...rest } = props;

  return div(
    {
      ...rest,
      role: 'tablist',
      class: [
        design.layout.inlineFlex,
        design.layout.itemsCenter,
        design.layout.justifyCenter,
        design.bg.bgMuted,
        design.shape.radius2,
        customClass
      ],
      style: {
        padding: '0.25rem',
        minHeight: '2.5rem',
        ...style
      }
    },
    ...children
  );
});

export const TabsTrigger = component.TabsTrigger((props, ...children) => {
  const { value, class: customClass = '', disabled, style = {}, ...rest } = props;

  return button(
    {
      ...rest,
      type: 'button',
      role: 'tab',
      'data-tab-type': 'trigger',
      'data-value': value,
      disabled,
      class: [
        design.layout.inlineFlex,
        design.layout.itemsCenter,
        design.layout.justifyCenter,
        design.typography.size1,
        design.typography.weightMedium,
        design.shape.radius1,
        design.animation.transitionAll,
        design.interaction.selectNone,
        disabled ? [design.effect.opacity50, design.interaction.cursorNotAllowed] : design.interaction.cursorPointer,
        design.state.focusVisibleEffectRing,
        customClass
      ],
      style: {
        padding: '0.25rem 0.75rem',
        border: 'none',
        backgroundColor: 'transparent',
        flex: '1 1 auto',
        ...style
      }
    },
    ...children
  );
});

export const TabsContent = component.TabsContent((props, ...children) => {
  const { value, class: customClass = '', style = {}, ...rest } = props;

  return div(
    {
      ...rest,
      role: 'tabpanel',
      'data-tab-type': 'content',
      'data-value': value,
      class: [
        design.spacing.mt2,
        design.state.focusVisibleEffectRing,
        design.effect.outlineOffset2,
        customClass
      ],
      style
    },
    ...children
  );
});
