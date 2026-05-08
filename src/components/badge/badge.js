import { component, html, design, signal } from '../../../giant.js';

const { div } = html;

export const Badge = component.Badge((props, ...children) => {
  const {
    variant,
    class: className = '',
    style = {},
    ...rest
  } = props;

  const currentVariant = signal.variant(variant || 'default');

  // Sync prop to state if it explicitly changes
  if (variant !== undefined && variant !== currentVariant._lastProp) {
    currentVariant.value = variant;
  }
  // Always update the tracker to match the current render cycle
  currentVariant._lastProp = variant;

  const setVariant = (newVariant) => {
    currentVariant.value = newVariant;
  };

  const variantMap = {
    default: [design.bg.inverseBg, design.fg.inverseFg],
    secondary: [design.bg.bgMuted, design.fg.fg],
    destructive: [design.bg.dangerBg, design.fg.dangerFg],
    outline: [design.fg.fg, design.border.border]
  };

  const variantClasses = variantMap[currentVariant.value] || variantMap.default;

  return [
    setVariant,
    div(
      {
        ...rest,
        class: [
          design.layout.inlineFlex,
          design.layout.itemsCenter,
          design.layout.justifyCenter,
          design.shape.radiusRound,
          design.typography.weightMedium,
          design.interaction.selectNone,
          variantClasses,
          className
        ],
        style: {
          gap: '0.35rem',
          padding: '0.125rem 0.625rem',
          fontSize: '0.75rem',
          lineHeight: '1rem',
          transition: 'all 0.2s',
          border: currentVariant.value === 'outline' ? undefined : '1px solid transparent',
          ...style
        }
      },
      ...children
    )
  ];
});
