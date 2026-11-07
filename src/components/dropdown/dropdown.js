import { component, html, signal } from '../../../giant.js';

const { div, button, span, input, svg, path } = html;

const icon = (d, attributes) => svg({
  viewBox: '0 0 24 24', width: '16', height: '16', fill: 'none', stroke: 'currentColor',
  'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...attributes
}, path({ d }));

const getNodeText = (node) => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node !== 'object') return String(node);
  if (node.nodeType) return node.textContent || '';
  if (node._type === '#text') return node.attributes?.text || '';
  return Array.from(node.children || []).map(getNodeText).join('');
};

// TODO(style): no start-only padding; items and labels leave room for the selection indicator
const INDENT = { paddingInlineStart: 'var(--space-xlarge)' };

const TRIGGER = {
  'style-layout': 'row',
  'style-justify': 'between',
  'style-gap': 'small',
  'style-width': 'full',
  'style-pad-inline': 'medium',
  'style-radius': 'small',
  'style-leading': 'tight'
};

const SIZES = { sm: 'xsmall', md: 'small', lg: 'medium' };

const VARIANTS = {
  default: { 'style-emphasis': 'field', 'style-border': 'thin', 'style-surface': 'raised' },
  ghost: { 'style-emphasis': 'ghost' }
};

const CONTENT = {
  'style-position': 'absolute',
  'style-layer': 'overlay',
  'style-layout': 'stack',
  'style-width': 'full',
  'style-max-height': 'medium',
  'style-overflow': 'auto',
  'style-pad': 'xsmall',
  'style-surface': 'overlay',
  'style-border': 'thin',
  'style-radius': 'medium',
  'style-motion': 'slide-in',
  // TODO(style): no anchor placement (below the trigger)
  style: { top: 'calc(100% + var(--space-xsmall))' }
};

const ITEM = {
  'style-position': 'relative',
  'style-layout': 'row',
  'style-pad-block': 'xsmall',
  'style-pad-inline': 'small',
  'style-radius': 'small',
  'style-text': 'small',
  'style-tone': 'neutral',
  'style-emphasis': 'ghost',
  style: INDENT
};

const INDICATOR = {
  'data-select-indicator': 'true',
  'style-position': 'absolute',
  'style-visibility': 'invisible',
  'style-motion': 'all',
  // TODO(style): no inline-start inset
  style: { insetInlineStart: 'var(--space-small)' }
};

const LABEL = {
  'style-pad-block': 'xsmall',
  'style-pad-inline': 'medium',
  'style-text': 'small',
  'style-weight': 'semibold',
  'style-tone': 'muted',
  style: INDENT
};

