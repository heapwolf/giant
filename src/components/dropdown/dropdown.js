import { component, html, design, signal } from '../../../giant.js';

const { div, button, ul, li, span, input, svg, path } = html;

/**
 * Extracts plain text from either a VNode tree or a Real DOM Node.
 * @param {Object|string|number|Node} node
 * @returns {string}
 */
const getNodeText = (node) => {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);

  if (node.nodeType === 1 || node.nodeType === 3) {
    return node.textContent || '';
  }

  if (node._type === '#text') {
    return node.attributes?.text || '';
  }

  if (node.children) {
    const childrenArray = Array.isArray(node.children) ? node.children : Array.from(node.children);
    return childrenArray.map(getNodeText).join('');
  }

  return '';
};

// =========================================================
// DROPDOWN ROOT (Stateful Component)
// =========================================================

export const Dropdown = component.Dropdown((props, ...children) => {
  const {
    value,
    defaultValue,
    multiple = false,
    onValueChange,
    disabled = false,
    name,
    id,
    placeholder = 'Select...',
    class: className = '',
    style = {},
    ...rest
  } = props;

  const componentId = signal.id(id || `dropdown-${Math.random().toString(36).slice(2, 9)}`);
  const isOpen = signal.isOpen(false);

  const initVal = value !== undefined ? value : defaultValue;
  const initialSelected = multiple
    ? (Array.isArray(initVal) ? initVal : (initVal ? [initVal] : []))
    : (initVal || '');

  const selectedValue = signal.selectedValue(initialSelected);
  const prevValueProp = signal._prevValueProp(value);

  if (value !== undefined && value !== prevValueProp.value) {
    selectedValue.value = multiple
      ? (Array.isArray(value) ? value : (value ? [value] : []))
      : value;
    prevValueProp.value = value;
  }

  const open = () => { if (!disabled) isOpen.value = true; };
  const close = () => { isOpen.value = false; };
  const toggle = () => { if (!disabled) isOpen.value = !isOpen.value; };
  const getValue = () => selectedValue.value;
  const setValue = (nextValue) => {
    selectedValue.value = multiple
      ? (Array.isArray(nextValue) ? nextValue : (nextValue ? [nextValue] : []))
      : nextValue;
  };

  const handleRootClick = (e) => {
    const option = e.target.closest('[role="option"]');

    if (option) {
      const isDisabled = option.getAttribute('data-disabled') === 'true';
      if (isDisabled) return;

      const itemValue = option.getAttribute('data-value');

      if (multiple) {
        const current = Array.isArray(selectedValue.value) ? [...selectedValue.value] : [];
        const index = current.indexOf(String(itemValue));

        if (index > -1) {
          current.splice(index, 1);
        } else {
          current.push(String(itemValue));
        }
        selectedValue.value = current;
      } else {
        selectedValue.value = itemValue;
        isOpen.value = false;
      }

      if (typeof onValueChange === 'function') {
        onValueChange(selectedValue.value, e);
      }
    }
  };

  const dropdownItemChildren = children.filter(Boolean);

  const findSelectedText = (nodes) => {
    let foundTexts = [];

    const traverse = (n) => {
      const nodeList = Array.isArray(n) ? n : Array.from(n || []);

      for (const node of nodeList) {
        if (!node || typeof node !== 'object') continue;

        let val;
        if (node.nodeType === 1) {
          val = node.getAttribute('data-value');
        } else if (node.attributes) {
          val = node.attributes['data-value'] ?? node.attributes.value;
        }

        if (val !== undefined && val !== null) {
          const isSelected = multiple
            ? Array.isArray(selectedValue.value) && selectedValue.value.includes(String(val))
            : String(val) === String(selectedValue.value);

          if (isSelected) {
            foundTexts.push(getNodeText(node).trim());
          }
        }

        if (val === undefined || val === null) {
          if (node.nodeType === 1 && node.children) {
            traverse(node.children);
          } else if (node.children) {
            traverse(node.children);
          }
        }
      }
    };

    traverse(nodes);
    return foundTexts.join(', ');
  };

  const selectedText = findSelectedText(dropdownItemChildren);

  if (isOpen.value) {
    queueMicrotask(() => {
      const trigger = document.getElementById(`${componentId.value}-trigger`);
      const content = document.getElementById(`${componentId.value}-content`);
      if (!trigger || !content) return;

      let targetItem = null;
      const options = content.querySelectorAll('[role="option"]');

      options.forEach(opt => {
        const val = opt.getAttribute('data-value');
        const isSelected = multiple
          ? Array.isArray(selectedValue.value) && selectedValue.value.includes(String(val))
          : String(val) === String(selectedValue.value);

        opt.setAttribute('data-state', isSelected ? 'checked' : 'unchecked');
        opt.setAttribute('aria-selected', isSelected ? 'true' : 'false');

        const indicator = opt.querySelector('[data-select-indicator="true"]');
        if (indicator) {
          indicator.style.opacity = isSelected ? '1' : '0';
          indicator.style.transform = isSelected ? 'scale(1)' : 'scale(0.8)';
        }

        if (isSelected && !targetItem) targetItem = opt;
      });

      if (props.position !== 'popper') { // <--- ADD THIS GUARD
        if (!targetItem && options.length) targetItem = options[0];

        if (targetItem) {
          const offset = targetItem.offsetTop;
          const triggerHeight = trigger.offsetHeight;
          const itemHeight = targetItem.offsetHeight;
          const shift = -offset + (triggerHeight - itemHeight) / 2;

          content.style.top = `${shift}px`;
        }
      }
    });
  }

  const hiddenInputs = name
    ? (multiple && Array.isArray(selectedValue.value)
        ? selectedValue.value.map(v => input({ type: 'hidden', name, value: v }))
        : [input({ type: 'hidden', name, value: selectedValue.value })])
    : [];

  return [
    open, close, toggle, getValue, setValue,

    div(
      {
        ...rest,
        id: componentId.value,
        onclick: handleRootClick,
        class: [
          design.layout.relative,
          design.layout.inlineBlock,
          design.interaction.selectNone,
          className
        ],
        style: {
          width: '240px',
          ...style
        }
      },
      Dropdown.Trigger(
        {
          id: `${componentId.value}-trigger`,
          disabled,
          open: isOpen.value,
          onclick: toggle
        },
        Dropdown.Value({
          value: selectedText || (multiple && selectedValue.value?.length ? `${selectedValue.value.length} selected` : selectedValue.value),
          placeholder
        }),
        Dropdown.Icon({ open: isOpen.value })
      ),
      isOpen.value
        ? Dropdown.Content(
            {
              id: `${componentId.value}-content`,
              'aria-labelledby': `${componentId.value}-trigger`
            },
            ...dropdownItemChildren
          )
        : null,
      ...hiddenInputs
    )
  ];
});

