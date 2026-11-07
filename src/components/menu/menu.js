import { component, html, signal } from '../../../giant.js';

const { div, span, button, svg, polyline, circle } = html;

// Parses (props?, ...children) like an element factory does.
const pure = (fn) => (...args) => {
  const { attributes, children } = div(...args);
  return fn(attributes, ...children);
};

const icon = (size, attributes, shape) => svg({
  viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor',
  'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...attributes
}, shape);

// role=menuitem* + style-emphasis="ghost" gives hover, press, focus and aria-disabled states.
const ITEM = {
  'data-menu-item': 'true',
  'style-position': 'relative',
  'style-layout': 'row',
  'style-justify': 'between',
  'style-gap': 'medium',
  'style-width': 'full',
  'style-pad-block': 'xsmall',
  'style-pad-inline': 'small',
  'style-radius': 'small',
  'style-tone': 'neutral',
  'style-emphasis': 'ghost',
  'style-text': 'small',
  'style-font': 'sans',
  // TODO(style): no start-only padding; items leave room for the check/radio indicator
  style: { paddingInlineStart: 'var(--space-xlarge)' }
};

const PANEL = {
  role: 'menu',
  'style-position': 'absolute',
  'style-layer': 'overlay',
  'style-layout': 'stack',
  'style-width': 'small',
  'style-pad': 'xsmall',
  'style-surface': 'overlay',
  'style-border': 'thin',
  'style-radius': 'medium',
  'style-motion': 'slide-in'
};

const INDICATOR = {
  'style-position': 'absolute',
  'style-interactive': 'inert',
  // TODO(style): no inline-start inset
  style: { insetInlineStart: 'var(--space-small)' }
};

// Moves keyboard focus and the highlight within one panel (not into hidden submenus).
const highlight = (panel, current, step) => {
  if (!panel) return;
  const items = [...panel.querySelectorAll('[data-menu-item]:not([aria-disabled="true"])')]
    .filter((el) => el.closest('[role="menu"]') === panel);
  const i = items.indexOf(current);
  const next = items.at(i < 0 ? (step > 0 ? 0 : -1) : (i + step) % items.length);
  items.forEach((el) => el.toggleAttribute('data-highlighted', el === next));
  next?.focus();
};

export const Menu = component.Menu(function ({ open, defaultOpen = false, disabled = false, onOpenChange, onclick, onkeydown, ...rest }, ...children) {
  const host = this;
  const isOpen = signal.isOpen(!!(open ?? defaultOpen));
  const prevOpen = signal._prevOpen(open);

  if (open !== undefined && open !== prevOpen.value) isOpen.value = !!(prevOpen.value = open);

  const setOpen = (next, event) => {
    if ((disabled && next) || isOpen.value === next) return;
    isOpen.value = next;
    onOpenChange?.(next, event);
  };

  // Close on any click outside. The render signal removes the listener on the next render (or close).
  if (isOpen.value && host.signal) {
    const { signal: abort } = host;
    setTimeout(() => document.addEventListener('click', (e) => {
      if (!e.composedPath().includes(host)) setOpen(false, e);
    }, { signal: abort }));
  }

  const handleClick = (e) => {
    onclick?.(e);
    if (e.defaultPrevented) return;
    if (e.target.closest('[data-menu-trigger]')) return setOpen(!isOpen.value, e);
    const item = e.target.closest('[data-menu-item]');
    if (item && item.getAttribute('aria-disabled') !== 'true' && item.getAttribute('data-menu-close') !== 'false') setOpen(false, e);
  };

  const handleKeyDown = (e) => {
    onkeydown?.(e);
    if (e.defaultPrevented) return;
    const item = e.target.closest('[data-menu-item]');
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];

    if (e.key === 'Escape' && isOpen.value) {
      setOpen(false, e);
      host.querySelector('[data-menu-trigger]')?.focus();
    } else if (e.target.closest('[data-menu-trigger]') && (step || e.key === 'Enter' || e.key === ' ')) {
      setOpen(true, e);
      // after the open render has mounted the content
      queueMicrotask(() => highlight(host.querySelector('[data-menu-content]'), null, step || 1));
    } else if (item && step) {
      highlight(item.closest('[role="menu"]'), item, step);
    } else if (item && (e.key === 'Enter' || e.key === ' ')) {
      item.click();
    } else return;
    e.preventDefault();
  };

  return [
    {
      // host methods must be named: giant exposes them on the element by key
      open: (e) => setOpen(true, e),
      close: (e) => setOpen(false, e),
      toggle: (e) => setOpen(!isOpen.value, e),
      getOpen: () => isOpen.value,
      'style-position': 'relative',
      'style-layout': 'inline-block',
      'style-interactive': 'static',
      ...rest,
      'data-state': isOpen.value ? 'open' : 'closed',
      onclick: handleClick,
      onkeydown: handleKeyDown
    },
    // keep positions stable (null, not filtered out) so open/close never replaces the trigger node
    ...children.map((child) => (isOpen.value || !child?.attributes?.['data-menu-content'] ? child : null))
  ];
}, 'ui-menu'); // not <menu>: that is a native list element with UA margins and an implicit list role

