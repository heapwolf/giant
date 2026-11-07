/**
 * GIANT.JS
 * Build Date: 2026-11-07T18:06:39.776Z
 * Integrity: sha256-9f180e149349c34e421d14d09172ca0e1c9bac4e988075b6a67b50ea6dcefff6
 */

/** Design-system attributes, generated from giant.css. */
export interface StyleAttributes {
  'style-visibility'?: 'invisible' | 'hidden' | 'screen-reader';
  'style-layout'?: 'block' | 'inline-block' | 'stack' | 'row' | 'cluster' | 'inline' | 'center' | 'grid';
  'style-align'?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  'style-justify'?: 'start' | 'center' | 'end' | 'between' | 'around';
  'style-position'?: 'relative' | 'absolute' | 'fixed' | 'sticky';
  'style-inset'?: 'fill' | 'top' | 'bottom';
  'style-layer'?: 'base' | 'raised' | 'overlay' | 'modal' | 'top';
  'style-overflow'?: 'visible' | 'hidden' | 'auto' | 'clip';
  'style-gap'?: 'none' | 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  'style-pad'?: 'none' | 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  'style-pad-block'?: 'none' | 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  'style-pad-inline'?: 'none' | 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  'style-width'?: 'full' | 'fit' | 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  'style-max-width'?: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge' | 'prose';
  'style-max-height'?: 'small' | 'medium' | 'large' | 'screen';
  'style-size'?: 'xsmall' | 'small' | 'medium' | 'large';
  'style-flex'?: 'grow' | 'none';
  'style-height'?: 'full' | 'screen';
  'style-margin'?: 'none' | 'auto' | 'inline-auto';
  'style-ratio'?: 'square' | 'video';
  'style-radius'?: 'none' | 'small' | 'medium' | 'large' | 'round';
  'style-border'?: 'none' | 'thin' | 'thick' | 'dashed';
  'style-surface'?: 'base' | 'muted' | 'raised' | 'overlay' | 'scrim';
  'style-tone'?: 'neutral' | 'muted' | 'accent' | 'success' | 'warning' | 'danger';
  'style-emphasis'?: 'solid' | 'soft' | 'outline' | 'ghost' | 'link' | 'field' | 'knob';
  'style-divider'?: 'top' | 'bottom' | 'start' | 'end';
  'style-interactive'?: 'clickable' | 'drag' | 'static' | 'inert' | 'disabled' | 'precise';
  'style-text'?: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  'style-weight'?: 'regular' | 'medium' | 'semibold' | 'bold';
  'style-font'?: 'sans' | 'serif' | 'mono';
  'style-leading'?: 'tight' | 'normal' | 'loose';
  'style-tracking'?: 'tight' | 'normal' | 'wide';
  'style-case'?: 'upper' | 'lower' | 'title';
  'style-text-align'?: 'start' | 'center' | 'end';
  'style-wrap'?: 'nowrap' | 'truncate' | 'balance' | 'pretty' | 'pre' | 'pre-wrap' | 'anywhere';
  'style-decoration'?: 'none' | 'underline' | 'strike' | 'hover';
  'style-fit'?: 'cover' | 'contain';
  'style-motion'?: 'colors' | 'all' | 'fade-in' | 'spin' | 'slide-in' | 'fade-out' | 'slide-out';
}

/** Allowed values for each style-* attribute (keys omit the "style-" prefix). */
export declare const styles: {
  readonly 'visibility': readonly ['invisible', 'hidden', 'screen-reader'];
  readonly 'layout': readonly ['block', 'inline-block', 'stack', 'row', 'cluster', 'inline', 'center', 'grid'];
  readonly 'align': readonly ['start', 'center', 'end', 'stretch', 'baseline'];
  readonly 'justify': readonly ['start', 'center', 'end', 'between', 'around'];
  readonly 'position': readonly ['relative', 'absolute', 'fixed', 'sticky'];
  readonly 'inset': readonly ['fill', 'top', 'bottom'];
  readonly 'layer': readonly ['base', 'raised', 'overlay', 'modal', 'top'];
  readonly 'overflow': readonly ['visible', 'hidden', 'auto', 'clip'];
  readonly 'gap': readonly ['none', 'xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge'];
  readonly 'pad': readonly ['none', 'xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge'];
  readonly 'pad-block': readonly ['none', 'xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge'];
  readonly 'pad-inline': readonly ['none', 'xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge'];
  readonly 'width': readonly ['full', 'fit', 'small', 'medium', 'large', 'xlarge', 'xxlarge'];
  readonly 'max-width': readonly ['small', 'medium', 'large', 'xlarge', 'xxlarge', 'prose'];
  readonly 'max-height': readonly ['small', 'medium', 'large', 'screen'];
  readonly 'size': readonly ['xsmall', 'small', 'medium', 'large'];
  readonly 'flex': readonly ['grow', 'none'];
  readonly 'height': readonly ['full', 'screen'];
  readonly 'margin': readonly ['none', 'auto', 'inline-auto'];
  readonly 'ratio': readonly ['square', 'video'];
  readonly 'radius': readonly ['none', 'small', 'medium', 'large', 'round'];
  readonly 'border': readonly ['none', 'thin', 'thick', 'dashed'];
  readonly 'surface': readonly ['base', 'muted', 'raised', 'overlay', 'scrim'];
  readonly 'tone': readonly ['neutral', 'muted', 'accent', 'success', 'warning', 'danger'];
  readonly 'emphasis': readonly ['solid', 'soft', 'outline', 'ghost', 'link', 'field', 'knob'];
  readonly 'divider': readonly ['top', 'bottom', 'start', 'end'];
  readonly 'interactive': readonly ['clickable', 'drag', 'static', 'inert', 'disabled', 'precise'];
  readonly 'text': readonly ['xsmall', 'small', 'medium', 'large', 'xlarge', 'xxlarge'];
  readonly 'weight': readonly ['regular', 'medium', 'semibold', 'bold'];
  readonly 'font': readonly ['sans', 'serif', 'mono'];
  readonly 'leading': readonly ['tight', 'normal', 'loose'];
  readonly 'tracking': readonly ['tight', 'normal', 'wide'];
  readonly 'case': readonly ['upper', 'lower', 'title'];
  readonly 'text-align': readonly ['start', 'center', 'end'];
  readonly 'wrap': readonly ['nowrap', 'truncate', 'balance', 'pretty', 'pre', 'pre-wrap', 'anywhere'];
  readonly 'decoration': readonly ['none', 'underline', 'strike', 'hover'];
  readonly 'fit': readonly ['cover', 'contain'];
  readonly 'motion': readonly ['colors', 'all', 'fade-in', 'spin', 'slide-in', 'fade-out', 'slide-out'];
};

export interface VNode { readonly _type: string; toString(): string; }
export type Child = string | number | boolean | null | undefined | VNode | Node | ((...args: any[]) => any) | Child[];
export type Attributes = StyleAttributes & { class?: string | Array<string | false | null | undefined>; [attribute: string]: unknown };
export interface ElementFactory {
  (attributes: Attributes, ...children: Child[]): VNode;
  (...children: Child[]): VNode;
}

export declare function createRoot(Fn: any): any;
export declare function createElement(type: any, ...args: any[]): VNode;
export declare function component(Fn: any, tagName?: string): any;
export declare const html: Record<string, ElementFactory>;
export declare function match(p: Element | null, s?: string): Element | null;
