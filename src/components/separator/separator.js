import { component, html, design } from '../../../giant.js';

const { div } = html;

export const Separator = component.Separator((props) => {
  /**
   * Separator Component
   *
   * @component
   * @description A thin divider line used to separate content, supporting horizontal and vertical orientations.
   *
   * @prop {string} [orientation=horizontal] - Direction of the separator (`horizontal` or `vertical`).
   * @prop {boolean} [decorative=true] - If true, hides the separator from assistive technologies.
   * @prop {string} [class] - Additional classes.
   * @prop {object} [style] - Inline styles.
   */

  const {
    orientation = 'horizontal',
    decorative = true,
    class: className = '',
    style = {},
    ...rest
  } = props;

  const BASE_CLASSES = [
    design.misc.block,
    design.bg.bgMuted,
    orientation === 'horizontal' ? design.size.wFull : design.size.hFull
  ];

  const dimensions = orientation === 'horizontal'
    ? { height: '1px' }
    : { width: '1px' };

  return div({
    ...rest,
    class: [BASE_CLASSES, className],
    style: {
      flexShrink: 0,
      ...dimensions,
      ...style
    },
    role: decorative ? 'none' : 'separator',
    'aria-orientation': decorative ? undefined : orientation,
    'data-orientation': orientation
  });
});
