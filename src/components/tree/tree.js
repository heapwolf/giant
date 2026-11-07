import { component, html } from '../../../giant.js';

const { div, span, svg, polyline } = html;

// Each part accepts the same (attributes?, ...children) arguments as the html factories.
const wrap = (factory, fn) => (...args) => {
  const { attributes, children } = factory(...args);
  return fn(attributes, children);
};

// the id stays on the host
export const Tree = component.Tree(({ id, ...props }, ...children) =>
  div({ role: 'tree', 'style-layout': 'stack', 'style-width': 'full', ...props }, ...children)
);

/**
 * A tree row. Clicking the caret calls onToggle, clicking elsewhere calls onclick.
 * @param {number} [depth=0] - Nesting level, indents the row.
 * @param {boolean} [selected=false]
 * @param {boolean} [disabled=false]
 * @param {boolean} [hasChildren=false] - Shows the caret and sets aria-expanded.
 * @param {boolean} [expanded=false]
 * @param {(e: Event) => void} [onToggle]
 */
// TODO(style): [role="treeitem"] is not in giant.css's interactive-state role list, so rows get no hover/press tint.
Tree.Item = wrap(div, ({ depth = 0, selected = false, disabled = false, hasChildren = false, expanded = false, onToggle, onclick, style = {}, ...rest }, children) => div(
  {
    'style-layout': 'row',
    'style-gap': 'small',
    'style-pad': 'small',
    'style-width': 'full',
    'style-radius': 'small',
    'style-text': 'small',
    'style-interactive': 'clickable',
    'style-emphasis': selected ? 'solid' : 'ghost',
    ...rest,
    'data-tree-item': 'true',
    role: 'treeitem',
    'aria-selected': String(selected),
    'aria-disabled': String(disabled),
    'aria-expanded': hasChildren ? String(expanded) : undefined,
    style: { paddingInlineStart: `calc(${depth} * var(--space-medium) + var(--space-small))`, ...style },
    onclick: (e) => {
      if (disabled) return;
      if (!e.target.closest('[data-tree-caret]')) return onclick?.(e);
      e.stopPropagation();
      onToggle?.(e);
    }
  },
  hasChildren
    ? svg(
      {
        'data-tree-caret': 'true',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '2.5',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'style-size': 'xsmall',
        'style-tone': selected ? undefined : 'muted',
        'style-motion': 'all',
        style: { rotate: expanded ? '90deg' : '0deg' }
      },
      polyline({ points: '9 18 15 12 9 6' })
    )
    : span({ 'style-size': 'xsmall' }),
  ...children
));

/** The children of an expanded item. @param {boolean} [expanded=false] */
Tree.Branch = wrap(div, ({ expanded = false, ...rest }, children) =>
  div({ 'style-layout': 'stack', 'style-width': 'full', ...rest, role: 'group', hidden: !expanded }, ...children));

// inert so clicks land on the row
Tree.Label = wrap(span, (attrs, children) =>
  span({ 'style-wrap': 'truncate', 'style-interactive': 'inert', ...attrs }, ...children));