// =========================================================
// DROPDOWN PRIMITIVES (Pure Functions)
// =========================================================

Dropdown.Trigger = (...args) => {
  const { attributes, children } = button(...args);
  const { disabled = false, open = false, class: className = '', style = {}, ...rest } = attributes;

  return button(
    {
      ...rest,
      type: 'button',
      role: 'combobox',
      'aria-expanded': open ? 'true' : 'false',
      'aria-haspopup': 'listbox',
      disabled,
      class: [
        design.bg.bg,
        design.shape.border1,
        design.border.inputBorder,
        design.effect.shadow1,
        design.shape.radius1,
        design.typography.lineTight,
        design.animation.transitionColors,
        design.state.focusVisibleEffectRing,
        design.effect.outlineOffset2,
        disabled ? [design.effect.opacity50, design.interaction.cursorNotAllowed] : design.interaction.cursorPointer,
        className
      ],
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        minHeight: '2.5rem',
        padding: '0.5rem 0.75rem',
        borderStyle: 'solid',
        outline: 'none',
        ...style
      }
    },
    ...children
  );
};

Dropdown.Value = (...args) => {
  const { attributes, children } = span(...args);
  const { value, placeholder = 'Select...', class: className = '', style = {}, ...rest } = attributes;

  return span(
    {
      ...rest,
      class: [
        value ? '' : design.fg.fgMuted,
        className
      ],
      style: {
        flex: '1 1 auto',
        textAlign: 'left',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        ...style
      }
    },
    value || placeholder
  );
};

Dropdown.Icon = (...args) => {
  const { attributes } = svg(...args);
  const { open = false, class: className = '', style = {}, ...rest } = attributes;

  return svg(
    {
      ...rest,
      'aria-hidden': 'true',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      class: [design.fg.fgMuted, className],
      style: {
        width: '1rem',
        height: '1rem',
        opacity: '0.5',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        ...style
      }
    },
    path({ d: 'm6 9 6 6 6-6' })
  );
};

Dropdown.Content = (...args) => {
  const { attributes, children } = div(...args);
  const { class: className = '', style = {}, ...rest } = attributes;

  return div(
    {
      ...rest,
      role: 'listbox',
      class: [
        design.layout.absolute,
        design.layout.zOverlay,
        design.bg.surface,
        design.shape.radius2,
        className
      ],
      style: {
        boxSizing: 'border-box',
        top: 'calc(100% + 0.25rem)',
        left: 0,
        width: '100%',
        minWidth: '8rem',
        maxHeight: '24rem',
        overflow: 'hidden',
        border: '1px solid var(--color-border-muted)',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        backgroundColor: 'var(--color-surface)',
        color: 'var(--color-fg)',
        animation: 'fade-in 150ms cubic-bezier(0.4, 0, 0.2, 1)',
        ...style
      }
    },
    ul(
      {
        role: 'presentation',
        style: {
          listStyle: 'none',
          margin: 0,
          padding: '0.25rem'
        }
      },
      ...children.filter(Boolean)
    )
  );
};