const item = (role, indicator) => pure(({ checked = false, disabled = false, closeOnSelect = !indicator, onclick, ...rest }, ...children) =>
  div(
    ITEM,
    rest,
    {
      role,
      tabindex: disabled ? undefined : '-1',
      'aria-checked': indicator ? String(checked) : undefined,
      'aria-disabled': String(disabled),
      'data-menu-close': closeOnSelect ? undefined : 'false',
      onclick: (e) => { if (!disabled) onclick?.(e); }
    },
    indicator ? span(INDICATOR, checked ? indicator() : null) : null,
    ...children
  )
);

// Shows the submenu and highlights its trigger while the pointer is inside the wrapper.
const toggleSub = (show) => (e) => {
  const wrapper = e.target.closest('[data-submenu-wrapper]');
  if (!wrapper || (!show && wrapper.contains(e.relatedTarget))) return;
  wrapper.querySelector('[data-submenu-trigger]')?.toggleAttribute('data-highlighted', show);
  const content = wrapper.querySelector('[data-submenu-content]');
  if (content) content.style.display = show ? '' : 'none';
};

Menu.Trigger = (...args) => button(...args, { type: 'button', 'data-menu-trigger': 'true', 'aria-haspopup': 'menu' });

// TODO(style): no anchor placement (below the trigger)
Menu.Content = (...args) => div(PANEL, { style: { top: '100%', insetInlineStart: 0, marginBlockStart: 'var(--space-xsmall)' } }, ...args, { 'data-menu-content': 'true' });

Menu.Separator = (...args) => div({ 'style-pad-block': 'xsmall' }, ...args, { role: 'separator' }, div({ 'style-divider': 'top' }));

Menu.Shortcut = (...args) => span({ 'style-text': 'xsmall', 'style-tone': 'muted', 'style-tracking': 'wide', 'style-wrap': 'nowrap' }, ...args);

Menu.Item = item('menuitem');

Menu.CheckboxItem = item('menuitemcheckbox', () => icon('14', {}, polyline({ points: '20 6 9 17 4 12' })));

Menu.RadioItem = item('menuitemradio', () => icon('7', { fill: 'currentColor' }, circle({ cx: '12', cy: '12', r: '10' })));

Menu.Sub = (...args) => div(
  { 'data-submenu-wrapper': 'true', 'style-position': 'relative', onpointerover: toggleSub(true), onpointerout: toggleSub(false) },
  ...args
);

Menu.SubTrigger = pure((props, ...children) => Menu.Item(
  { 'aria-haspopup': 'menu', 'data-submenu-trigger': 'true', closeOnSelect: false, ...props },
  ...children,
  icon('16', { 'style-tone': 'muted' }, polyline({ points: '9 18 15 12 9 6' }))
));

Menu.SubContent = pure(({ defaultOpen = false, ...rest }, ...children) => div(
  PANEL,
  {
    'data-submenu-content': 'true',
    // TODO(style): no anchor placement (beside the trigger); display is runtime open state
    style: {
      ...(defaultOpen ? {} : { display: 'none' }),
      top: 'calc(-1 * var(--space-xsmall))',
      left: '100%',
      marginInlineStart: 'var(--space-xsmall)'
    }
  },
  rest,
  ...children
));

Menu.Group = (...args) => div({ role: 'group' }, ...args);
Menu.RadioGroup = (...args) => div({ role: 'radiogroup' }, ...args);
