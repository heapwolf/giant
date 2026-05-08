import { component, html, design, signal } from '../../../giant.js';

const { div } = html;

export const Tooltip = component.Tooltip((props, ...children) => {
  const {
    content,
    position = 'top',
    offset = 8,
    padding = '0.5rem 0.75rem',
    delay = 200,
    dir = 'auto',
    disabled = false,
    class: customClass = '',
    style = {},
    ...rest
  } = props;

  const isOpen = signal.isOpen(false);

  const handleShow = (e) => {
    if (disabled) return;

    // FIX: Grab the wrapper via closest() because e.currentTarget is the document
    const wrapper = e.target.closest('[data-tooltip-wrapper]');
    if (!wrapper) return;

    // Ignore internal mouse/focus movements within the wrapper's children
    if (e.relatedTarget && wrapper.contains(e.relatedTarget)) return;

    clearTimeout(wrapper._hideTimeout);
    clearTimeout(wrapper._showTimeout);

    if (delay <= 0) {
      isOpen.value = true;
    } else {
      wrapper._showTimeout = setTimeout(() => {
        isOpen.value = true;
      }, delay);
    }
  };

  const handleHide = (e) => {
    // FIX: Grab the wrapper via closest()
    const wrapper = e.target.closest('[data-tooltip-wrapper]');
    if (!wrapper) return;

    if (e.relatedTarget && wrapper.contains(e.relatedTarget)) return;

    clearTimeout(wrapper._showTimeout);

    wrapper._hideTimeout = setTimeout(() => {
      isOpen.value = false;
    }, 50);
  };

  const isRtl = dir === 'rtl';

  const getPositionStyles = () => {
    const base = {
      position: 'absolute',
      whiteSpace: 'nowrap',
      zIndex: 50,
    };

    let effectivePosition = position;
    if (isRtl) {
      if (position === 'left') effectivePosition = 'right';
      else if (position === 'right') effectivePosition = 'left';
    }

    switch (effectivePosition) {
      case 'bottom':
        return { ...base, top: `calc(100% + ${offset}px)`, left: '50%', transform: 'translateX(-50%)' };
      case 'left':
        return { ...base, top: '50%', right: `calc(100% + ${offset}px)`, transform: 'translateY(-50%)' };
      case 'right':
        return { ...base, top: '50%', left: `calc(100% + ${offset}px)`, transform: 'translateY(-50%)' };
      case 'top':
      default:
        return { ...base, bottom: `calc(100% + ${offset}px)`, left: '50%', transform: 'translateX(-50%)' };
    }
  };

  const getArrowStyles = () => {
    const base = {
      position: 'absolute',
      width: '8px',
      height: '8px',
      backgroundColor: 'inherit',
      transform: 'rotate(45deg)',
      zIndex: -1,
    };

    let effectivePosition = position;
    if (isRtl) {
      if (position === 'left') effectivePosition = 'right';
      else if (position === 'right') effectivePosition = 'left';
    }

    switch (effectivePosition) {
      case 'bottom': return { ...base, top: '-4px', left: 'calc(50% - 4px)' };
      case 'left': return { ...base, top: 'calc(50% - 4px)', right: '-4px' };
      case 'right': return { ...base, top: 'calc(50% - 4px)', left: '-4px' };
      case 'top':
      default: return { ...base, bottom: '-4px', left: 'calc(50% - 4px)' };
    }
  };

  return div(
    {
      ...rest,
      dir,
      'data-tooltip-wrapper': 'true',
      // FIX: Rely entirely on utility classes instead of mixing with inline styles
      class: [
        design.layout.inlineFlex,
        design.layout.relative,
        design.layout.justifyCenter,
        design.layout.itemsCenter,
        customClass
      ],
      onpointerover: handleShow,
      onpointerout: handleHide,
      onfocusin: handleShow,
      onfocusout: handleHide,
    },
    ...children,
    isOpen.value && !disabled ? div(
      {
        role: 'tooltip',
        class: [
          design.typography.size0,
          design.typography.weightMedium,
          design.typography.fontSans,
          design.shape.radius1,
          design.effect.shadow2,
          design.animation.fadeIn
        ],
        style: {
          ...getPositionStyles(),
          padding,
          backgroundColor: 'var(--color-fg)',
          color: 'var(--color-bg)',
          pointerEvents: 'none', // Note: keep this 'none' if content is just text. Change to 'auto' if you place links in your tooltips.
          ...style
        }
      },
      content,
      div({ style: getArrowStyles() })
    ) : null
  );
});
