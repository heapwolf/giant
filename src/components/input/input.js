import { component, html, design, signal } from '../../../giant.js';

const { input, div } = html;

const SIZES = {
  sm: [design.typography.size0, design.spacing.px3, design.spacing.py1, 'h-9'],
  md: [design.typography.size1, design.spacing.px3, design.spacing.py2, 'h-10'],
  lg: [design.typography.size2, design.spacing.px4, design.spacing.py3, 'h-11'],
};

const VARIANTS = {
  default: [
    design.bg.inputBg,
    design.fg.inputFg,
    design.shape.border1,
    design.border.inputBorder,
    design.effect.shadow1,
  ],
  ghost: [
    'bg-transparent',
    design.shape.border0,
    design.effect.shadow0,
  ]
};

export const Input = component.Input((props, ...children) => {
  const {
    type = 'text',
    value = '',
    variant = 'default',
    size = 'md',
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

  // --- State Signals ---
  const valueSignal = signal.value(value !== undefined ? String(value) : '');
  const prevValue = signal._prevValue(value);

  const disabledSignal = signal.disabled(!!disabled);
  const prevDisabled = signal._prevDisabled(disabled);

  const invalidSignal = signal.invalid(!!invalid);
  const prevInvalid = signal._prevInvalid(invalid);

  // --- Physics & Focus Signals ---
  const isHovered = signal.isHovered(false);
  const isActive = signal.isActive(false);
  const isFocused = signal.isFocused(false);

  // Sync props to internal signals when controlled externally
  if (value !== undefined && String(value) !== prevValue.value) {
    valueSignal.value = String(value);
    prevValue.value = String(value);
  }
  if (disabled !== undefined && !!disabled !== prevDisabled.value) {
    disabledSignal.value = !!disabled;
    prevDisabled.value = !!disabled;
  }
  if (invalid !== undefined && !!invalid !== prevInvalid.value) {
    invalidSignal.value = !!invalid;
    prevInvalid.value = !!invalid;
  }

  // --- PUBLIC API METHODS ---
  // Note: Programmatic API methods intentionally bypass disabled states.
  const getValue = () => valueSignal.value;
  const setValue = (val) => { valueSignal.value = String(val); };
  const clear = () => { valueSignal.value = ''; };
  const setInvalid = (st) => { invalidSignal.value = !!st; };
  // --------------------------

  const handleInput = (e) => {
    if (disabledSignal.value) return e.preventDefault();

    const target = e.target;
    const start = target.selectionStart;
    const end = target.selectionEnd;

    valueSignal.value = target.value;
    (oninput || onInput)?.(valueSignal.value, e);

    queueMicrotask(() => {
      if (document.activeElement === target) {
        target.setSelectionRange(start, end);
      }
    });
  };

  // --- Physics Event Handlers ---
  const handlePointerOver = () => {
    if (!disabledSignal.value) isHovered.value = true;
  };

  const handlePointerOut = () => {
    if (!disabledSignal.value) {
      isHovered.value = false;
      isActive.value = false;
    }
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (!disabledSignal.value) isActive.value = true;
  };

  const handlePointerUp = () => {
    if (!disabledSignal.value) isActive.value = false;
  };

  const handleFocus = () => {
    if (!disabledSignal.value) isFocused.value = true;
  };

  const handleBlur = () => {
    if (!disabledSignal.value) isFocused.value = false;
  };

  const BASE_CLASSES = [
    design.layout.flex,
    design.size.wFull,
    design.shape.radius1,
    design.typography.lineTight,
    design.animation.transitionColors,
    type === 'file' && 'file:border-0 file:bg-transparent file:text-sm file:font-medium file:cursor-pointer',
    'placeholder:text-muted-foreground'
  ];

  const STATE_CLASSES = [
    invalidSignal.value && variant !== 'ghost' ? design.border.dangerBorder : '',
    disabledSignal.value ? [design.effect.opacity50, design.interaction.cursorNotAllowed] : '',
    variant !== 'ghost' && [
      design.state.focusVisibleEffectRing,
      design.effect.outlineOffset2
    ]
  ];

  const sizing = {
    sm: { minHeight: '2.25rem', padding: '0.25rem 0.75rem' },
    md: { minHeight: '2.5rem', padding: '0.5rem 0.75rem' },
    lg: { minHeight: '2.75rem', padding: '0.75rem 1rem' }
  }[size] || { minHeight: '2.5rem', padding: '0.5rem 0.75rem' };

  // --- Physics Math ---
  const currentScale = isActive.value ? 'scale(1)' : 'scale(1)';
  const currentHalo = isHovered.value && !isActive.value && !isFocused.value && variant !== 'ghost'
    ? '0 0 0 4px var(--color-bg-hover)'
    : '';

  const inlineStyle = variant === 'ghost'
    ? {
        outline: 'none', border: 'none', boxShadow: 'none', backgroundColor: 'transparent',
        transform: currentScale,
        transition: 'transform var(--animation-duration-fast) var(--animation-ease-standard)',
        ...sizing, ...style
      }
    : {
        borderStyle: 'solid',
        backgroundColor: 'var(--color-input-bg)',
        transform: currentScale,
        boxShadow: currentHalo,
        transition: 'transform var(--animation-duration-fast) var(--animation-ease-standard), box-shadow var(--animation-duration-fast) var(--animation-ease-standard)',
        ...sizing,
        ...style
      };

  return [
    // 1. Array Prefix: Expose Public API
    getValue,
    setValue,
    clear,
    setInvalid,

    // 2. The DOM Tree
    input({
      ...rest,
      id,
      type,
      value: valueSignal.value,
      disabled: disabledSignal.value,
      required,
      'aria-invalid': invalidSignal.value ? 'true' : 'false',
      'aria-disabled': disabledSignal.value ? 'true' : undefined,
      'aria-required': required ? 'true' : undefined,

      onpointerover: handlePointerOver,
      onpointerout: handlePointerOut,
      onpointerdown: handlePointerDown,
      onpointerup: handlePointerUp,
      onfocus: handleFocus,
      onblur: handleBlur,
      oninput: handleInput,

      class: [
        BASE_CLASSES,
        VARIANTS[variant] || VARIANTS.default,
        STATE_CLASSES,
        customClass
      ],
      style: inlineStyle
    })
  ];
});

// =========================================================
// STRUCTURAL HELPERS
// =========================================================

export const InputGroup = component.InputGroup((props = {}, ...children) => {
  const { class: customClass = '', invalid = false, disabled = false, style = {}, ...rest } = props;

  // Migrate physics tracking to signals
  const isHovered = signal.isHovered(false);
  const isFocused = signal.isFocused(false);

  const handleOver = () => { if (!disabled) isHovered.value = true; };
  const handleOut = () => { if (!disabled) isHovered.value = false; };

  // Use focusin/focusout because they bubble up from the child input!
  const handleFocusIn = () => { if (!disabled) isFocused.value = true; };
  const handleFocusOut = () => { if (!disabled) isFocused.value = false; };

  const currentHalo = isHovered.value && !isFocused.value
    ? '0 0 0 4px var(--color-bg-hover)'
    : '';

  return div({
    ...rest,
    onpointerover: handleOver,
    onpointerout: handleOut,
    onfocusin: handleFocusIn,
    onfocusout: handleFocusOut,
    class: [
      design.layout.flex,
      design.layout.itemsCenter,
      design.layout.relative,
      design.size.wFull,
      design.shape.radius1,
      design.shape.border1,
      design.bg.inputBg,
      design.fg.inputFg,
      invalid ? design.border.dangerBorder : design.border.inputBorder,
      !disabled && !invalid ? design.state.focusWithinEffectRing : '',
      !disabled && !invalid ? design.effect.outlineOffset2 : '',
      disabled ? [design.effect.opacity50, design.interaction.cursorNotAllowed] : '',
      customClass
    ],
    style: {
      borderStyle: 'solid',
      minHeight: '2.5rem',
      boxShadow: currentHalo,
      transition: 'box-shadow var(--animation-duration-fast) var(--animation-ease-standard), border-color var(--animation-duration-fast) var(--animation-ease-standard)',
      ...style
    }
  }, ...children);
});

export const InputLeftAddon = component.InputLeftAddon((props, ...children) => {
  const { class: customClass = '', ...rest } = props;

  return div({
    ...rest,
    class: [
      design.layout.flex,
      design.layout.itemsCenter,
      design.layout.justifyCenter,
      design.spacing.px3,
      design.fg.fgMuted,
      design.typography.size1,
      'border-r border-border shrink-0 self-stretch',
      customClass
    ]
  }, ...children);
});

export const InputRightAddon = component.InputRightAddon((props, ...children) => {
  const { class: customClass = '', ...rest } = props;

  return div({
    ...rest,
    class: [
      design.layout.flex,
      design.layout.itemsCenter,
      design.layout.justifyCenter,
      design.spacing.px3,
      design.fg.fgMuted,
      design.typography.size1,
      'border-l border-border shrink-0 self-stretch',
      customClass
    ]
  }, ...children);
});
