import { component, html, design } from '../../../giant.js';

const { div, input } = html;

export const Radio = component.Radio((props, ...children) => {
  const {
    value,
    defaultValue,
    name = `radio-group-${Math.random().toString(36).slice(2, 9)}`,
    onValueChange,
    class: customClass = '',
    ...rest
  } = props;

  const currentValue = value !== undefined ? value : defaultValue;

  const syncNode = (node, currentItemValue = null) => {
    if (!node) return node;

    // --- 1. PHYSICAL DOM TRAVERSAL ---
    if (node.nodeType === 1) {
      let activeValue = currentItemValue;
      if (node.getAttribute('data-radio-type') === 'item') {
        activeValue = node.getAttribute('data-value');
      }

      if (activeValue !== null) {
        const isChecked = activeValue === currentValue;

        if (node.getAttribute('data-radio-target') === 'input') {
          node.setAttribute('name', name);
          node.checked = isChecked;

          node._radioOnValueChange = onValueChange;
          node._radioActiveValue = activeValue;

          if (!node._hasRadioGroupChange) {
            node._hasRadioGroupChange = true;
            node.addEventListener('change', (e) => {
              if (node.disabled) return;
              if (typeof node._radioOnValueChange === 'function') {
                node._radioOnValueChange(node._radioActiveValue);
              }
            });
          }
        }

        if (node.getAttribute('data-radio-target') === 'circle') {
          node.style.borderColor = isChecked ? 'var(--color-action-bg)' : 'var(--color-input-border)';
        }

        if (node.getAttribute('data-radio-target') === 'dot') {
          node.style.opacity = isChecked ? '1' : '0';
          node.style.transform = isChecked ? 'scale(1)' : 'scale(0.5)';
        }
      }

      Array.from(node.children).forEach(child => syncNode(child, activeValue));
      return node;
    }

    // --- 2. VIRTUAL DOM TRAVERSAL ---
    if (node._type) {
      if (node._type === '#dom' && node.node) {
        syncNode(node.node, currentItemValue);
        return node;
      }

      const clone = { ...node, attributes: { ...node.attributes } };
      if (node.children) clone.children = [...node.children];

      let activeValue = currentItemValue;
      if (clone.attributes['data-radio-type'] === 'item') {
        activeValue = clone.attributes['data-value'];
      }

      if (activeValue !== null) {
        const isChecked = activeValue === currentValue;

        if (clone.attributes['data-radio-target'] === 'input') {
          clone.attributes.name = name;
          clone.attributes.checked = isChecked;

          const originalOnChange = clone.attributes.onchange || clone.attributes.onChange;
          clone.attributes.onchange = (e) => {
            if (clone.attributes.disabled) return;
            if (typeof onValueChange === 'function') onValueChange(activeValue);
            if (typeof originalOnChange === 'function') originalOnChange(e);
          };
        }

        if (clone.attributes['data-radio-target'] === 'circle') {
          clone.attributes.style = {
            ...clone.attributes.style,
            borderColor: isChecked ? 'var(--color-action-bg)' : 'var(--color-input-border)'
          };
        }

        if (clone.attributes['data-radio-target'] === 'dot') {
          clone.attributes.style = {
            ...clone.attributes.style,
            opacity: isChecked ? '1' : '0',
            transform: isChecked ? 'scale(1)' : 'scale(0.5)'
          };
        }
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
      role: 'radiogroup',
      class: [design.layout.stack, design.spacing.gap2, customClass],
      ...rest
    },
    ...children.map(child => syncNode(child))
  );
});

export const RadioItem = component.RadioItem((props, ...children) => {
  const {
    value,
    disabled = false,
    class: customClass = '',
    ...rest
  } = props;

  const getCircle = (e) => {
    let target = e.target;
    if (target && target.nodeType === 3) target = target.parentNode;
    const itemEl = target?.closest ? target.closest('[data-radio-type="item"]') : null;
    return itemEl ? itemEl.querySelector('[data-radio-target="circle"]') : null;
  };

  const handlePointerOver = (e) => {
    if (disabled) return;
    const circle = getCircle(e);
    if (circle && circle.dataset.active !== 'true') {
      circle.style.boxShadow = '0 0 0 4px var(--color-bg-hover)';
    }
  };

  const handlePointerOut = (e) => {
    if (disabled) return;
    const circle = getCircle(e);
    if (circle) {
      circle.style.boxShadow = 'none';
      circle.style.transform = 'scale(1)';
      circle.dataset.active = 'false';
    }
  };

  const handlePointerDown = (e) => {
    if (disabled || (e.button !== 0 && e.pointerType === 'mouse')) return;
    const circle = getCircle(e);
    if (circle) {
      circle.style.transform = 'scale(0.92)';
      circle.style.boxShadow = 'none';
      circle.dataset.active = 'true';
    }
  };

  const handlePointerUp = (e) => {
    if (disabled) return;
    const circle = getCircle(e);
    if (circle) {
      circle.style.transform = 'scale(1)';
      circle.style.boxShadow = '0 0 0 4px var(--color-bg-hover)';
      circle.dataset.active = 'false';
    }
  };

  return div(
    {
      'data-radio-type': 'item',
      'data-value': value,
      class: [
        design.layout.inlineFlex,
        design.layout.itemsCenter,
        design.spacing.gap2,
        'focus-within:effect-ring',
        disabled ? design.interaction.cursorNotAllowed : design.interaction.cursorPointer,
        disabled ? design.effect.opacity50 : '',
        customClass
      ],
      style: { position: 'relative' },
      onpointerover: handlePointerOver,
      onpointerout: handlePointerOut,
      onpointerdown: handlePointerDown,
      onpointerup: handlePointerUp,
      ...rest
    },
    // Visual Outer Circle
    div(
      {
        'data-radio-target': 'circle',
        'data-active': 'false',
        class: [design.shape.radiusRound],
        style: {
          boxSizing: 'border-box',
          width: '1.25rem', // 20px
          height: '1.25rem', // 20px
          border: '2px solid var(--color-input-border)',
          backgroundColor: 'var(--color-bg)',
          display: 'grid', // Grid prevents flexbox rounding quirks
          placeItems: 'center',
          flexShrink: '0',
          transition: 'all var(--animation-duration-fast) var(--animation-ease-standard)'
        }
      },
      // Visual Inner Dot
      div({
        'data-radio-target': 'dot',
        class: [design.shape.radiusRound],
        style: {
          boxSizing: 'border-box',
          width: '0.625rem', // Exactly 10px (leaves 3px perfectly on all sides)
          height: '0.625rem', // Exactly 10px
          backgroundColor: 'var(--color-action-bg)',
          opacity: '0',
          transform: 'scale(0.5)',
          transition: 'opacity var(--animation-duration-fast) var(--animation-ease-standard), transform var(--animation-duration-fast) cubic-bezier(0.2, 0, 0.2, 1)',
        }
      })
    ),
    // Invisible Native Input
    input({
      'data-radio-target': 'input',
      type: 'radio',
      value,
      disabled,
      tabindex: disabled ? '-1' : '0',
      style: {
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        opacity: 0, margin: 0, cursor: disabled ? 'not-allowed' : 'pointer',
        zIndex: 10
      }
    }),

    // Wrapped content
    div(
      { class: [design.typography.size1, design.typography.weightMedium] },
      ...children
    )
  );
});

