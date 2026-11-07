import { component, html, signal } from '../../../giant.js';

const { div, li, ol, span, svg, path, polyline, circle } = html;

let toasts = [];
const listeners = new Set();
let toastCounter = 0;

const publish = (next) => {
  toasts = next;
  listeners.forEach((listener) => listener(toasts));
};

/**
 * Shows a toast and returns its id. Calling it again with the same `id` replaces that toast in place.
 * @param {string} message
 * @param {Object} [opts]
 * @param {string|number} [opts.id]
 * @param {'default'|'success'|'error'|'loading'} [opts.type='default']
 * @param {number} [opts.duration=4000] - Milliseconds; Infinity keeps it open.
 * @param {'top-left'|'top-center'|'top-right'|'bottom-left'|'bottom-center'|'bottom-right'} [opts.position='bottom-right']
 */
export const toast = (message, opts = {}) => {
  const id = opts.id ?? ++toastCounter;
  const next = { id, message, type: 'default', duration: 4000, position: 'bottom-right', ...opts, dismissed: false };
  publish(toasts.some((t) => t.id === id)
    ? toasts.map((t) => (t.id === id ? next : t))
    : [next, ...toasts].slice(0, 5));
  return id;
};

toast.success = (msg, opts) => toast(msg, { ...opts, type: 'success' });
toast.error = (msg, opts) => toast(msg, { ...opts, type: 'error' });
toast.loading = (msg, opts) => toast(msg, { ...opts, type: 'loading', duration: Infinity });

/** Dismisses a toast (or every toast when `id` is omitted) and removes it after the exit animation. */
toast.dismiss = (id) => {
  publish(toasts.map((t) => (id == null || t.id === id ? { ...t, dismissed: true } : t)));
  setTimeout(() => publish(toasts.filter((t) => !t.dismissed)), 400);
};

/**
 * Shows a loading toast until `promise` settles, then switches it to success or error.
 * @param {{ loading?: string, success: string|Function, error: string|Function, duration?: number }} opts - Also accepts toast options.
 */
toast.promise = (promise, opts) => {
  const id = toast.loading(opts.loading || 'Loading...', opts);
  const settle = (type, message) => (result) => publish(toasts.map((t) => (t.id === id
    ? { ...t, type, duration: opts.duration ?? 4000, message: typeof message === 'function' ? message(result) : message }
    : t)));
  promise.then(settle('success', opts.success), settle('error', opts.error));
  return promise;
};

/** Auto-dismiss timer that can be paused (hover, hidden page, detach) and restarted with a new duration. */
const dismissTimer = (id) => {
  const timer = {
    pause() {
      if (!timer.handle) return;
      clearTimeout(timer.handle);
      timer.handle = null;
      timer.remaining -= Date.now() - timer.startedAt;
    },
    resume() {
      if (timer.handle || timer.remaining === Infinity || document.hidden) return;
      timer.startedAt = Date.now();
      timer.handle = setTimeout(() => toast.dismiss(id), timer.remaining);
    },
    // a new duration (e.g. loading -> success) starts the countdown over
    run(duration) {
      if (duration !== timer.duration) {
        timer.pause();
        timer.duration = timer.remaining = duration;
      }
      timer.resume();
    },
    onvisibility: () => (document.hidden ? timer.pause() : timer.resume())
  };
  return timer;
};