Dropdown.Item = (...args) => {
  const { attributes, children } = li(...args);
  const { value, disabled = false, class: className = '', style = {}, ...rest } = attributes;

  return li(
    {
      ...rest,
      role: 'option',
      'data-value': value,
      'data-disabled': disabled ? 'true' : 'false',
      class: [
        design.layout.relative,
        design.layout.flex,
        design.layout.itemsCenter,
        design.shape.radius1,
        design.typography.size1,
        design.interaction.selectNone,
        disabled ? design.effect.opacity50 : design.interaction.cursorPointer,
        className
      ],
      style: {
        padding: '0.375rem 0.5rem 0.375rem 2rem',
        outline: 'none',
        cursor: disabled ? 'not-allowed' : 'default',
        transform: 'scale(1)',
        transition: 'background-color var(--animation-duration-fast) var(--animation-ease-standard), color var(--animation-duration-fast) var(--animation-ease-standard), transform var(--animation-duration-fast) cubic-bezier(0.2, 0, 0.2, 1)',
        ...style
      },
      onpointerover: (e) => {
        if (disabled) return;
        const el = e.target.closest('[role="option"]');
        if (el) {
          el.style.backgroundColor = 'var(--color-bg-hover)';
          el.style.color = 'var(--color-fg-hover)';
        }
      },
      onpointerout: (e) => {
        if (disabled) return;
        const el = e.target.closest('[role="option"]');
        if (el) {
          el.style.backgroundColor = 'transparent';
          el.style.color = '';
          el.style.transform = 'scale(1)';
        }
      },
      onpointerdown: (e) => {
        if (disabled || (e.button !== 0 && e.pointerType === 'mouse')) return;
        const el = e.target.closest('[role="option"]');
        if (el) el.style.transform = 'scale(0.98)';
      },
      onpointerup: (e) => {
        if (disabled) return;
        const el = e.target.closest('[role="option"]');
        if (el) el.style.transform = 'scale(1)';
      }
    },
    span(
      {
        'data-select-indicator': 'true',
        style: {
          position: 'absolute',
          left: '0.5rem',
          width: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: '0',
          transform: 'scale(0.8)',
          transition: 'opacity 0.15s ease, transform 0.15s ease'
        }
      },
      svg(
        {
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '2',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          style: { width: '1rem', height: '1rem' }
        },
        path({ d: 'M20 6 9 17l-5-5' })
      )
    ),
    Dropdown.ItemText({}, ...children)
  );
};

Dropdown.ItemText = (...args) => {
  const { attributes, children } = span(...args);
  const { class: className = '', ...rest } = attributes;
  return span({ ...rest, class: className }, ...children);
};

Dropdown.Separator = (...args) => {
  const { attributes } = div(...args);
  const { class: className = '', style = {}, ...rest } = attributes;

  return div({
    ...rest,
    role: 'separator',
    'aria-orientation': 'horizontal',
    class: className,
    style: {
      height: '1px',
      margin: '0.25rem -0.25rem',
      backgroundColor: 'var(--color-border-muted)',
      ...style
    }
  });
};

Dropdown.Label = (...args) => {
  const { attributes, children } = div(...args);
  const { class: className = '', style = {}, ...rest } = attributes;

  return div(
    {
      ...rest,
      class: [
        design.typography.size1,
        design.fg.fgMuted,
        className
      ],
      style: {
        padding: '0.375rem 1rem 0.375rem 2rem',
        fontWeight: 600,
        ...style
      }
    },
    ...children
  );
};

Dropdown.Group = (...args) => {
  const { attributes, children } = div(...args);
  const { class: className = '', ...rest } = attributes;
  return div({ ...rest, role: 'group', class: className }, ...children);
};

Dropdown.ItemIndicator = (...args) => {
  const { attributes, children } = span(...args);
  const { class: className = '', style = {}, ...rest } = attributes;

  return span(
    {
      ...rest,
      'data-select-indicator': 'true',
      class: className,
      style: {
        position: 'absolute',
        left: '0.5rem',
        width: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: '0',
        transform: 'scale(0.8)',
        transition: 'opacity 0.15s ease, transform 0.15s ease',
        ...style
      }
    },
    ...children
  );
};
