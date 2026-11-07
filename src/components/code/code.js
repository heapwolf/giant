import { component, signal, html } from '../../../giant.js';
import { Button } from '../button/button.js';

const { div, button, pre, span, svg, rect, path, polyline } = html;

// token patterns, each with the style-tone it is highlighted in
const PATTERNS = [
  [/\/\*[\s\S]*?\*\//g, 'muted'], // block comment
  [/(?:^|[^:\w])(\s*\/\/.*$)/gm, 'muted'], // line comment
  [/`[\s\S]*?`/g, 'success'],
  [/'[^'\n]*'/g, 'success'],
  [/"[^"\n]*"/g, 'success'],
  [/<\/?(?=[a-zA-Z])/g, 'muted'], // tag bracket
  [/(?<=<\/?)[a-zA-Z0-9-]+/g, 'warning'], // tag name
  [/\b[a-zA-Z-]+(?=\s*=)/g, 'warning'], // attribute name
  [/\b(abstract|async|await|boolean|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|false|finally|for|function|if|import|in|instanceof|let|new|null|return|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/g, 'accent'],
  [/\b\d+(\.\d+)?\b/g, 'warning'],
  [/[{}[\]().,:;<>+=\-*/%&|^!~?]/g, 'muted']
];

// → lines of { value, tone } tokens (tone undefined for plain text)
function highlight(code) {
  const lines = [[]];
  const push = (value, tone) => value.split('\n').forEach((part, i) => {
    if (i > 0) lines.push([]);
    if (part) lines[lines.length - 1].push({ value: part, tone });
  });

  let at = 0;
  while (at < code.length) {
    let best = null;
    for (const [regex, tone] of PATTERNS) {
      regex.lastIndex = at;
      const m = regex.exec(code);
      if (m && (!best || m.index < best.index)) best = { index: m.index, value: m[0], tone };
    }
    if (!best) {
      push(code.slice(at));
      break;
    }
    push(code.slice(at, best.index));
    push(best.value, best.tone);
    at = best.index + best.value.length;
  }
  return lines;
}

const ICON = { viewBox: '0 0 24 24', width: '14', height: '14', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
const COPY_ICON = () => svg(ICON, rect({ x: '9', y: '9', width: '13', height: '13', rx: '2', ry: '2' }), path({ d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }));
const CHECK_ICON = () => svg({ ...ICON, 'style-tone': 'success' }, polyline({ points: '20 6 9 17 4 12' }));

const ROW = { 'style-layout': 'row' };
const SHOUT = { 'style-case': 'upper', 'style-weight': 'bold' };

export const CodeView = component.CodeView((props = {}) => {
  // `tabs`, or one tab from `exampleCode`/`code` (+ `tab1Label`) and one from `componentCode` (+ `filename`)
  const code = props.exampleCode || props.code;
  let tabs = props.tabs?.length ? props.tabs : [
    code && { label: props.tab1Label || 'Example Code', code },
    props.componentCode && { label: props.filename || 'component.js', code: props.componentCode }
  ].filter(Boolean);
  if (!tabs.length) tabs = [{ label: 'Code', code: '// No code provided' }];

  const activeTab = signal.activeTabIndex(0);
  const expanded = signal.expanded(false);
  const copied = signal.copied(false);

  const active = Math.min(activeTab.value, tabs.length - 1);
  const raw = tabs[active].code.trimEnd();
  const lines = highlight(raw);
  const expandable = lines.length > 15;
  const isExpanded = expanded.value || !expandable;

  const copy = () => navigator.clipboard.writeText(raw).then(() => {
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  });

  return div(
    { 'style-position': 'relative', 'style-overflow': 'hidden', 'style-border': 'thin', 'style-radius': 'medium', 'style-surface': 'base' },
    div(
      { ...ROW, 'style-justify': 'between', 'style-pad-inline': 'medium', 'style-divider': 'bottom' },
      div(
        { ...ROW, 'style-gap': 'large' },
        ...tabs.map((tab, idx) => button({
          key: `tab-${idx}`,
          type: 'button',
          'data-state': idx === active ? 'active' : 'inactive',
          'style-tone': idx === active ? 'neutral' : 'muted',
          'style-emphasis': 'ghost',
          'style-font': 'mono',
          'style-case': 'upper',
          'style-text': 'small',
          'style-tracking': 'wide',
          'style-weight': idx === active ? 'bold' : 'regular',
          'style-pad-block': 'small',
          'style-motion': 'colors',
          onclick: () => {
            activeTab.value = idx;
            expanded.value = false;
          }
        }, tab.label))
      ),
      div(
        { ...ROW, 'style-gap': 'small' },
        expandable ? Button({
          variant: 'ghost', size: 'sm', 'style-tone': 'muted', ...SHOUT,
          onclick: () => { expanded.value = !expanded.value; }
        }, isExpanded ? 'Collapse' : 'Expand') : null,
        Button({ variant: 'ghost', size: 'icon', 'style-tone': 'muted', 'aria-label': 'Copy code', onclick: copy },
          copied.value ? CHECK_ICON() : COPY_ICON())
      )
    ),
    div(
      { 'style-position': 'relative', 'style-overflow': 'hidden', 'style-max-height': isExpanded ? undefined : 'medium' },
      pre(
        { 'style-font': 'mono', 'style-text': 'small', 'style-margin': 'none', 'style-pad': 'large', 'style-overflow': 'auto' },
        lines.map((tokens, idx) => div(
          { key: idx, ...ROW, 'style-align': 'start', 'style-gap': 'large' },
          span(
            // TODO(style): no gutter width; a narrow `style-width` step (2rem) would replace this.
            { 'style-tone': 'muted', 'style-interactive': 'static', 'style-text-align': 'end', 'style-flex': 'none', style: { width: '2rem' } },
            String(idx + 1)
          ),
          span({ 'style-wrap': 'pre' },
            ...tokens.map((t, i) => span({ key: i, 'style-tone': t.tone }, t.value)))
        ))
      ),
      isExpanded ? null : div(
        {
          ...ROW,
          'style-position': 'absolute',
          'style-inset': 'bottom',
          'style-width': 'full',
          'style-justify': 'center',
          'style-align': 'end',
          'style-pad-block': 'large',
          // TODO(style): no fade surface or fixed height; a `style-surface="fade"` would replace this.
          style: { height: '120px', background: 'linear-gradient(to bottom, transparent, var(--bg) 90%)' }
        },
        Button({
          variant: 'outline', size: 'sm', 'style-surface': 'raised', ...SHOUT,
          onclick: () => { expanded.value = true; }
        }, 'Show full code')
      )
    )
  );
});
