import { component, html, design } from '../../../giant.js';

const { div, li, ol, span, svg, path, polyline, circle, g } = html;

let toasts = [];
let listeners = new Set();
let toastCounter = 0;

const notify = () => {
  listeners.forEach(listener => listener(toasts));
};

export const toast = (message, opts = {}) => {
  /**
   * toast Utility
   *
   * @function
   * @description Creates and displays a toast notification.
   *
   * @param {string} message - Toast message content.
   * @param {Object} [opts={}] - Toast options.
   * @param {string|number} [opts.id] - Custom toast id.
   * @param {'default'|'success'|'error'|'loading'} [opts.type='default'] - Toast visual type.
   * @param {number} [opts.duration=4000] - Toast duration in milliseconds.
   * @param {'top-left'|'top-center'|'top-right'|'bottom-left'|'bottom-center'|'bottom-right'} [opts.position='bottom-right'] - Toast position.
   * @returns {string|number} Toast id.
   */
  const id = opts.id || ++toastCounter;
  // Route to bottom-right by default if no position is specified
  const newToast = { id, message, type: 'default', duration: 4000, position: 'bottom-right', ...opts, mounted: false, dismissed: false };

  toasts = [newToast, ...toasts].slice(0, 5);
  notify();
  return id;
};

toast.success = (msg, opts) => {
  /**
   * toast.success Utility
   *
   * @function
   * @description Creates a success toast.
   *
   * @param {string} msg - Toast message content.
   * @param {Object} [opts] - Toast options.
   * @returns {string|number} Toast id.
   */
  return toast(msg, { ...opts, type: 'success' });
};

toast.error = (msg, opts) => {
  /**
   * toast.error Utility
   *
   * @function
   * @description Creates an error toast.
   *
   * @param {string} msg - Toast message content.
   * @param {Object} [opts] - Toast options.
   * @returns {string|number} Toast id.
   */
  return toast(msg, { ...opts, type: 'error' });
};

toast.loading = (msg, opts) => {
  /**
   * toast.loading Utility
   *
   * @function
   * @description Creates a persistent loading toast.
   *
   * @param {string} msg - Toast message content.
   * @param {Object} [opts] - Toast options.
   * @returns {string|number} Toast id.
   */
  return toast(msg, { ...opts, type: 'loading', duration: Infinity });
};

toast.dismiss = (id) => {
  /**
   * toast.dismiss Utility
   *
   * @function
   * @description Dismisses a toast by id and removes it after the exit animation.
   *
   * @param {string|number} id - Toast id to dismiss.
   * @returns {void}
   */
  toasts = toasts.map(t => t.id === id ? { ...t, dismissed: true } : t);
  notify();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  }, 400);
};

toast.promise = (promise, opts) => {
  /**
   * toast.promise Utility
   *
   * @function
   * @description Displays a loading toast while a promise resolves, then updates it to success or error.
   *
   * @param {Promise} promise - Promise to track.
   * @param {Object} opts - Promise toast options.
   * @param {string} [opts.loading='Loading...'] - Loading message.
   * @param {string|Function} opts.success - Success message or formatter.
   * @param {string|Function} opts.error - Error message or formatter.
   * @returns {Promise} The original promise.
   */
  const id = toast.loading(opts.loading || 'Loading...', opts); // Pass opts to inherit position
  promise
    .then((res) => {
      const msg = typeof opts.success === 'function' ? opts.success(res) : opts.success;
      toasts = toasts.map(t => t.id === id ? { ...t, message: msg, type: 'success', duration: 4000 } : t);
      notify();
    })
    .catch((err) => {
      const msg = typeof opts.error === 'function' ? opts.error(err) : opts.error;
      toasts = toasts.map(t => t.id === id ? { ...t, message: msg, type: 'error', duration: 4000 } : t);
      notify();
    });
  return promise;
};

