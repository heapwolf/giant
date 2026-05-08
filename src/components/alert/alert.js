import { component, html, design, signal } from '../../../giant.js';

const { div, button, h5, p, svg, path, circle, line } = html;

const getAlertIcon = (variant) => {
  /**
   * @function getAlertIcon
   * @description Returns an SVG icon based on alert variant.
   *
   * @param {'success'|'destructive'|'info'|'default'} variant - Alert variant.
   * @returns {Object} Virtual DOM SVG node.
   */
  const baseProps = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: '18',
    height: '18',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    style: { marginTop: '2px', flexShrink: 0 }
  };

  switch (variant) {
    case 'success':
      return svg(baseProps,
        circle({ cx: "12", cy: "12", r: "10" }),
        path({ d: "m9 12 2 2 4-4" })
      );
    case 'destructive':
      return svg(baseProps,
        circle({ cx: "12", cy: "12", r: "10" }),
        line({ x1: "15", y1: "9", x2: "9", y2: "15" }),
        line({ x1: "9", y1: "9", x2: "15", y2: "15" })
      );
    case 'info':
    case 'default':
    default:
      return svg(baseProps,
        circle({ cx: "12", cy: "12", r: "10" }),
        path({ d: "M12 16v-4" }),
        path({ d: "M12 8h.01" })
      );
  }
};

export const Alert = component.Alert((props, ...children) => {
  /**
   * @function Alert
   * @description Alert component with stateful visibility, variants, and programmatic API.
   */
  const {
    isOpen,
    defaultIsOpen = true,
    variant,
    title = '',
    description = '',
    icon = null,
    dismissible = false,
    onClose,
    class: className = '',
    ...rest
  } = props;

  const isOpenSignal = signal.isOpen(isOpen !== undefined ? isOpen : defaultIsOpen);
  const prevIsOpen = signal.prevIsOpen(isOpen);

  const variantSignal = signal.variant(variant || 'default');
  const prevVariant = signal.prevVariant(variant);

  const titleSignal = signal.title(title);
  const descriptionSignal = signal.description(description);
  const iconSignal = signal.icon(icon);
  const isDestroyedSignal = signal.isDestroyed(false);

  const flashTimer = signal.flashTimer(null);

  if (isOpen !== undefined && isOpen !== prevIsOpen.value) {
    isOpenSignal.value = isOpen;
    prevIsOpen.value = isOpen;
  }
  if (variant !== undefined && variant !== prevVariant.value) {
    variantSignal.value = variant;
    prevVariant.value = variant;
  }

  // --- PUBLIC API METHODS ---
  const show = () => { isOpenSignal.value = true; };

  const hide = () => {
    isOpenSignal.value = false;
    if (typeof onClose === 'function') onClose();
  };

  const toggle = () => { isOpenSignal.value ? hide() : show(); };

  const update = (config = {}) => {
    if (config.title !== undefined) titleSignal.value = config.title;
    if (config.description !== undefined) descriptionSignal.value = config.description;
    if (config.variant !== undefined) variantSignal.value = config.variant;
    if (config.icon !== undefined) iconSignal.value = config.icon;
  };

  const flash = (ms = 3000) => {
    clearTimeout(flashTimer.value);
    show();
    flashTimer.value = setTimeout(() => hide(), ms);
  };

  const destroy = () => {
    hide();
    isDestroyedSignal.value = true;
  };
  // --------------------------

  // Early return: Destroyed State
  if (isDestroyedSignal.value) {
    return [
      show, hide, toggle, update, flash, destroy,
      { _type: '#text', attributes: { text: '' }, children: [] }
    ];
  }

  // Early return: Hidden State
  if (!isOpenSignal.value) {
    return [
      show, hide, toggle, update, flash, destroy,
      div({ style: { display: 'none' }, 'aria-hidden': 'true' })
    ];
  }

  const ariaLive = variantSignal.value === 'destructive' ? 'assertive' : 'polite';

  const closeButton = dismissible ? button(
    {
      type: 'button',
      style: {
        position: 'absolute', top: 'var(--layout-space-4)', right: 'var(--layout-space-4)',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'var(--color-fg-muted)', fontSize: '1.2rem', lineHeight: '1'
      },
      'aria-label': 'Close alert',
      onclick: () => hide()
    },
    '×'
  ) : null;

  const renderedIcon = iconSignal.value || getAlertIcon(variantSignal.value);

  // Main Return: Visible State
  return [
    show, hide, toggle, update, flash, destroy,
    div(
      {
        class: [design.layout.relative, design.layout.flex, className],
        style: {
          gap: 'var(--layout-space-4)',
          padding: 'var(--layout-space-4)',
          borderRadius: 'var(--shape-radius-2)',
          border: 'var(--shape-border-width-1) solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-fg)',
          alignItems: 'flex-start',
          width: '100%'
        },
        role: 'alert',
        'aria-live': ariaLive,
        'aria-atomic': 'true',
        ...rest
      },

      renderedIcon,

      div(
        { class: [design.layout.flex], style: { flexDirection: 'column', gap: 'var(--layout-space-1)', flex: 1 } },
        titleSignal.value && AlertTitle(titleSignal.value),
        descriptionSignal.value && AlertDescription(descriptionSignal.value),
        ...children
      ),

      closeButton
    )
  ];
});

export const AlertTitle = component.AlertTitle((props, ...children) => {
  /**
   * @function AlertTitle
   * @description Title element for alert.
   */
  const { class: className = '', style = {}, ...rest } = props;

  return h5(
    {
      class: [design.typography.weightMedium, className],
      style: { margin: 0, fontSize: '1rem', letterSpacing: '-0.02em', lineHeight: '1', ...style },
      ...rest
    },
    ...children
  );
});

export const AlertDescription = component.AlertDescription((props, ...children) => {
  /**
   * @function AlertDescription
   * @description Description text for alert.
   */
  const { class: className = '', style = {}, ...rest } = props;

  return p(
    {
      class: [design.fg.fgMuted, className],
      style: { margin: 0, fontSize: '0.9rem', lineHeight: '1.5', ...style },
      ...rest
    },
    ...children
  );
});
