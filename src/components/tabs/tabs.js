import { component, html, signal } from '../../../giant.js';

const { div, button } = html;

/**
 * Tabs root (controlled via `value` + `onValueChange`, or uncontrolled via `defaultValue`).
 * The host exposes setTab(value), getTab(), nextTab() and prevTab().
 * @param {'horizontal'|'vertical'} [props.orientation='horizontal']
 */
export const Tabs = component.Tabs((props, ...children) => {
  const { value, defaultValue, onValueChange, orientation = 'horizontal', ...rest } = props;
  const vertical = orientation === 'vertical';

  const activeTab = signal.activeTab(value !== undefined ? value : defaultValue);
  const prevValue = signal._prevValue(value);

  if (value !== undefined && value !== prevValue.value) {
    activeTab.value = value;
    prevValue.value = value;
  }

  const tabValues = [];
  const isActive = (val) => activeTab.value != null && String(activeTab.value) === String(val);

  // controlled tabs only report the change; the parent updates `value`
  const setTab = (val) => {
    if (val == null) return;
    if (value === undefined) activeTab.value = val;
    onValueChange?.(val);
  };

  // without a defaultValue, the first trigger becomes active
  const register = (val) => {
    if (val == null || tabValues.includes(val)) return;
    tabValues.push(val);
    if (value === undefined && (activeTab.value == null || activeTab.value === '')) activeTab.value = val;
  };

  // moves by `delta`, wrapping around the ends
  const step = (delta) => {
    const n = tabValues.length;
    if (!n) return;
    const i = tabValues.findIndex(isActive);
    setTab(tabValues[i === -1 ? (delta > 0 ? 0 : n - 1) : (i + delta + n) % n]);
  };

  const stateFor = (type, val) => {
    if (type === 'list') return { 'style-layout': vertical ? 'stack' : 'inline' };
    const active = isActive(val);
    const shared = { 'data-state': active ? 'active' : 'inactive', tabindex: active ? '0' : '-1' };
    if (type === 'content') return { ...shared, hidden: !active };
    return {
      ...shared,
      'aria-selected': String(active),
      'style-tone': active ? 'neutral' : 'muted',
      'style-emphasis': active ? 'soft' : 'ghost'
    };
  };

  // Injects the active state into tab lists, triggers and panels: real DOM nodes on the client, VNodes otherwise.
  // Stops at a nested Tabs root, which syncs its own parts.
  const syncNode = (node) => {
    if (Array.isArray(node)) return node.map(syncNode);
    if (node?.nodeType === 1) {
      const type = node.getAttribute('data-tab-type');
      const val = node.getAttribute('data-value');
      if (type === 'root') return node;

      if (type) {
        if (type === 'trigger') register(val);
        for (const [k, v] of Object.entries(stateFor(type, val))) {
          if (k === 'hidden') node.hidden = v;
          else node.setAttribute(k, v);
        }
        if (type === 'trigger' && !node._hasTabClick) {
          node._hasTabClick = true;
          node.addEventListener('click', () => { if (!node.disabled) setTab(val); });
        }
      }

      Array.from(node.children).forEach((child) => syncNode(child));
      return node;
    }

    if (!node?._type) return node;
    if (node._type === '#dom') {
      if (node.node) syncNode(node.node);
      return node;
    }

    const attributes = { ...node.attributes };
    const { 'data-tab-type': type, 'data-value': val, onclick } = attributes;
    if (type === 'root') return node;

    if (type === 'trigger') {
      register(val);
      attributes.onclick = (e) => {
        if (attributes.disabled) return;
        setTab(val);
        onclick?.(e);
      };
    }
    if (type) Object.assign(attributes, stateFor(type, val));

    return { ...node, attributes, children: node.children?.map((child) => syncNode(child)) };
  };

  return [
    { setTab, getTab: () => activeTab.value, nextTab: () => step(1), prevTab: () => step(-1) },
    div(
      {
        'style-layout': vertical ? 'row' : 'stack',
        'style-align': vertical ? 'start' : undefined,
        'style-gap': vertical ? 'medium' : undefined
      },
      rest,
      { 'data-orientation': orientation, 'data-tab-type': 'root' },
      ...children.map((child) => syncNode(child))
    )
  ];
});

export const TabsList = component.TabsList((props, ...children) => div(
  { 'style-layout': 'inline', 'style-gap': 'xsmall', 'style-pad': 'xsmall', 'style-surface': 'muted', 'style-radius': 'medium' },
  props,
  { role: 'tablist', 'data-tab-type': 'list' },
  ...children
));

// Tone/emphasis follow the active state (set by Tabs); role="tab" + style-emphasis gives hover, focus and disabled styling.
export const TabsTrigger = component.TabsTrigger(({ value, ...rest }, ...children) => button(
  {
    'style-layout': 'inline',
    'style-pad-block': 'xsmall',
    'style-pad-inline': 'small',
    'style-radius': 'small',
    'style-tone': 'muted',
    'style-emphasis': 'ghost',
    'style-text': 'small',
    'style-weight': 'medium',
    'style-wrap': 'nowrap'
  },
  rest,
  { type: 'button', role: 'tab', 'data-tab-type': 'trigger', 'data-value': value },
  ...children
));

export const TabsContent = component.TabsContent(({ value, ...rest }, ...children) => div(
  { 'style-pad-block': 'small' },
  rest,
  { role: 'tabpanel', 'data-tab-type': 'content', 'data-value': value },
  ...children
));