// FIXED: Changed to `function(props)` so `this` binds correctly
const ToastItem = component.ToastItem(function(props) {
  const { t, index, expanded, position } = props;

  const isTop = position.startsWith('top');

  if (this.state.mounted === undefined) {
    this.state.mounted = false;
    setTimeout(() => {
      this.state.mounted = true;
    }, 10);
  }

  if (!this.state.timerConfigured && t.duration !== Infinity) {
    let timeoutId;
    let remainingTime = t.duration;
    let startTime;

    const startTimer = () => {
      startTime = Date.now();
      timeoutId = setTimeout(() => toast.dismiss(t.id), remainingTime);
    };

    const pauseTimer = () => {
      clearTimeout(timeoutId);
      remainingTime -= Date.now() - startTime;
    };

    const handleVisibility = () => { document.hidden ? pauseTimer() : startTimer(); };
    document.addEventListener('visibilitychange', handleVisibility);

    startTimer();

    this.addEventListener('destroyed', () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibility);
    });

    this.state.pause = pauseTimer;
    this.state.resume = startTimer;
    this.state.timerConfigured = true;
  }

  if (!this.state.setupSwipe) {
    this.state.dragging = false;
    this.state.startY = 0;
    this.state.swipeAmount = 0;
    this.state.startTime = 0;

    this.onDown = (e) => {
      this.state.dragging = true;
      this.state.startY = e.clientY;
      this.state.startTime = Date.now();
      e.target.setPointerCapture(e.pointerId);
    };

    this.onMove = (e) => {
      if (!this.state.dragging) return;
      const yPos = e.clientY - this.state.startY;

      const isDraggingInDir = isTop ? yPos < 0 : yPos > 0;

      if (isDraggingInDir) {
        this.state.swipeAmount = yPos;
        e.target.closest('li').style.setProperty('--swipe-amount', `${yPos}px`);
      }
    };

    this.onUp = (e) => {
      if (!this.state.dragging) return;
      this.state.dragging = false;
      e.target.releasePointerCapture(e.pointerId);

      const timeTaken = Date.now() - this.state.startTime;
      const velocity = Math.abs(this.state.swipeAmount) / timeTaken;

      if (Math.abs(this.state.swipeAmount) >= 50 || velocity > 0.11) {
        toast.dismiss(t.id);
      } else {
        this.state.swipeAmount = 0;
        e.target.closest('li').style.setProperty('--swipe-amount', `0px`);
      }
    };
    this.state.setupSwipe = true;
  }

  const isFront = index === 0;
  const isVisible = this.state.mounted && !t.dismissed;

  const dir = isTop ? 1 : -1;
  const yOffset = expanded ? (index * 64 * dir) : (index * 14 * dir);
  const scale = expanded ? 1 : (1 - (index * 0.05));

  const baseTranslate = isVisible ? yOffset : (yOffset - (100 * dir));
  const opacity = isVisible ? (expanded || index < 3 ? 1 : 0) : 0;

  const iconStyle = { width: '1.25rem', height: '1.25rem', marginRight: '0.75rem', flexShrink: 0 };

  const Icons = {
    success: svg({ viewBox: '0 0 24 24', fill: 'none', stroke: design.color.success[3], 'stroke-width': '2', style: iconStyle }, polyline({ points: '20 6 9 17 4 12' })),
    error: svg({ viewBox: '0 0 24 24', fill: 'none', stroke: design.color.danger[3], 'stroke-width': '2', style: iconStyle }, path({ d: 'M18 6L6 18M6 6l12 12' })),
    loading: svg({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', style: { ...iconStyle, opacity: 0.5 } }, g({ style: { animation: 'spin 1s linear infinite', transformOrigin: '12px 12px' } }, circle({ cx: '12', cy: '12', r: '9', 'stroke-dasharray': '42.4 14.15' })))
  };

  return li({
    id: `toast-${t.id}`,
    'data-sonner-toast': true,
    'data-expanded': expanded,
    'data-front': isFront,
    onpointerdown: this.onDown,
    onpointermove: this.onMove,
    onpointerup: this.onUp,
    onpointerenter: this.state.pause,
    onpointerleave: this.state.resume,
    class: [
      design.layout.absolute,
      design.size.wFull,
      design.bg.bgSurface,
      design.shape.border1,
      design.border.borderMuted,
      design.shape.radius2,
      design.effect.shadow2,
      design.layout.flex,
      design.layout.itemsCenter,
      design.typography.size1,
      design.interaction.selectNone
    ],
    style: {
      left: '0',
      right: '0',
      top: isTop ? '0' : 'auto',
      bottom: isTop ? 'auto' : '0',
      padding: '1rem',
      transformOrigin: isTop ? 'top center' : 'bottom center',
      touchAction: 'none',
      zIndex: 50 - index,
      transition: this.state.dragging ? 'none' : 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms ease',
      transform: `translateY(calc(${baseTranslate}px + var(--swipe-amount, 0px))) scale(${scale})`,
      opacity: opacity,
      pointerEvents: isVisible && (isFront || expanded) ? 'auto' : 'none'
    }
  },
    t.type !== 'default' ? Icons[t.type] : null,
    span({ class: design.typography.weightMedium }, t.message)
  );
});

// FIXED: Changed to `function(props)` so `this` binds correctly
export const Toaster = component.Toaster(function(props) {
  const { expand = false, fixed = true, class: customClass = '', ...rest } = props;

  if (!this.state.initialized) {
    this.state.toasts = [...toasts];
    this.state.isHovered = false;

    const listener = (newToasts) => {
      this.state.toasts = [...newToasts];
    };

    listeners.add(listener);

    this.addEventListener('destroyed', () => {
      listeners.delete(listener);
    });

    this.state.initialized = true;
  }

  const isExpanded = expand || this.state.isHovered;

  const toastsByPosition = {};
  this.state.toasts.forEach(t => {
    const pos = t.position || 'bottom-right';
    if (!toastsByPosition[pos]) toastsByPosition[pos] = [];
    toastsByPosition[pos].push(t);
  });

  const POSITIONS = {
    'top-left': { top: '24px', left: '24px', bottom: 'auto', right: 'auto' },
    'top-center': { top: '24px', left: '50%', transform: 'translateX(-50%)', bottom: 'auto', right: 'auto' },
    'top-right': { top: '24px', right: '24px', bottom: 'auto', left: 'auto' },
    'bottom-left': { bottom: '24px', left: '24px', top: 'auto', right: 'auto' },
    'bottom-center': { bottom: '24px', left: '50%', transform: 'translateX(-50%)', top: 'auto', right: 'auto' },
    'bottom-right': { bottom: '24px', right: '24px', top: 'auto', left: 'auto' }
  };

  return div(
    {
      ...rest,
      class: [
        fixed ? design.layout.fixed : design.layout.absolute,
        design.layout.inset0,
        design.layout.zOverlay,
        customClass
      ],
      style: {
        pointerEvents: 'none',
        ...rest.style
      },
      onpointerenter: () => { this.state.isHovered = true; },
      onpointerleave: () => { this.state.isHovered = false; }
    },
    ...Object.keys(POSITIONS).map(pos => {
      const posToasts = toastsByPosition[pos] || [];
      return ol({
        key: pos,
        id: `toast-zone-${pos}`,
        class: design.layout.relative,
        style: {
          position: 'absolute',
          width: '356px',
          margin: 0,
          padding: 0,
          listStyle: 'none',
          ...POSITIONS[pos]
        }
      },
        ...posToasts.map((t, index) =>
          ToastItem({ id: `toast-item-${t.id}`, key: t.id, t, index, expanded: isExpanded, position: pos })
        )
      )
    })
  );
});

