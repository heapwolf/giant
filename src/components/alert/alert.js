import { component, html, signal } from '../../../giant.js';

const { div, button, h5, p, svg, path, circle, line } = html;

const VARIANTS = {
  default: { 'style-tone': 'neutral', 'style-emphasis': 'outline' },
  info: { 'style-tone': 'accent', 'style-emphasis': 'soft' },
  success: { 'style-tone': 'success', 'style-emphasis': 'soft' },
  warning: { 'style-tone': 'warning', 'style-emphasis': 'soft' },
  destructive: { 'style-tone': 'danger', 'style-emphasis': 'soft' },
};

const ICONS = {
  success: () => [path({ d: 'm9 12 2 2 4-4' })],
  destructive: () => [line({ x1: '15', y1: '9', x2: '9', y2: '15' }), line({ x1: '9', y1: '9', x2: '15', y2: '15' })],
  info: () => [path({ d: 'M12 16v-4' }), path({ d: 'M12 8h.01' })],
};

const icon = (variant) => svg(
  {
    width: '18', height: '18', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'style-flex': 'none'
  },
  circle({ cx: '12', cy: '12', r: '10' }),
  ...(ICONS[variant] || ICONS.info)()
);

export const Alert = component.Alert((props = {}, ...children) => {
  /**
   * Alert with variants and an API: show, hide, toggle, update({ title, description, variant, icon }), flash(ms), destroy.
   * `isOpen` and `variant` props win over the API whenever they change.
   */
  const {
    isOpen, defaultIsOpen = true, variant, title = '', description = '', icon: customIcon = null,
    dismissible = false, onClose, ...rest
  } = props;

  const open = signal.isOpen(isOpen ?? defaultIsOpen);
  const prevIsOpen = signal.prevIsOpen(isOpen);
  const variantSignal = signal.variant(variant || 'default');
  const prevVariant = signal.prevVariant(variant);
  const titleSignal = signal.title(title);
  const descriptionSignal = signal.description(description);
  const iconSignal = signal.icon(customIcon);
  const destroyed = signal.isDestroyed(false);
  const flashTimer = signal.flashTimer(null);

  if (isOpen !== undefined && isOpen !== prevIsOpen.value) open.value = prevIsOpen.value = isOpen;
  if (variant !== undefined && variant !== prevVariant.value) variantSignal.value = prevVariant.value = variant;

  const show = () => { open.value = true; };
  const hide = () => {
    open.value = false;
    onClose?.();
  };
  const toggle = () => (open.value ? hide() : show());
  const update = (config = {}) => {
    if (config.title !== undefined) titleSignal.value = config.title;
    if (config.description !== undefined) descriptionSignal.value = config.description;
    if (config.variant !== undefined) variantSignal.value = config.variant;
    if (config.icon !== undefined) iconSignal.value = config.icon;
  };
  const flash = (ms = 3000) => {
    clearTimeout(flashTimer.value);
    show();
    flashTimer.value = setTimeout(hide, ms);
  };
  const destroy = () => {
    hide();
    destroyed.value = true;
  };
  const api = [show, hide, toggle, update, flash, destroy];

  if (destroyed.value || !open.value) return [...api, div({ hidden: true, 'aria-hidden': 'true' })];

  return [
    ...api,
    div(
      {
        'style-layout': 'row',
        'style-align': 'start',
        'style-gap': 'medium',
        'style-pad': 'medium',
        'style-radius': 'medium',
        'style-border': 'thin',
        'style-width': 'full',
        ...(VARIANTS[variantSignal.value] || VARIANTS.default),
        role: 'alert',
        'aria-live': variantSignal.value === 'destructive' ? 'assertive' : 'polite',
        'aria-atomic': 'true',
        ...rest
      },
      iconSignal.value || icon(variantSignal.value),
      div(
        { 'style-layout': 'stack', 'style-gap': 'xsmall', 'style-flex': 'grow' },
        titleSignal.value && AlertTitle(titleSignal.value),
        descriptionSignal.value && AlertDescription(descriptionSignal.value),
        ...children
      ),
      dismissible ? button({
        type: 'button',
        'style-tone': 'muted',
        'style-emphasis': 'ghost',
        'style-radius': 'small',
        'style-text': 'large',
        'style-leading': 'tight',
        'aria-label': 'Close alert',
        onclick: hide
      }, '×') : null
    )
  ];
});

export const AlertTitle = component.AlertTitle((props = {}, ...children) => h5({
  'style-margin': 'none',
  'style-text': 'medium',
  'style-weight': 'medium',
  'style-leading': 'tight',
  'style-tracking': 'tight',
  ...props
}, ...children));

export const AlertDescription = component.AlertDescription((props = {}, ...children) => p({
  'style-margin': 'none',
  'style-text': 'small',
  'style-tone': 'muted',
  ...props
}, ...children));
