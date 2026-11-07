import { component, html, signal } from '../../../giant.js';

const { div, button, h2, p, svg, path } = html;

/**
 * Modal dialog root. The host exposes `open()` (resolves with the close value) and `close(value)`.
 * @param {boolean} [props.modal=true] - Whether clicking the backdrop closes the dialog.
 * @param {boolean} [props.open] - Controlled visibility; the parent owns the state.
 * @param {(value: any) => void} [props.onclose] - Called with the close value when the dialog closes itself.
 */
export const Dialog = component.Dialog((props, ...children) => {
  const { modal = true, open: openProp, onclose, ...rest } = props;

  const isOpen = signal.isOpen(false);
  const isClosing = signal.isAnimatingOut(false);
  const prevOpen = signal.prevOpen();
  // wrapped in an object so giant.js doesn't treat the resolver as a state updater
  const pending = signal.promiseRef({ resolve: null });

  const lockScroll = (on) => { if (globalThis.document) document.body.style.overflow = on ? 'hidden' : ''; };

  const show = () => {
    isOpen.value = true;
    isClosing.value = false;
    lockScroll(true);
  };

  const hide = (done) => {
    isClosing.value = true;
    setTimeout(() => {
      isOpen.value = false;
      isClosing.value = false;
      lockScroll(false);
      done?.();
    }, 200);
  };

  function open() {
    show();
    return new Promise((resolve) => { pending.value = { resolve }; });
  }

  function close(returnValue = null) {
    if (!isOpen.value || isClosing.value) return;
    onclose?.(returnValue);
    hide(() => {
      pending.value.resolve?.(returnValue);
      pending.value = { resolve: null };
    });
  }

  // a changed `open` prop wins over the imperative API
  if (openProp !== undefined && openProp !== prevOpen.value) {
    prevOpen.value = openProp;
    if (openProp) show();
    else if (isOpen.value && !isClosing.value) hide();
  }

  const handleClick = (e) => {
    // events are delegated, so e.currentTarget is document: the backdrop is marked instead
    if (modal && e.target.hasAttribute('data-backdrop')) return close(null);
    if (e.target.closest('[data-dialog-close]')) return close(null);

    const action = e.target.closest('[data-dialog-action]');
    if (!action) return;
    const raw = action.getAttribute('data-value');
    try { close(JSON.parse(raw)); } catch { close(raw); }
  };

  const isVisible = isOpen.value || isClosing.value;

  return [
    open,
    close,
    div(
      {
        role: 'dialog',
        'data-backdrop': true,
        'aria-modal': 'true',
        'style-layout': 'center',
        'style-position': 'fixed',
        'style-inset': 'fill',
        'style-layer': 'modal',
        'style-pad': 'medium',
        'style-surface': 'scrim',
        // fade-out also slides DialogContent back out (see giant.css)
        'style-motion': isClosing.value ? 'fade-out' : 'fade-in',
        'style-interactive': isClosing.value ? 'inert' : undefined
      },
      rest,
      {
        hidden: !isVisible,
        'data-dialog-state': isClosing.value ? 'closing' : isOpen.value ? 'open' : 'closed',
        onclick: handleClick
      },
      ...(isVisible ? children : [])
    )
  ];
});

/** Dialog panel; renders a close button unless `hideCloseButton` is set. */
export const DialogContent = component.DialogContent((props, ...children) => {
  const { hideCloseButton = false, ...rest } = props;

  return div(
    {
      'style-position': 'relative',
      'style-layout': 'stack',
      'style-gap': 'large',
      'style-width': 'full',
      'style-max-width': 'large',
      'style-pad': 'large',
      'style-surface': 'overlay',
      'style-radius': 'medium',
      'style-motion': 'slide-in'
    },
    rest,
    { 'data-dialog-content': 'true' },
    ...children,
    hideCloseButton ? null : button(
      {
        type: 'button',
        'aria-label': 'Close',
        'data-dialog-close': 'true',
        'style-position': 'absolute',
        'style-layout': 'inline',
        'style-pad': 'xsmall',
        'style-radius': 'small',
        'style-tone': 'muted',
        'style-emphasis': 'ghost',
        // TODO(style): no corner placement (top/end inset)
        style: { top: 'var(--space-medium)', insetInlineEnd: 'var(--space-medium)' }
      },
      svg(
        { viewBox: '0 0 24 24', width: '16', height: '16', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round' },
        path({ d: 'M18 6 6 18M6 6l12 12' })
      )
    )
  );
});

export const DialogHeader = component.DialogHeader((props, ...children) =>
  div({ 'style-layout': 'stack', 'style-gap': 'small', 'style-text-align': 'start' }, props, ...children));

export const DialogFooter = component.DialogFooter((props, ...children) =>
  div({ 'style-layout': 'row', 'style-justify': 'end', 'style-gap': 'small' }, props, ...children));

export const DialogTitle = component.DialogTitle((props, ...children) =>
  h2({ 'style-text': 'large', 'style-weight': 'semibold', 'style-leading': 'tight', 'style-tracking': 'tight', 'style-margin': 'none' }, props, ...children));

export const DialogDescription = component.DialogDescription((props, ...children) =>
  p({ 'style-text': 'small', 'style-tone': 'muted', 'style-margin': 'none' }, props, ...children));

// Marks the child control so clicking it closes the dialog; DialogAction also returns `value` from open().
const mark = (child, attributes) => {
  if (!child) return null;
  for (const [k, v] of Object.entries(attributes)) {
    if (v === undefined) continue;
    if (child.nodeType === 1) child.setAttribute(k, v);
    else if (child._type) child.attributes[k] = v;
  }
  return child;
};

export const DialogAction = component.DialogAction(({ value }, child) => mark(child, {
  'data-dialog-action': 'true',
  'data-value': value === undefined ? undefined : JSON.stringify(value)
}));

export const DialogCancel = component.DialogCancel((props, child) => mark(child, { 'data-dialog-close': 'true' }));