const ICON = { viewBox: '0 0 24 24', width: '20', height: '20', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' };

const ICONS = {
  success: () => svg({ ...ICON, 'style-tone': 'success' }, polyline({ points: '20 6 9 17 4 12' })),
  error: () => svg({ ...ICON, 'style-tone': 'danger' }, path({ d: 'M18 6L6 18M6 6l12 12' })),
  loading: () => svg({ ...ICON, 'style-tone': 'muted', 'style-motion': 'spin' }, circle({ cx: '12', cy: '12', r: '9', 'stroke-dasharray': '42.4 14.15' }))
};

const TOAST = {
  'data-toast-item': true,
  'style-position': 'absolute',
  'style-width': 'full',
  'style-layout': 'row',
  'style-gap': 'small',
  'style-pad': 'medium',
  'style-surface': 'overlay',
  'style-border': 'thin',
  'style-radius': 'medium',
  'style-text': 'small',
  // swipe-to-dismiss: touch-action none + no text selection
  'style-interactive': 'drag'
};

const setSwipe = (item, px) => item.style.setProperty('--swipe-amount', `${px}px`);

const ToastItem = component.ToastItem(({ t, index, expanded, position }) => {
  const isTop = position.startsWith('top');
  const mounted = signal.mounted(false);
  // { y, at, amount } while the toast is being swiped
  const drag = signal.drag(null);
  const timer = signal.timer(() => dismissTimer(t.id)).value;

  const isFront = index === 0;
  const isVisible = mounted.value && !t.dismissed;
  const dir = isTop ? 1 : -1;
  const yOffset = index * (expanded ? 64 : 14) * dir;

  return [
    {
      onready: () => {
        setTimeout(() => { mounted.value = true; }, 10);
        document.addEventListener('visibilitychange', timer.onvisibility);
        timer.run(t.duration);
      },
      onupdated: () => timer.run(t.duration),
      // also fires when the toast is moved within the stack; onready resumes it
      ondestroyed: () => {
        timer.pause();
        document.removeEventListener('visibilitychange', timer.onvisibility);
      },
      // enter/leave don't bubble, so they go on the host rather than through delegation
      onpointerenter: timer.pause,
      onpointerleave: timer.resume
    },
    li(
      TOAST,
      {
        id: `toast-${t.id}`,
        'data-expanded': expanded,
        'data-front': isFront,
        'style-inset': isTop ? 'top' : 'bottom',
        // no transition while dragging so the toast tracks the pointer
        'style-motion': drag.value ? undefined : 'all',
        onpointerdown: (e) => {
          const item = e.target.closest('li');
          drag.value = { y: e.clientY, at: Date.now(), amount: 0 };
          item.setPointerCapture(e.pointerId);
        },
        onpointermove: (e) => {
          if (!drag.value) return;
          const y = e.clientY - drag.value.y;
          // only towards the edge the toast came from
          if (isTop ? y < 0 : y > 0) setSwipe(e.target.closest('li'), drag.value.amount = y);
        },
        onpointerup: (e) => {
          const d = drag.value;
          if (!d) return;
          const item = e.target.closest('li');
          drag.value = null;
          item.releasePointerCapture(e.pointerId);
          const distance = Math.abs(d.amount);
          if (distance >= 50 || distance / Math.max(Date.now() - d.at, 1) > 0.11) toast.dismiss(t.id);
          else setSwipe(item, 0);
        },
        // runtime stacking, swipe and enter/exit state
        style: {
          transformOrigin: isTop ? 'top center' : 'bottom center',
          zIndex: 50 - index,
          transform: `translateY(calc(${isVisible ? yOffset : yOffset - 100 * dir}px + var(--swipe-amount, 0px))) scale(${expanded ? 1 : 1 - index * 0.05})`,
          opacity: isVisible && (expanded || index < 3) ? 1 : 0,
          // the Toaster layer is inert; only the front (or expanded) toasts take input
          pointerEvents: isVisible && (isFront || expanded) ? 'auto' : 'none'
        }
      },
      ICONS[t.type]?.(),
      span({ 'style-weight': 'medium' }, t.message)
    )
  ];
});

// TODO(style): no corner/edge placement attribute for the six toast zones
const EDGE = 'var(--space-large)';
const ZONES = {
  'top-left': { top: EDGE, left: EDGE },
  'top-center': { top: EDGE, left: '50%', transform: 'translateX(-50%)' },
  'top-right': { top: EDGE, right: EDGE },
  'bottom-left': { bottom: EDGE, left: EDGE },
  'bottom-center': { bottom: EDGE, left: '50%', transform: 'translateX(-50%)' },
  'bottom-right': { bottom: EDGE, right: EDGE }
};

/** Renders all toasts. `fixed=false` positions the layer inside its container instead of the viewport. */
export const Toaster = component.Toaster(({ id, expand = false, fixed = true, ...rest }) => {
  const list = signal.toasts(() => toasts);
  const hovered = signal.hovered(false);
  const listener = signal.listener(() => (next) => { list.value = next; }).value;
  const expanded = expand || hovered.value;

  return [
    {
      // subscribe on attach rather than at render time, so the Toaster also renders on the server
      onready: () => {
        listeners.add(listener);
        list.value = toasts;
      },
      ondestroyed: () => listeners.delete(listener),
      onpointerenter: () => { hovered.value = true; },
      onpointerleave: () => { hovered.value = false; }
    },
    div(
      { 'style-position': fixed ? 'fixed' : 'absolute', 'style-inset': 'fill', 'style-layer': 'top', 'style-interactive': 'inert' },
      rest,
      ...Object.entries(ZONES).map(([pos, style]) => ol(
        { key: pos, id: `toast-zone-${pos}`, 'style-position': 'absolute', 'style-width': 'medium', 'style-margin': 'none', 'style-pad': 'none', style },
        ...list.value
          .filter((t) => (t.position || 'bottom-right') === pos)
          .map((t, index) => ToastItem({ id: `toast-item-${t.id}`, key: t.id, t, index, expanded, position: pos }))
      ))
    )
  ];
});
