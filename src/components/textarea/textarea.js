import { component, html, design, signal } from '../../../giant.js';

const { textarea } = html;

export const Textarea = component.Textarea((props) => {
  const {
    value = '',
    disabled = false,
    invalid = false,
    required = false,
    id,
    class: customClass = '',
    style = {},
    oninput,
    onInput,
    ...rest
  } = props;

  // --- 1. Signals Setup & Prop Sync ---
  const textValue = signal.textValue(value !== undefined ? String(value) : '');
  const prevValue = signal.prevValue(value);

  const isDisabled = signal.isDisabled(!!disabled);
  const prevDisabled = signal.prevDisabled(disabled);

  const isInvalid = signal.isInvalid(!!invalid);
  const prevInvalid = signal.prevInvalid(invalid);

  // --- Physics & Focus State ---
  const isHovered = signal.isHovered(false);
  const isActive = signal.isActive(false);
  const isFocused = signal.isFocused(false);

  // Sync props to state if they change from the outside
  if (value !== undefined && String(value) !== String(prevValue.value)) {
    textValue.value = String(value);
    prevValue.value = value;
  }

  if (disabled !== undefined && !!disabled !== prevDisabled.value) {
    isDisabled.value = !!disabled;
    prevDisabled.value = disabled;
  }

  if (invalid !== undefined && !!invalid !== prevInvalid.value) {
    isInvalid.value = !!invalid;
    prevInvalid.value = invalid;
  }

  const handleInput = (e) => {
    if (isDisabled.value) return e.preventDefault();

    const target = e.target;
    const start = target.selectionStart;
    const end = target.selectionEnd;

    textValue.value = target.value;
    (oninput || onInput)?.(textValue.value, e);

    queueMicrotask(() => {
      if (document.activeElement === target) {
        target.setSelectionRange(start, end);
      }
    });
  };

  // --- Physics Event Handlers ---
  const handlePointerOver = () => {
    if (!isDisabled.value) isHovered.value = true;
  };

  const handlePointerOut = () => {
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

  const handleFocus = () => {
    if (!isDisabled.value) isFocused.value = true;
  };

  const handleBlur = () => {
    if (!isDisabled.value) isFocused.value = false;
  };

  const BASE_CLASSES = [
    design.layout.flex,
    design.size.wFull,
    design.shape.radius1,
    design.shape.border1,
    design.bg.inputBg,
    design.fg.inputFg,
    design.typography.size1,
    design.typography.lineNormal,
    design.animation.transitionColors,
    'placeholder:text-muted-foreground',
    'resize-y'
  ];

  const STATE_CLASSES = [
    isInvalid.value ? design.border.dangerBorder : design.border.inputBorder,
    isDisabled.value ? [design.effect.opacity50, design.interaction.cursorNotAllowed] : '',
    design.state.focusVisibleEffectRing,
    design.effect.outlineOffset2
  ];

  // --- Physics Math ---
  const currentScale = isActive.value ? 'scale(1)' : 'scale(1)';

  // Suppress the hover halo if the element is actively focused.
  const currentHalo = isHovered.value && !isActive.value && !isFocused.value
    ? '0 0 0 4px var(--color-bg-hover)'
    : '';

  const textareaNode = textarea({
    ...rest,
    id,
    value: textValue.value,
    disabled: isDisabled.value,
    required,
    'aria-invalid': isInvalid.value ? 'true' : 'false',
    'aria-disabled': isDisabled.value ? 'true' : undefined,
    'aria-required': required ? 'true' : undefined,

    // Bind all handlers
    onpointerover: handlePointerOver,
    onpointerout: handlePointerOut,
    onpointerdown: handlePointerDown,
    onpointerup: handlePointerUp,
    onfocus: handleFocus,
    onblur: handleBlur,
    oninput: handleInput,

    class: [BASE_CLASSES, STATE_CLASSES, customClass],
    style: {
      minHeight: '80px',
      padding: '0.5rem 0.75rem',
      borderStyle: 'solid',
      backgroundColor: 'var(--color-input-bg)',
      transform: currentScale,
      boxShadow: currentHalo,
      transition: 'transform var(--animation-duration-fast) var(--animation-ease-standard), box-shadow var(--animation-duration-fast) var(--animation-ease-standard)',
      ...style
    }
  });

  // Attach imperative methods to the host <ui-textarea> element and render the child
  return [
    {
      getValue: () => textValue.value,
      setValue: (val) => { textValue.value = String(val); },
      clear: () => { textValue.value = ''; }
    },
    textareaNode
  ];
});
