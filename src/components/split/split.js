import { component, html, signal } from '../../../giant.js';

const { div } = html;

/**
 * Two resizable panes (children[0] and children[1]) separated by a drag handle. Fills its positioned parent.
 * @param {string} [id] - When set, the dragged size is saved to localStorage under this key.
 * @param {'horizontal'|'vertical'} [direction='horizontal']
 * @param {number} [initialSplit=290] - Size of the first pane in px.
 * @param {number} [min=200]
 * @param {number} [max=600]
 * @param {{ value: boolean }} [isCollapsed] - A signal; while true one pane takes all the space.
 * @param {'left'|'right'} [collapseSide='right'] - The pane that collapses.
 */
export const SplitLayout = component.SplitLayout((props, ...children) => {
  const { id, direction = 'horizontal', initialSplit = 290, min = 200, max = 600, isCollapsed, collapseSide = 'right', ...rest } = props;

  const size = signal.size(() => (id && !globalThis.isServer && Number(localStorage.getItem(id))) || initialSplit);
  const dragging = signal.dragging(false);

  const horizontal = direction === 'horizontal';
  const collapsed = !!isCollapsed?.value;
  const leftCollapsed = collapsed && collapseSide === 'left';
  const rightCollapsed = collapsed && collapseSide === 'right';
  // panes animate their size, except while following the pointer
  const motion = dragging.value ? undefined : 'all';

  const onpointerdown = (e) => {
    e.preventDefault(); // no text selection while dragging
    dragging.value = true;
    e.target.setPointerCapture(e.pointerId);
  };

  const onpointermove = (e) => {
    if (!dragging.value) return;
    const box = e.target.parentElement.getBoundingClientRect();
    size.value = Math.min(max, Math.max(min, horizontal ? e.clientX - box.left : e.clientY - box.top));
  };

  const onpointerup = (e) => {
    if (!dragging.value) return;
    dragging.value = false;
    if (id) localStorage.setItem(id, size.value);
    e.target.releasePointerCapture(e.pointerId);
  };

  const pane = (flex, child) => div({ 'style-layout': 'stack', 'style-position': 'relative', 'style-overflow': 'hidden', 'style-motion': motion, style: { flex } }, child);

  return div(
    {
      'style-layout': horizontal ? 'row' : 'stack',
      'style-align': 'stretch',
      'style-position': 'absolute',
      'style-inset': 'fill',
      'style-overflow': 'hidden',
      ...rest
    },
    pane(`${rightCollapsed ? 1 : 0} 0 ${leftCollapsed ? 0 : size.value}px`, children[0]),
    div({
      role: 'separator',
      'aria-orientation': horizontal ? 'vertical' : 'horizontal',
      'style-interactive': 'drag',
      'style-layer': 'raised',
      'style-emphasis': dragging.value ? 'soft' : 'ghost',
      'style-motion': motion,
      'style-visibility': collapsed ? 'invisible' : undefined,
      inert: collapsed,
      // TODO(style): no vocabulary for resize cursors, a handle thickness or a hover tint on a non-button handle
      style: {
        cursor: horizontal ? 'ew-resize' : 'ns-resize',
        [horizontal ? 'inlineSize' : 'blockSize']: collapsed ? '0' : 'var(--space-xsmall)',
        [horizontal ? 'marginInlineStart' : 'marginBlockStart']: collapsed ? '0' : 'calc(-1 * var(--space-xsmall))'
      },
      onpointerdown,
      onpointermove,
      onpointerup,
      onpointercancel: onpointerup
    }),
    pane(`${rightCollapsed ? 0 : 1} 1 0px`, children[1])
  );
});
