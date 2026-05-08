import { component, html, design, signal } from '../../../giant.js';

const { div, button, h2, p, svg, path, style: styleTag } = html;

export const Dialog = component.Dialog((props, ...children) => {
  /**
   * @function Dialog
   * @description Stateful dialog root with awaitable open/close API.
   *
   * @param {Object} props
   * @param {boolean} [props.modal=true] - Whether overlay clicks close the dialog.
   * @param {string|Array} [props.class] - Additional CSS classes.
   * @param {...any} children - Dialog content nodes.
   * * @returns {[() => Promise<any>, (returnValue?: any) => void, Object]}
   * Returns an array containing `[open, close, vnode]` to expose the API to the host node.
   */
  const {
    modal = true,
    class: customClass = '',
    ...rest
  } = props;

  const rootId = signal.rootId(`dialog-${Math.random().toString(36).slice(2, 9)}`);
  const isOpen = signal.isOpen(false);
  const isAnimatingOut = signal.isAnimatingOut(false);

  // Wrap the resolver in an object so Giant.js doesn't try to execute it as a state-updater!
  const promiseRef = signal.promiseRef({ resolve: null });

  // --- PUBLIC API ---
  const open = () => {
    isOpen.value = true;
    isAnimatingOut.value = false;

    if (globalThis.document) document.body.style.overflow = 'hidden';

    return new Promise((resolve) => {
      promiseRef.value = { resolve };
    });
  };

  const close = (returnValue = null) => {
    if (!isOpen.value) return;

    isAnimatingOut.value = true;

    setTimeout(() => {
      isOpen.value = false;
      isAnimatingOut.value = false;

      if (globalThis.document) document.body.style.overflow = '';

      if (promiseRef.value?.resolve) {
        promiseRef.value.resolve(returnValue);
        promiseRef.value = { resolve: null };
      }
    }, 200);
  };
  // ------------------

  const handleRootClick = (e) => {
    if (modal && e.target === e.currentTarget) {
      return close(null);
    }

    if (e.target.closest('[data-dialog-close]')) {
      return close(null);
    }

    const actionBtn = e.target.closest('[data-dialog-action]');
    if (actionBtn) {
      const rawVal = actionBtn.getAttribute('data-value');
      let parsedVal = rawVal;

      try {
        if (rawVal !== undefined && rawVal !== null) {
          parsedVal = JSON.parse(rawVal);
        }
      } catch (err) { /* Keep as string if parsing fails */ }

      return close(parsedVal);
    }
  };

  const isVisible = isOpen.value || isAnimatingOut.value;
  const dialogState = isAnimatingOut.value ? 'closing' : (isOpen.value ? 'open' : 'closed');

  return [
    open,
    close,
    div(
      {
        ...rest,
        'data-dialog-root': rootId.value,
        'data-dialog-state': dialogState,
        role: 'dialog',
        'aria-modal': 'true',
        class: [
          design.layout.fixed,
          design.layout.inset0,
          design.layout.zModal,
          !isAnimatingOut.value && (design.animation?.fadeIn || 'animation-fade-in'),
          customClass
        ],
        style: {
          display: isVisible ? 'block' : 'none',
          pointerEvents: isAnimatingOut.value ? 'none' : 'auto',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          opacity: isAnimatingOut.value ? 0 : 1,
          transition: 'opacity 0.2s ease-out',
          ...rest.style
        },
        onclick: handleRootClick
      },

      styleTag(`
        [data-dialog-root="${rootId.value}"] [data-dialog-content] {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        [data-dialog-root="${rootId.value}"][data-dialog-state="open"] [data-dialog-content] {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        [data-dialog-root="${rootId.value}"][data-dialog-state="closing"] [data-dialog-content] {
          opacity: 0;
          transform: translate(-50%, -48%) scale(0.96);
        }
      `),

      ...(isVisible ? children : [])
    )
  ];
});

