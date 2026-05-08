import { component, html, design, signal } from '../../../giant.js';

const { div, img } = html;

export const Avatar = component.Avatar((props = {}, ...children) => {
  /**
   * Avatar Component
   *
   * @component
   * @description Circular avatar wrapper for image and fallback content.
   *
   * @prop {string} [class] - Additional classes.
   * @prop {object} [style] - Inline styles. Can override default width and height.
   */

  const { class: className = '', ...rest } = props;

  const classes = [
    design.layout.relative,
    design.layout.inlineFlex,
    design.layout.itemsCenter,
    design.layout.justifyCenter,
    design.layout.overflowHidden,
    design.shape.radiusRound,
    design.bg.bgMuted,
    className
  ];

  return div(
    {
      ...rest,
      class: classes,
      style: {
        width: '2.5rem',
        height: '2.5rem',
        flexShrink: 0,
        ...props.style
      }
    },
    ...children
  );
});

export const AvatarImage = component.AvatarImage((props = {}) => {
  /**
   * AvatarImage Component
   *
   * @component
   * @description Absolutely positioned avatar image that hides itself on load error.
   *
   * @prop {string} src - Image source URL.
   * @prop {string} [alt] - Accessible image description.
   * @prop {string} [class] - Additional classes.
   * @prop {object} [style] - Inline styles.
   */

  const { src, alt = '', class: className = '', ...rest } = props;

  const hasError = signal.hasError(false);
  const prevSrc = signal.prevSrc(src);

  if (prevSrc.value !== src) {
    hasError.value = false;
    prevSrc.value = src;
  }

  if (hasError.value) return null;

  const classes = [
    design.layout.absolute,
    design.layout.inset0,
    design.size.wFull,
    design.size.hFull,
    className
  ];

  return img({
    ...rest,
    src,
    alt,
    class: classes,
    style: {
      objectFit: 'cover',
      ...props.style
    },
    onerror: () => {
      hasError.value = true;
    }
  });
});

export const AvatarFallback = component.AvatarFallback((props = {}, ...children) => {
  /**
   * AvatarFallback Component
   *
   * @component
   * @description Centered fallback content shown behind the image or when image loading fails.
   *
   * @prop {string} [class] - Additional classes.
   * @prop {object} [style] - Inline styles.
   */

  const { class: className = '', ...rest } = props;

  const classes = [
    design.layout.flex,
    design.size.wFull,
    design.size.hFull,
    design.layout.itemsCenter,
    design.layout.justifyCenter,
    design.fg.fgMuted,
    className
  ];

  return div(
    {
      ...rest,
      class: classes,
      style: {
        fontWeight: '500',
        ...props.style
      }
    },
    ...children
  );
});
