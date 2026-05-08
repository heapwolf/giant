// Button.js
import { component, html, design, signal } from '../../../giant.js';

const { button } = html;

const BASE_CLASSES = [
  design.layout.inlineFlex,
  design.layout.itemsCenter,
  design.layout.justifyCenter,
  design.spacing.gap2,
  design.shape.radius1,
  design.typography.fontSans,
  design.typography.weightMedium,
  design.typography.size1,
  design.typography.lineNormal,
  design.interaction.selectNone,
  design.animation.transitionColors,
  design.state.focusVisibleEffectRing,
  design.effect.outlineOffset2
];

const VARIANTS = {
  primary: [
    design.bg.actionBg,
    design.fg.actionFg,
    design.shape.border0,
    design.state.hoverColorActionBg,
    design.state.activeColorActionBg
  ],
  destructive: [
    design.bg.dangerBg,
    design.fg.dangerFg,
    design.shape.border0,
  ],
  secondary: [
    design.bg.bgMuted,
    design.fg.fg,
    design.shape.border0,
    design.state.hoverColorBg
  ],
  outline: [
    design.color.surface,
    design.fg.fg,
    design.shape.border1,
    design.border.inputBorder,
    design.state.hoverColorBg
  ],
  ghost: [
    design.fg.fg,
    design.shape.border0,
    design.state.hoverColorBg
  ],
  link: [
    design.fg.fg,
    design.shape.border0,
    design.spacing.p0,
    design.typography.decorationUnderline
  ]
};

const SIZES = {
  sm: [design.typography.size0, design.spacing.px4, design.spacing.p1],
  md: [design.typography.size1, design.spacing.px4, design.spacing.p2],
  lg: [design.typography.size2, design.spacing.px4, design.spacing.p3],
  icon: [design.spacing.p2, design.size.layoutRatioSquare]
};

export const Button = component.Button((props = {}, ...children) => {
  /**
   * Interactive button component for user actions.
   */

  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    type = 'button',
    onclick,
    onClick,
    class: customClass,
    style: customStyle = {},
    'aria-label': ariaLabel,
    'aria-expanded': ariaExpanded,
    'aria-controls': ariaControls,
    ...rest
  } = props;

  if (variant === 'default') variant = 'primary';
  if (size === 'default') size = 'md';

  const isDisabled = Boolean(disabled || loading);

  const isHovered = signal.isHovered(false);
  const isActive = signal.isActive(false);

  const handleInternalClick = (e) => {
    if (isDisabled) {
      e.preventDefault();
      return;
    }
    const clickCallback = onclick || onClick;
    if (typeof clickCallback === 'function') clickCallback(e);
  };

  const handlePointerOver = () => {
    if (!isDisabled) isHovered.value = true;
  };

  const handlePointerOut = (e) => {
    const btn = e.target.closest('button');
    if (btn && e.relatedTarget && btn.contains(e.relatedTarget)) return;

    if (!isDisabled) {
      isHovered.value = false;
      isActive.value = false;
    }
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (!isDisabled) isActive.value = true;
  };

  const handlePointerUp = () => {
    if (!isDisabled) isActive.value = false;
  };

  const currentScale = isActive.value ? 'scale(0.96)' : 'scale(1)';

  const baseShadow = (variant === 'ghost' || variant === 'link')
    ? 'none'
    : 'var(--effect-shadow-1)';

  const currentShadow = isHovered.value && !isActive.value
    ? `0 0 0 4px var(--color-bg-hover), ${baseShadow}`
    : baseShadow;

  return button(
    {
      ...rest,
      type,
      disabled: isDisabled,
      'aria-disabled': isDisabled ? 'true' : undefined,
      'aria-busy': loading ? 'true' : undefined,
      'aria-label': ariaLabel,
      'aria-expanded': ariaExpanded,
      'aria-controls': ariaControls,
      'data-loading': loading ? 'true' : undefined,

      onclick: handleInternalClick,
      onpointerover: handlePointerOver,
      onpointerout: handlePointerOut,
      onpointerdown: handlePointerDown,
      onpointerup: handlePointerUp,

      class: [
        BASE_CLASSES,
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        isDisabled && [
          design.effect.opacity50,
          design.interaction.cursorNotAllowed,
          design.interaction.pointerNone
        ],
        customClass
      ],
      style: {
        ...customStyle,
        transform: currentScale,
        boxShadow: currentShadow,
        overflow: 'visible',
        transition: 'transform var(--animation-duration-fast) cubic-bezier(0.2, 0, 0.2, 1), box-shadow var(--animation-duration-fast) var(--animation-ease-standard), background-color var(--animation-duration-fast) var(--animation-ease-standard), color var(--animation-duration-fast) var(--animation-ease-standard)'
      }
    },
    ...children
  );
});
