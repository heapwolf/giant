import { component, html, design } from '../../../giant.js';

export const Text = component.Text((props = {}, ...children) => {
  /**
   * Text
   *
   * Polymorphic typography component for semantic text with design tokens.
   *
   * @prop {string} [as=p] - HTML tag to render, such as p, span, label, h1, h2, or small.
   * @prop {string} [size=size2] - Typography size token key from design.typography.
   * @prop {string} [weight=weightRegular] - Typography weight token key from design.typography.
   * @prop {'start'|'center'|'end'} [align] - Text alignment alias.
   * @prop {'tight'|'snug'|'normal'|'loose'} [leading] - Line-height alias.
   * @prop {'tight'|'normal'|'wide'} [tracking] - Letter-spacing alias.
   * @prop {'uppercase'|'lowercase'|'capitalize'} [transform] - Text transform alias.
   * @prop {'none'|'underline'|'line-through'} [decoration] - Text decoration alias.
   * @prop {'ltr'|'rtl'|'auto'} [dir] - Text direction attribute.
   * @prop {'fg'|'primary'|'secondary'|'muted'|'subtle'|'destructive'|'danger'|'warning'|'success'|'inverse'|'action'|'accent'|string} [color=fg] - Foreground color alias, design.fg key, or raw class token.
   * @prop {'overflowTruncate'|'overflowWrap'|'balance'|'pretty'|string} [wrap] - Text wrapping or overflow token.
   * @prop {string|string[]|Object} [class] - Additional classes.
   */

  const {
    as = 'p',
    size = 'size2',
    weight = 'weightRegular',
    align,
    leading,
    tracking,
    transform,
    decoration,
    color = 'fg',
    wrap,
    dir,
    class: customClass = '',
    ...rest
  } = props;

  const Tag = html[as] || html.p;

  const colorMap = {
    fg: design.fg.fg,
    primary: design.fg.fg,
    secondary: design.fg.fgMuted,
    muted: design.fg.fgMuted,
    subtle: design.fg.fgSubtle,
    destructive: design.fg.dangerFg,
    danger: design.fg.dangerFg,
    warning: design.fg.warningFg,
    success: design.fg.successFg,
    inverse: design.fg.inverseFg,
    action: design.fg.actionFg,
    accent: design.fg.accentFg
  };

  const toCamelCase = (str) => str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

  const toTokenName = (prefix, value) => {
    if (!value) return undefined;
    const camelValue = toCamelCase(value);
    return `${prefix}${camelValue.charAt(0).toUpperCase()}${camelValue.slice(1)}`;
  };

  return Tag(
    {
      ...rest,
      dir,
      class: [
        design.typography[size],
        design.typography[weight],
        align && design.typography[toTokenName('align', align)],
        leading && design.typography[toTokenName('line', leading)],
        tracking && design.typography[toTokenName('letter', tracking)],
        transform && design.typography[toTokenName('transform', transform)],
        decoration && design.typography[toTokenName('decoration', decoration)],
        wrap && (design.typography[wrap] || wrap),
        colorMap[color] || design.fg[color] || color,
        customClass
      ]
    },
    ...children
  );
});
