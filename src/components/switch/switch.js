import { component, html, design, signal } from '../../../giant.js';

const { button, span, input, label } = html;

export const Switch = component.Switch((props = {}, ...children) => {
  const {
    checked,
    defaultChecked = false,
    onCheckedChange,
    onChange,
    onclick,
    onClick,
    disabled = false,
    required = false,
    name,
    value,
    id,
    class: customClass = '',
    ...rest
  } = props;

  const isChecked = signal.isChecked(checked !== undefined ? checked : defaultChecked);
  const prevChecked = signal.prevChecked(checked);

  const isDisabled = signal.isDisabled(disabled);
  const prevDisabled = signal.prevDisabled(disabled);

  const isHovered = signal.isHovered(false);
  const isActive = signal.isActive(false);

  if (checked !== undefined && checked !== prevChecked.value) {
    isChecked.value = checked;
    prevChecked.value = checked;
  }

  if (disabled !== undefined && disabled !== prevDisabled.value) {
    isDisabled.value = disabled;
    prevDisabled.value = disabled;
  }

  const emitChange = (nextValue, event) => {
    const callback = onCheckedChange || onChange;
    if (typeof callback === 'function') callback(nextValue, event);
  };

  const setChecked = (nextValue, event) => {
    isChecked.value = nextValue;

    emitChange(nextValue, event);
  };

  const handleInternalClick = e => {
    if (isDisabled.value) {
      e.preventDefault();
      return;
    }

    setChecked(!isChecked.value, e);

    const clickCallback = onclick || onClick;
    if (typeof clickCallback === 'function') {
      clickCallback(e);
    }
  };

  const handlePointerOver = () => {
    if (!isDisabled.value) isHovered.value = true;
  };

  const handlePointerOut = (e) => {
    // Ensure we don't drop the hover state while moving between child elements (like text to button)
    const current = e.currentTarget;
    if (current && e.relatedTarget && current.contains(e.relatedTarget)) return;

    if (!isDisabled.value) {
      isHovered.value = false;
      isActive.value = false;
    }
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (!isDisabled.value) isActive.value = true;
  };

  const handlePointerUp = () => {
    if (!isDisabled.value) isActive.value = false;
  };

  const BASE_CLASSES = [
    design.layout.inlineFlex,
    design.layout.itemsCenter,
    design.layout.relative,
    design.shape.radiusRound,
    design.state.focusVisibleEffectRing,
    design.effect.outlineOffset2,
    design.shape.border0,
    design.interaction.selectNone
  ];

  const STATE_CLASSES = [
    isDisabled.value && [
      design.effect.opacity50,
      design.interaction.cursorNotAllowed
    ]
  ];

  const trackBg = isChecked.value
    ? 'var(--color-fg)'
    : 'var(--color-bg-muted)';

  const thumbScale = isActive.value ? 'scale(0.85)' : 'scale(1)';

  const thumbHalo =
    isHovered.value && !isActive.value
      ? '0 0 0 6px var(--color-bg-hover)'
      : 'var(--effect-shadow-1)';

  const thumbTranslateX = isChecked.value ? '20px' : '0px';

  const switchNode = button(
    {
      ...rest,
      type: 'button',
      role: 'switch',
      id,
      'aria-checked': isChecked.value ? 'true' : 'false',
      'aria-required': required ? 'true' : undefined,
      'data-state': isChecked.value ? 'checked' : 'unchecked',
      disabled: isDisabled.value,
      onpointerover: children.length === 0 ? handlePointerOver : undefined,
      onpointerout: children.length === 0 ? handlePointerOut : undefined,
      onpointerdown: children.length === 0 ? handlePointerDown : undefined,
      onpointerup: children.length === 0 ? handlePointerUp : undefined,
      class: [BASE_CLASSES, STATE_CLASSES, customClass],
      style: {
        width: '44px',
        height: '24px',
        padding: '2px',
        backgroundColor: trackBg,
        cursor: isDisabled.value ? 'not-allowed' : 'pointer',
        transition: 'background-color var(--animation-duration-fast) var(--animation-ease-standard)'
      }
    },
    span({
      class: [design.layout.block, design.shape.radiusRound],
      style: {
        width: '20px',
        height: '20px',
        border: '2px solid var(--color-fg)',
        backgroundColor: 'var(--color-bg)',
        boxShadow: thumbHalo,
        transform: `translateX(${thumbTranslateX}) ${thumbScale}`,
        transition: 'transform var(--animation-duration-fast) cubic-bezier(0.2, 0, 0.2, 1), box-shadow var(--animation-duration-fast) var(--animation-ease-standard)'
      }
    }),
    name &&
      input({
        type: 'checkbox',
        name,
        value: value || 'on',
        checked: isChecked.value,
        style: { display: 'none' },
        'aria-hidden': 'true',
        tabindex: '-1'
      })
  );

  return [
    setChecked,
    {
      class: [
        design.layout.inlineFlex,
        design.layout.itemsCenter,
        design.spacing.gap2,
        design.interaction.selectNone,
        isDisabled.value ? design.interaction.cursorNotAllowed : design.interaction.cursorPointer
      ],
      onclick: handleInternalClick,
      onpointerover: handlePointerOver,
      onpointerout: handlePointerOut,
      onpointerdown: handlePointerDown,
      onpointerup: handlePointerUp
    },
    switchNode,
    ...children
  ];
});