export const Dropdown = component.Dropdown(function (props, ...children) {
  const {
    value,
    defaultValue,
    multiple = false,
    onValueChange,
    disabled = false,
    invalid = false,
    variant = 'default',
    size = 'md',
    name,
    id,
    placeholder = 'Select...',
    ...rest
  } = props;

  const toValue = (v) => (multiple ? (Array.isArray(v) ? v : v ? [v] : []) : v || '');

  const rootId = signal.id(id || `dropdown-${Math.random().toString(36).slice(2, 9)}`).value;
  const isOpen = signal.isOpen(false);
  const selected = signal.selectedValue(toValue(value !== undefined ? value : defaultValue));
  const prevValue = signal._prevValueProp(value);

  if (value !== undefined && value !== prevValue.value) {
    selected.value = toValue(value);
    prevValue.value = value;
  }

  const isSelected = (val) => (multiple ? selected.value.includes(String(val)) : String(val) === String(selected.value));

  const open = () => { if (!disabled) isOpen.value = true; };
  const close = () => { isOpen.value = false; };
  const toggle = () => { if (!disabled) isOpen.value = !isOpen.value; };
  const getValue = () => selected.value;
  const setValue = (next) => { selected.value = toValue(next); };

  // Close on any click outside. The render signal removes the listener on the next render (or close).
  if (isOpen.value && this.signal) {
    const { signal: abort } = this;
    setTimeout(() => document.addEventListener('click', (e) => {
      if (!e.composedPath().includes(this)) close();
    }, { signal: abort }));
  }

  const handleRootClick = (e) => {
    const option = e.target.closest('[role="option"]');
    if (!option || option.getAttribute('aria-disabled') === 'true') return;

    const itemValue = option.getAttribute('data-value');
    if (multiple) {
      const rest = selected.value.filter((v) => v !== itemValue);
      selected.value = rest.length < selected.value.length ? rest : [...selected.value, itemValue];
    } else {
      selected.value = itemValue;
      isOpen.value = false;
    }
    onValueChange?.(selected.value, e);
  };

  const items = children.filter(Boolean);

  const selectedTexts = [];
  const collect = (nodes) => {
    for (const node of Array.from(nodes || [])) {
      if (!node || typeof node !== 'object') continue;
      const val = node.nodeType === 1 ? node.getAttribute('data-value') : node.attributes?.['data-value'] ?? node.attributes?.value;
      if (val == null) collect(node.children);
      else if (isSelected(val)) selectedTexts.push(getNodeText(node).trim());
    }
  };
  collect(items);

  const label = selectedTexts.join(', ') ||
    (multiple ? (selected.value.length ? `${selected.value.length} selected` : '') : selected.value);

  if (isOpen.value) {
    queueMicrotask(() => {
      const content = document.getElementById(`${rootId}-content`);
      if (!content) return;

      const options = [...content.querySelectorAll('[role="option"]')];
      for (const opt of options) {
        const on = isSelected(opt.getAttribute('data-value'));
        opt.setAttribute('aria-selected', String(on));
        const indicator = opt.querySelector('[data-select-indicator]');
        if (on) indicator?.removeAttribute('style-visibility');
        else indicator?.setAttribute('style-visibility', 'invisible');
      }

      // scroll the selected item to the middle of the list
      const target = options.find((opt) => opt.getAttribute('aria-selected') === 'true') || options[0];
      if (target) content.scrollTop = target.offsetTop - (content.offsetHeight - target.offsetHeight) / 2;
    });
  }

  return [
    open, close, toggle, getValue, setValue,

    div(
      { 'style-position': 'relative', 'style-layout': 'inline-block', 'style-width': 'full', 'style-interactive': 'static' },
      rest,
      { id: rootId, onclick: handleRootClick },
      button(
        TRIGGER,
        VARIANTS[variant] || VARIANTS.default,
        {
          'style-pad-block': SIZES[size] || SIZES.md,
          'style-tone': invalid && variant !== 'ghost' ? 'danger' : undefined,
          'aria-invalid': invalid ? 'true' : undefined,
          id: `${rootId}-trigger`,
          type: 'button',
          role: 'combobox',
          'aria-expanded': String(isOpen.value),
          'aria-haspopup': 'listbox',
          disabled,
          // disabled cursor/opacity come from style-emphasis + :disabled
          'style-interactive': disabled ? undefined : 'clickable',
          onclick: toggle
        },
        span({ 'style-tone': label ? undefined : 'muted', 'style-text-align': 'start', 'style-wrap': 'truncate' }, label || placeholder),
        icon('m6 9 6 6 6-6', { 'aria-hidden': 'true', 'style-tone': 'muted', 'style-motion': 'all', style: { rotate: isOpen.value ? '180deg' : '0deg' } })
      ),
      isOpen.value
        ? div(CONTENT, {
            id: `${rootId}-content`,
            role: 'listbox',
            'aria-labelledby': `${rootId}-trigger`,
            'aria-multiselectable': multiple ? 'true' : undefined
          }, ...items)
        : null,
      ...(name ? [].concat(selected.value).map((v) => input({ type: 'hidden', name, value: v })) : [])
    )
  ];
});

Dropdown.Item = (...args) => {
  const { attributes: { value, disabled, ...rest }, children } = div(...args);
  return div(
    ITEM,
    rest,
    { role: 'option', 'data-value': value, 'aria-disabled': disabled ? 'true' : undefined },
    span(INDICATOR, icon('M20 6 9 17l-5-5')),
    ...children
  );
};

Dropdown.ItemText = (...args) => span(...args);
Dropdown.ItemIndicator = (...args) => span(INDICATOR, ...args);
Dropdown.Label = (...args) => div(LABEL, ...args);
Dropdown.Group = (...args) => div(...args, { role: 'group' });
Dropdown.Separator = (...args) => div({ 'style-pad-block': 'xsmall' }, ...args, { role: 'separator' }, div({ 'style-divider': 'top' }));