export const DialogContent = component.DialogContent((props, ...children) => {
  /**
   * @function DialogContent
   * @description Dialog panel container with optional close button.
   *
   * @param {Object} props
   * @param {string|Array} [props.class] - Additional CSS classes.
   * @param {boolean} [props.hideCloseButton=false] - Whether to hide the default close button.
   * @param {Object} [props.style] - Inline styles.
   * @param {...any} children - Dialog content children.
   */
  const { class: customClass = '', hideCloseButton = false, style = {}, ...rest } = props;

  const XIcon = svg(
    {
      viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      style: { width: '1rem', height: '1rem' }
    },
    path({ d: 'M18 6 6 18' }), path({ d: 'm6 6 12 12' })
  );

  const CloseButton = button(
    {
      type: 'button',
      'data-dialog-close': 'true',
      class: [
        design.layout.absolute,
        design.shape.radius1,
        design.animation.transitionColors,
        design.effect.opacity50,
        'hover:opacity-100',
        design.state.focusVisibleEffectRing
      ],
      style: { right: '1rem', top: '1rem', border: 'none', background: 'transparent', cursor: 'pointer' }
    },
    XIcon
  );

  return div(
    {
      ...rest,
      'data-dialog-content': 'true',
      class: [
        design.layout.fixed,
        design.bg.bg,
        design.size.wFull,
        design.shape.border1,
        design.border.border,
        design.effect.shadow3,
        design.shape.radius3,
        customClass
      ],
      style: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%) scale(1)',
        maxWidth: '32rem',
        padding: '1.5rem',
        borderStyle: 'solid',
        ...style
      }
    },
    ...children,
    !hideCloseButton && CloseButton
  );
});

export const DialogHeader = component.DialogHeader((props, ...children) => {
  /**
   * @function DialogHeader
   * @description Header layout container for dialog title and description.
   *
   * @param {Object} props
   * @param {string|Array} [props.class] - Additional CSS classes.
   * @param {Object} [props.style] - Inline styles.
   * @param {...any} children - Header children.
   */
  const { class: customClass = '', style = {}, ...rest } = props;
  return div({
    ...rest,
    class: [design.layout.flex, customClass],
    style: { flexDirection: 'column', gap: '0.375rem', textAlign: 'left', ...style }
  }, ...children);
});

export const DialogFooter = component.DialogFooter((props, ...children) => {
  /**
   * @function DialogFooter
   * @description Footer layout container for dialog actions.
   *
   * @param {Object} props
   * @param {string|Array} [props.class] - Additional CSS classes.
   * @param {Object} [props.style] - Inline styles.
   * @param {...any} children - Footer children.
   */
  const { class: customClass = '', style = {}, ...rest } = props;
  return div({
    ...rest,
    class: [design.layout.flex, customClass],
    style: { justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem', ...style }
  }, ...children);
});

export const DialogTitle = component.DialogTitle((props, ...children) => {
  /**
   * @function DialogTitle
   * @description Dialog title element.
   *
   * @param {Object} props
   * @param {string|Array} [props.class] - Additional CSS classes.
   * @param {Object} [props.style] - Inline styles.
   * @param {...any} children - Title content.
   */
  const { class: customClass = '', style = {}, ...rest } = props;
  return h2({
    ...rest,
    class: [design.typography.weightSemibold, design.typography.lineTight, design.typography.letterTight, customClass],
    style: { fontSize: '1.125rem', margin: 0, ...style }
  }, ...children);
});

export const DialogDescription = component.DialogDescription((props, ...children) => {
  /**
   * @function DialogDescription
   * @description Supporting description text for dialog.
   *
   * @param {Object} props
   * @param {string|Array} [props.class] - Additional CSS classes.
   * @param {Object} [props.style] - Inline styles.
   * @param {...any} children - Description content.
   */
  const { class: customClass = '', style = {}, ...rest } = props;
  return p({
    ...rest,
    class: [design.typography.size1, design.fg.fgMuted, customClass],
    style: { margin: 0, ...style }
  }, ...children);
});

export const DialogAction = component.DialogAction((props, ...children) => {
  /**
   * @function DialogAction
   * @description Marks a child control as a dialog action that closes with a return value.
   *
   * @param {Object} props
   * @param {any} props.value - Value returned when this action closes the dialog.
   * @param {...any} children - Child control to mark as action.
   * @returns {Object|null} Modified child vnode.
   */
  const { value, ...rest } = props;
  const child = children[0];
  if (!child) return null;

  const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

  if (child.nodeType === 1) {
    child.setAttribute('data-dialog-action', 'true');
    if (value !== undefined) child.setAttribute('data-value', strValue);
  } else if (child._type) {
    child.attributes['data-dialog-action'] = 'true';
    if (value !== undefined) child.attributes['data-value'] = strValue;
  }

  return child;
});

export const DialogCancel = component.DialogCancel((props, ...children) => {
  /**
   * @function DialogCancel
   * @description Marks a child control as a dialog cancel/close action.
   *
   * @param {Object} props
   * @param {...any} children - Child control to mark as close action.
   * @returns {Object|null} Modified child vnode.
   */
  const child = children[0];
  if (!child) return null;

  if (child.nodeType === 1) {
    child.setAttribute('data-dialog-close', 'true');
  } else if (child._type) {
    child.attributes['data-dialog-close'] = 'true';
  }

  return child;
});
