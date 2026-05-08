import { html, design } from '../../../giant.js';

const { div, span, button, svg, polyline, circle } = html;

// =========================================================
// HYPERSCRIPT HELPER
// =========================================================
// Restores the framework's (props?, ...children) signature
// for pure functions so layout doesn't break if props are omitted.
const pure = (fn) => (...rawArgs) => {
  const firstArg = rawArgs[0];
  const isProps = firstArg && typeof firstArg === 'object' && !Array.isArray(firstArg) && !firstArg._type && !firstArg.nodeType;
  const props = isProps ? rawArgs[0] : {};
  const children = isProps ? rawArgs.slice(1) : rawArgs;
  return fn(props, ...children);
};

const ITEM_BASE_CLASSES = [
  design.layout.relative,
  design.layout.flex,
  design.layout.itemsCenter,
  design.layout.justifyBetween,
  design.shape.radius1,
  design.interaction.selectNone,
  design.interaction.cursorDefault,
  design.typography.size1,
  design.typography.fontSans,
  design.size.wFull
];

const getItemStyle = (disabled) => ({
  boxSizing: 'border-box',
  padding: '0.35rem 0.5rem 0.35rem 1.75rem',
  margin: '1px 0',
  color: disabled ? 'var(--color-disabled-fg)' : 'var(--color-fg)',
  opacity: disabled ? '0.5' : '1',
  transition: 'background-color var(--animation-duration-fast) var(--animation-ease-standard), transform var(--animation-duration-fast) cubic-bezier(0.2, 0, 0.2, 1)',
  outline: 'none',
  cursor: disabled ? 'not-allowed' : 'default'
});

const applyItemPhysics = (disabled) => ({
  onpointerover: (e) => {
    if (disabled) return;
    const el = e.target.closest('[data-menu-item]');
    if (el) el.style.backgroundColor = 'var(--color-bg-hover)';
  },
  onpointerout: (e) => {
    if (disabled) return;
    const el = e.target.closest('[data-menu-item]');

    if (el && e.relatedTarget && el.contains(e.relatedTarget)) return;

    if (el) {
      el.style.backgroundColor = '';
      el.style.transform = '';
    }
  },
  onpointerdown: (e) => {
    if (disabled || (e.button !== 0 && e.pointerType === 'mouse')) return;
    const el = e.target.closest('[data-menu-item]');
    if (el) el.style.transform = 'scale(0.98)';
  },
  onpointerup: (e) => {
    if (disabled) return;
    const el = e.target.closest('[data-menu-item]');
    if (el) el.style.transform = '';
  }
});

// =========================================================
// MENU PRIMITIVES
// =========================================================

export const Menu = pure((props, ...children) => {
  const { class: className = '', style = {}, ...rest } = props;

  return div(
    {
      class: [
        design.layout.relative,
        design.layout.inlineBlock,
        design.interaction.selectNone,
        className
      ],
      style: {
        height: 'fit-content',
        width: 'fit-content',
        ...style
      },
      ...rest
    },
    ...children
  );
});

export const MenuTrigger = pure((props, ...children) => {
  const { class: className = '', ...rest } = props;
  return button({ class: className, ...rest }, ...children);
});

export const MenuContent = pure((props, ...children) => {
  const { class: className = '', ...rest } = props;

  return div(
    {
      class: [design.layout.absolute, design.layout.zOverlay, design.layout.flex, className],
      style: {
        boxSizing: 'border-box',
        flexDirection: 'column',
        alignItems: 'stretch',
        top: '100%',
        left: '0',
        marginTop: '0.25rem',
        minWidth: '13rem',
        padding: '0.25rem',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border-muted)',
        borderRadius: 'var(--shape-radius-2)',
        boxShadow: 'var(--effect-shadow-2)',
        animation: 'fade-in var(--animation-duration-fast) var(--animation-ease-out)'
      },
      ...rest
    },
    ...children
  );
});

export const MenuSeparator = pure((props, ...children) => {
  return div({
    style: {
      height: '1px',
      backgroundColor: 'var(--color-border-muted)',
      margin: '0.25rem -0.25rem'
    }
  });
});

export const MenuShortcut = pure((props, ...children) => {
  const { class: className = '', style = {}, ...rest } = props;

  return span(
    {
      class: [design.typography.size0, design.fg.fgMuted, className],
      style: {
        marginLeft: 'auto',
        paddingLeft: '1.5rem',
        letterSpacing: '0.1em',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...style
      },
      ...rest
    },
    ...children
  );
});

export const MenuItem = pure((props, ...children) => {
  const { disabled = false, onclick, class: className = '', ...rest } = props;

  return div(
    {
      'data-menu-item': 'true',
      class: [ITEM_BASE_CLASSES, className],
      style: getItemStyle(disabled),
      'aria-disabled': disabled ? 'true' : 'false',
      onclick: (e) => {
        if (!disabled && onclick) onclick(e);
      },
      ...applyItemPhysics(disabled),
      ...rest
    },
    ...children
  );
});

// =========================================================
// SUBMENUS
// =========================================================

