import { component, html, signal } from '../../../giant.js';

const { div } = html;

// Placement of the bubble (offset from the trigger) and its arrow; computed from `offset` at runtime.
const PLACEMENTS = {
  top: (o) => [{ bottom: `calc(100% + ${o}px)`, left: '50%', transform: 'translateX(-50%)' }, { bottom: '-4px', left: 'calc(50% - 4px)' }],
  bottom: (o) => [{ top: `calc(100% + ${o}px)`, left: '50%', transform: 'translateX(-50%)' }, { top: '-4px', left: 'calc(50% - 4px)' }],
  left: (o) => [{ top: '50%', right: `calc(100% + ${o}px)`, transform: 'translateY(-50%)' }, { top: 'calc(50% - 4px)', right: '-4px' }],
  right: (o) => [{ top: '50%', left: `calc(100% + ${o}px)`, transform: 'translateY(-50%)' }, { top: 'calc(50% - 4px)', left: '-4px' }]
};

// TODO(style): no arrow/caret primitive (small rotated square tucked behind the bubble)
const ARROW = { width: '8px', height: '8px', backgroundColor: 'inherit', transform: 'rotate(45deg)', zIndex: -1 };

const BUBBLE = {
  'style-position': 'absolute',
  'style-layer': 'overlay',
  'style-pad-block': 'small',
  'style-pad-inline': 'small',
  'style-radius': 'small',
  'style-surface': 'overlay',
  'style-emphasis': 'solid',
  'style-text': 'xsmall',
  'style-weight': 'medium',
  'style-font': 'sans',
  'style-wrap': 'nowrap',
  'style-interactive': 'inert',
  'style-motion': 'fade-in'
};

/**
 * Shows `content` in a bubble on hover/focus of the children (nothing when `content` is empty).
 * `forceOpen` keeps it shown; `variant: 'danger'` makes it a danger-toned role="alert" (e.g. a field error).
 * `pad` (a style-pad value) overrides the bubble padding; `dir="rtl"` mirrors left/right placements.
 */
export const Tooltip = component.Tooltip((props, ...children) => {
  const {
    content, position = 'top', offset = 8, pad, delay = 200, dir = 'auto', disabled = false,
    forceOpen = false, variant, style, ...rest
  } = props;
  const danger = variant === 'danger';

  const isOpen = signal.isOpen(false);

  // Handlers resolve the wrapper via closest() because giant.js delegates events.
  const handleShow = (e) => {
    const wrapper = e.target.closest('[data-tooltip-wrapper]');
    if (disabled || !wrapper || wrapper.contains(e.relatedTarget)) return;
    clearTimeout(wrapper._hideTimeout);
    clearTimeout(wrapper._showTimeout);
    if (delay <= 0) isOpen.value = true;
    else wrapper._showTimeout = setTimeout(() => { isOpen.value = true; }, delay);
  };

  const handleHide = (e) => {
    const wrapper = e.target.closest('[data-tooltip-wrapper]');
    if (!wrapper || wrapper.contains(e.relatedTarget)) return;
    clearTimeout(wrapper._showTimeout);
    wrapper._hideTimeout = setTimeout(() => { isOpen.value = false; }, 50);
  };

  const mirrored = dir === 'rtl' ? { left: 'right', right: 'left' }[position] : null;
  const [bubble, arrow] = (PLACEMENTS[mirrored || position] || PLACEMENTS.top)(offset);

  return div(
    rest,
    {
      dir,
      'data-tooltip-wrapper': 'true',
      'style-layout': 'inline',
      'style-position': 'relative',
      onpointerover: handleShow,
      onpointerout: handleHide,
      onfocusin: handleShow,
      onfocusout: handleHide
    },
    ...children,
    (forceOpen || isOpen.value) && !disabled && content
      ? div(
          BUBBLE,
          { role: danger ? 'alert' : 'tooltip', 'style-tone': danger ? 'danger' : 'neutral' },
          pad && { 'style-pad-block': pad, 'style-pad-inline': pad },
          { style: { ...bubble, ...style } },
          content,
          div({ 'style-position': 'absolute', style: { ...ARROW, ...arrow } })
        )
      : null
  );
});
