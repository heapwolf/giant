import { component, html, design, signal } from '../../../giant.js';

const { span, input, svg, path } = html;

// Add 'export' here so index.js can still import it for the docs!
export const CheckboxIndicator = ({ isChecked }) => {
  return span(
    {
      class: [design.layout.flex, design.layout.itemsCenter, design.layout.justifyCenter],
      'data-state': isChecked ? 'checked' : 'unchecked',
      style: {
        opacity: isChecked ? '1' : '0',
        transform: isChecked ? 'scale(1)' : 'scale(0.5)',
        transition: 'opacity 150ms ease, transform 150ms cubic-bezier(0.2, 0, 0.2, 1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%'
      }
    },
    svg(
      {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '4',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        style: { width: '0.65rem', height: '0.65rem' }
      },
      path({ d: 'M20 6 L9 17 L4 12' })
    )
  );
};

export const Checkbox = component.Checkbox((props, ...children) => {
  const {
    checked, defaultChecked = false, onCheckedChange, onChange, onclick, onClick,
    disabled = false, required = false, name, value, id, class: customClass = '', ...rest
  } = props;

  const rootId = signal._checkboxRootId(`checkbox-${Math.random().toString(36).slice(2, 9)}`);
  const isChecked = signal.isChecked(checked !== undefined ? checked : defaultChecked);
  const isDisabled = signal.disabled(disabled);
  const isHovered = signal.isHovered(false);
  const isActive = signal.isActive(false);

  const prevChecked = signal._prevChecked(checked);
  const prevDisabled = signal._prevDisabled(disabled);

  if (checked !== undefined && checked !== prevChecked.value) {
    isChecked.value = checked;
    prevChecked.value = checked;
  }
  if (disabled !== undefined && disabled !== prevDisabled.value) {
    isDisabled.value = disabled;
    prevDisabled.value = disabled;
  }

  const emitCheckedChange = (nextValue, event) => {
    const callback = onChange;
    if (typeof callback === 'function') callback(nextValue, event);
  };

  const setChecked = (nextChecked, event) => {
    if (checked === undefined) {
      isChecked.value = nextChecked;
    }
    emitCheckedChange(nextChecked, event);
  };

  const check = () => { if (checked === undefined) isChecked.value = true; emitCheckedChange(true); };
  const uncheck = () => { if (checked === undefined) isChecked.value = false; emitCheckedChange(false); };

  const toggle = () => {
    const next = !isChecked.value;
    if (checked === undefined) isChecked.value = next;
    emitCheckedChange(next);
  };

  const getValue = () => isChecked.value;
  const enable = () => { isDisabled.value = false; };
  const disable = () => { isDisabled.value = true; };

  const handleRootClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDisabled.value) return;

    setChecked(!isChecked.value, e);
    const clickCallback = onclick || onClick;
    if (typeof clickCallback === 'function') clickCallback(e);
  };

  const handleKeyDown = (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    if (isDisabled.value) return;
    setChecked(!isChecked.value, e);
  };

  const BASE_CLASSES = [
    design.layout.inlineFlex, design.layout.itemsCenter, design.layout.justifyCenter,
    design.shape.radius1, design.shape.border1, design.effect.shadow1,
    design.state.focusVisibleEffectRing, design.effect.outlineOffset2, design.interaction.selectNone
  ];

  const STATE_CLASSES = [
    isChecked.value ? [design.bg.actionBg, design.fg.actionFg, design.border.actionBorder] : [design.bg.bg, design.border.inputBorder],
    isDisabled.value && [design.effect.opacity50, design.interaction.cursorNotAllowed]
  ];

  return [
    // Array API descriptor
    { check, uncheck, toggle, getValue, enable, disable },

    // Parent delegation span
    span(
      {
        ...rest,
        'data-checkbox-root': rootId.value,
        role: 'checkbox',
        tabindex: isDisabled.value ? '-1' : '0',
        'aria-checked': isChecked.value ? 'true' : 'false',
        'aria-disabled': isDisabled.value ? 'true' : undefined,
        'data-state': isChecked.value ? 'checked' : 'unchecked',
        onclick: handleRootClick,
        onkeydown: handleKeyDown,
        onpointerover: () => { if (!isDisabled.value) isHovered.value = true; },
        onpointerout: () => { if (!isDisabled.value) { isHovered.value = false; isActive.value = false; } },
        onpointerdown: (e) => { if (e.button !== 0 && e.pointerType === 'mouse') return; if (!isDisabled.value) isActive.value = true; },
        onpointerup: () => { if (!isDisabled.value) isActive.value = false; },
        class: [
          design.layout.inlineFlex, design.layout.itemsCenter, design.spacing.gap2,
          isDisabled.value ? design.interaction.cursorNotAllowed : design.interaction.cursorPointer,
          customClass
        ],
        style: { position: 'relative', verticalAlign: 'middle', outline: 'none', ...rest.style }
      },
      input({
        id, 'data-checkbox-input': rootId.value, type: 'checkbox', name, value: value || 'on',
        checked: isChecked.value, required, disabled: isDisabled.value, tabindex: '-1', 'aria-hidden': 'true',
        style: { position: 'absolute', width: '1px', height: '1px', margin: '-1px', padding: '0', border: '0', opacity: '0', overflow: 'hidden', clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', whiteSpace: 'nowrap', pointerEvents: 'none' }
      }),
      span(
        {
          'aria-hidden': 'true', class: [BASE_CLASSES, STATE_CLASSES],
          style: {
            borderStyle: 'solid', width: '1rem', height: '1rem', padding: '0', overflow: 'visible', verticalAlign: 'middle', pointerEvents: 'none',
            transform: isActive.value ? 'scale(0.92)' : 'scale(1)',
            boxShadow: (isHovered.value && !isActive.value) ? '0 0 0 4px var(--color-bg-hover)' : 'none',
            transition: 'transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease, border-color 150ms ease'
          }
        },
        CheckboxIndicator({ isChecked: isChecked.value })
      ),
      ...children
    )
  ];
});
