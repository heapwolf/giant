import { component, html, design } from '../../../giant.js';

const { div, h3, p } = html;

export const Card = component.Card((props, ...children) => {
  /**
   * @function Card
   * @description Container component for grouping content with a border and shadow.
   * @prop {string} [class] - Additional CSS classes
   */
  const { class: customClass = '', style = {}, ...rest } = props;

  return div(
    {
      ...rest,
      class: [
        design.shape.radius3,
        design.shape.border1,
        design.border.border,
        design.bg.bgSurface,
        design.fg.fg,
        design.effect.shadow1,
        customClass
      ],
      style: { borderStyle: 'solid', ...style }
    },
    ...children
  );
});

export const CardHeader = component.CardHeader((props, ...children) => {
  /**
   * @function CardHeader
   * @description Vertical container for CardTitle and CardDescription.
   */
  const { class: customClass = '', style = {}, ...rest } = props;
  return div({
    ...rest,
    class: [
      design.layout.flex,
      design.spacing.p5,
      design.spacing.gap2,
      customClass
    ],
    style: { flexDirection: 'column', ...style }
  }, ...children);
});

export const CardTitle = component.CardTitle((props, ...children) => {
  /**
   * @function CardTitle
   * @description Heading element for the Card.
   */
  const { class: customClass = '', ...rest } = props;
  return h3({
    ...rest,
    class: [
      design.typography.weightSemibold,
      design.typography.lineTight,
      design.spacing.m0,
      customClass
    ]
  }, ...children);
});

export const CardDescription = component.CardDescription((props, ...children) => {
  /**
   * @function CardDescription
   * @description Sub-text for the Card.
   */
  const { class: customClass = '', ...rest } = props;
  return p({
    ...rest,
    class: [
      design.typography.size1,
      design.fg.fgMuted,
      design.spacing.m0,
      customClass
    ]
  }, ...children);
});

export const CardContent = component.CardContent((props, ...children) => {
  /**
   * @function CardContent
   * @description Main body container for Card content.
   */
  const { class: customClass = '', style = {}, ...rest } = props;
  return div({
    ...rest,
    class: [
      design.spacing.p5,
      customClass
    ],
    style: { paddingTop: 0, ...style }
  }, ...children);
});

export const CardFooter = component.CardFooter((props, ...children) => {
  /**
   * @function CardFooter
   * @description Bottom container for Card actions.
   */
  const { class: customClass = '', style = {}, ...rest } = props;
  return div({
    ...rest,
    class: [
      design.layout.flex,
      design.layout.itemsCenter,
      design.spacing.p5,
      design.spacing.gap2,
      customClass
    ],
    style: { paddingTop: 0, ...style }
  }, ...children);
});