export const MenuSub = pure((props, ...children) => {
  const { class: className = '', defaultOpen = false, ...rest } = props;

  const handleOver = (e) => {
    // FIX: Use closest() instead of currentTarget because giant.js delegates events
    const wrapper = e.target.closest('[data-submenu-wrapper]');
    if (!wrapper) return;

    const trigger = wrapper.querySelector('[data-submenu-trigger]');
    const content = wrapper.querySelector('[data-submenu-content]');

    if (trigger) trigger.style.backgroundColor = 'var(--color-bg-hover)';
    if (content) content.style.display = 'flex';
  };

  const handleOut = (e) => {
    // FIX: Use closest() instead of currentTarget
    const wrapper = e.target.closest('[data-submenu-wrapper]');
    if (!wrapper) return;

    if (e.relatedTarget && wrapper.contains(e.relatedTarget)) return;

    const trigger = wrapper.querySelector('[data-submenu-trigger]');
    const content = wrapper.querySelector('[data-submenu-content]');

    if (trigger) trigger.style.backgroundColor = '';
    if (content) content.style.display = 'none';
  };

  return div(
    {
      'data-submenu-wrapper': 'true',
      class: [design.layout.relative, className],
      onpointerover: handleOver,
      onpointerout: handleOut,
      ...rest
    },
    ...children
  );
});

export const MenuSubTrigger = pure((props, ...children) => {
  const { disabled = false, class: className = '', ...rest } = props;

  return div(
    {
      'data-menu-item': 'true',
      'data-submenu-trigger': 'true',
      class: [ITEM_BASE_CLASSES, className],
      style: getItemStyle(disabled),
      'aria-disabled': disabled ? 'true' : 'false',
      ...applyItemPhysics(disabled),
      ...rest
    },
    ...children,
    svg(
      {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        style: {
          width: '1rem',
          height: '1rem',
          marginLeft: 'auto',
          opacity: '0.7'
        }
      },
      polyline({ points: '9 18 15 12 9 6' })
    )
  );
});

export const MenuSubContent = pure((props, ...children) => {
  const { class: className = '', defaultOpen = false, ...rest } = props;

  return div(
    {
      'data-submenu-content': 'true',
      class: [design.layout.absolute, design.layout.zOverlay, design.layout.flex, className],
      style: {
        boxSizing: 'border-box',
        display: defaultOpen ? 'flex' : 'none',
        flexDirection: 'column',
        alignItems: 'stretch',
        top: '-0.25rem',
        left: '100%',
        marginLeft: '0.15rem',
        minWidth: '10rem',
        padding: '0.25rem',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border-muted)',
        borderRadius: 'var(--shape-radius-2)',
        boxShadow: 'var(--effect-shadow-2)',
        animation: 'fade-in var(--animation-duration-fast) var(--animation-ease-out)'
      },
      ...rest
    },
    ...children
  );
});

// =========================================================
// TOGGLE ITEMS
// =========================================================

export const MenuCheckboxItem = pure((props, ...children) => {
  const { checked = false, disabled = false, onclick, class: className = '', ...rest } = props;

  return div(
    {
      'data-menu-item': 'true',
      class: [ITEM_BASE_CLASSES, className],
      style: getItemStyle(disabled),
      'aria-disabled': disabled ? 'true' : 'false',
      onclick: (e) => {
        if (!disabled && onclick) onclick(e);
      },
      ...applyItemPhysics(disabled),
      ...rest
    },
    span(
      {
        class: [
          design.layout.absolute,
          design.layout.flex,
          design.layout.itemsCenter,
          design.layout.justifyCenter,
          design.interaction.pointerNone // Ignores pointer events to stop flicker
        ],
        style: { left: '0.35rem', width: '1rem', height: '1rem' }
      },
      checked
        ? svg(
            {
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': '2',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
              style: { width: '0.85rem', height: '0.85rem' }
            },
            polyline({ points: '20 6 9 17 4 12' })
          )
        : null
    ),
    ...children
  );
});

export const MenuRadioItem = pure((props, ...children) => {
  const { checked = false, disabled = false, onclick, class: className = '', ...rest } = props;

  return div(
    {
      'data-menu-item': 'true',
      class: [ITEM_BASE_CLASSES, className],
      style: getItemStyle(disabled),
      'aria-disabled': disabled ? 'true' : 'false',
      onclick: (e) => {
        if (!disabled && onclick) onclick(e);
      },
      ...applyItemPhysics(disabled),
      ...rest
    },
    span(
      {
        class: [
          design.layout.absolute,
          design.layout.flex,
          design.layout.itemsCenter,
          design.layout.justifyCenter,
          design.interaction.pointerNone // Ignores pointer events to stop flicker
        ],
        style: { left: '0.35rem', width: '1rem', height: '1rem' }
      },
      checked
        ? svg(
            {
              viewBox: '0 0 24 24',
              fill: 'currentColor',
              stroke: 'currentColor',
              'stroke-width': '2',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
              style: { width: '0.4rem', height: '0.4rem' }
            },
            circle({ cx: '12', cy: '12', r: '10' })
          )
        : null
    ),
    ...children
  );
});

// =========================================================
// GROUPS
// =========================================================

export const MenuGroup = pure((props, ...children) => div(props, ...children));
export const MenuRadioGroup = pure((props, ...children) => div(props, ...children));
