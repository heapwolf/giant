import { component, design, signal, html } from '../../../giant.js'; // Adjust imports as necessary for your env
import { Button } from '../button/button.js';

const { div, button, pre, span, svg, rect, path, polyline } = html;

const languages = {
  default: [
    { regex: /\/\*[\s\S]*?\*\//g, type: 'comment' }, // Multi-line comments
    { regex: /(?:^|[^:\w])(\s*\/\/.*$)/gm, type: 'comment' }, // Single line comments
    { regex: /`[\s\S]*?`/g, type: 'string' }, // Multi-line template literals
    { regex: /'[^'\n]*'/g, type: 'string' },
    { regex: /"[^"\n]*"/g, type: 'string' },
    { regex: /<[^>]*>/g, type: 'bracket' },
    { regex: /\b(abstract|async|await|boolean|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|false|finally|for|function|if|import|in|instanceof|let|new|null|return|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/g, type: 'keyword' },
    { regex: /\b\d+(\.\d+)?\b/g, type: 'number' }, // Added numbers
    { regex: /[{}[\]().,:;<>+=\-*/%&|^!~?]/g, type: 'symbol' }
  ]
};

const syntaxColors = {
  comment: 'var(--color-fg-muted)',
  string: 'var(--color-success-4)',
  keyword: 'var(--color-accent-2)',
  bracket: 'var(--color-warning-4)',
  symbol: 'var(--color-neutral-4)',
  number: 'var(--color-warning-3)',
  text: 'var(--color-fg)'
};

function tokenize(codeStr, lang = 'default') {
  const patterns = languages[lang] || languages.default;
  const tokens = [];
  let lastIndex = 0;

  while (lastIndex < codeStr.length) {
    let closestMatch = null;
    let closestIndex = codeStr.length;

    patterns.forEach(pattern => {
      pattern.regex.lastIndex = lastIndex;
      const match = pattern.regex.exec(codeStr);
      if (match && match.index < closestIndex) {
        closestMatch = { value: match[0], type: pattern.type, index: match.index };
        closestIndex = match.index;
      }
    });

    if (closestMatch) {
      if (closestMatch.index > lastIndex) {
        tokens.push({ value: codeStr.slice(lastIndex, closestMatch.index), type: 'text' });
      }
      tokens.push({ value: closestMatch.value, type: closestMatch.type });
      lastIndex = closestMatch.index + closestMatch.value.length;
    } else {
      tokens.push({ value: codeStr.slice(lastIndex), type: 'text' });
      break;
    }
  }
  return tokens;
}

function parseCodeLines(codeStr, lang = 'default') {
  const tokens = tokenize(codeStr, lang);
  const lines = [[]];

  for (const token of tokens) {
    const parts = token.value.split('\n');
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) lines.push([]); // Create a new line array for each \n
      if (parts[i]) {
        lines[lines.length - 1].push({ value: parts[i], type: token.type });
      }
    }
  }
  return lines;
}

export const CodeView = component.CodeView((props) => {
  const tabs = props.tabs || [];
  if (tabs.length === 0) {
    if (props.exampleCode || props.code) {
      tabs.push({ label: props.tab1Label || 'Example Code', code: props.exampleCode || props.code });
    }
    if (props.componentCode) {
      tabs.push({ label: props.filename || 'component.js', code: props.componentCode });
    }
  }

  // Fallback if empty
  if (tabs.length === 0) tabs.push({ label: 'Code', code: '// No code provided' });

  // --- STATE INITIALIZATION ---
  const activeTabIndex = signal.activeTabIndex(0);
  const expanded = signal.expanded(false);
  const copied = signal.copied(false);

  // Ensure index is within bounds (in case props change dynamically)
  const activeIndex = Math.min(activeTabIndex.value, tabs.length - 1);
  const activeTab = tabs[activeIndex];
  const rawCode = activeTab.code.trimEnd(); // Remove trailing empty lines

  // Use the robust multi-line parser
  const parsedLines = parseCodeLines(rawCode);

  const isExpandable = parsedLines.length > 15;
  const isExpanded = expanded.value || !isExpandable;

  const CopyIcon = svg({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', style: { width: '14px', height: '14px' } }, rect({ x: '9', y: '9', width: '13', height: '13', rx: '2', ry: '2' }), path({ d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' }));
  const CheckIcon = svg({ viewBox: '0 0 24 24', fill: 'none', stroke: 'var(--color-success-3)', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', style: { width: '14px', height: '14px' } }, polyline({ points: '20 6 9 17 4 12' }));

  const handleCopy = () => {
    navigator.clipboard.writeText(rawCode).then(() => {
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    });
  };

  return div(
    {
      class: [design.layout.relative],
      style: {
        border: 'var(--shape-border-width-1) solid var(--color-border)',
        overflow: 'hidden',
        backgroundColor: 'var(--color-bg)',
        borderRadius: 'var(--shape-radius-2)' // Added subtle rounding
      }
    },
    // Header Row with Dynamic Tabs
    div(
      {
        class: [design.layout.flex, design.layout.itemsCenter],
        style: {
          justifyContent: 'space-between',
          padding: '0 var(--layout-space-4)',
          borderBottom: 'var(--shape-border-width-1) solid var(--color-border)',
          backgroundColor: 'var(--color-bg-muted)'
        }
      },
      // Left Side: Dynamic Tabs Mapping
      div(
        { class: [design.layout.flex, design.layout.itemsCenter], style: { gap: 'var(--layout-space-5)' } },
        ...tabs.map((tab, idx) => {
          const isActive = activeIndex === idx;
          return button({
            key: `tab-${idx}`,
            class: [design.typography.fontMono, design.typography.transformUppercase],
            style: {
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 'var(--typography-size-1)',
              color: isActive ? 'var(--color-fg)' : 'var(--color-fg-muted)',
              fontWeight: isActive ? 'var(--typography-weight-bold)' : 'var(--typography-weight-regular)',
              letterSpacing: 'var(--typography-letter-wide)',
              padding: 'var(--layout-space-3) 0',
              borderBottom: isActive ? 'var(--shape-border-width-2) solid var(--color-fg)' : 'var(--shape-border-width-2) solid transparent',
              marginBottom: '-1px',
              transition: 'color 0.2s ease, border-color 0.2s ease'
            },
            onclick: () => {
              activeTabIndex.value = idx;
              expanded.value = false; // Reset expansion on tab switch
            }
          }, tab.label);
        })
      ),
      // Right Side: Actions
      div(
        { class: [design.layout.flex, design.layout.itemsCenter], style: { gap: '0.5rem' } },
        isExpandable ? Button({
          variant: 'ghost',
          size: 'sm',
          class: [design.typography.transformUppercase, design.typography.weightBold],
          style: { backgroundColor: 'transparent', boxShadow: 'none', color: 'var(--color-fg-muted)' },
          onclick: () => { expanded.value = !expanded.value; }
        }, isExpanded ? 'COLLAPSE' : 'EXPAND') : null,

        Button({
          variant: 'ghost',
          size: 'icon',
          style: { backgroundColor: 'transparent', boxShadow: 'none', color: 'var(--color-fg-muted)' },
          onclick: handleCopy
        }, copied.value ? CheckIcon : CopyIcon)
      )
    ),
    // Code Body
    div(
      {
        class: [design.layout.relative],
        style: { maxHeight: isExpanded ? 'none' : '350px', overflow: 'hidden' }
      },
      pre(
        {
          class: [design.typography.fontMono],
          style: { margin: 0, padding: 'var(--layout-space-5)', fontSize: '0.85rem', overflowX: 'auto', color: 'var(--color-fg)' }
        },
        parsedLines.map((lineTokens, idx) => div({ key: idx, class: [design.layout.flex], style: { gap: 'var(--layout-space-5)', lineHeight: 'var(--typography-line-normal)' } },
          span({ style: { userSelect: 'none', color: 'var(--color-neutral-4)', width: '2rem', textAlign: 'right', flexShrink: 0 } }, String(idx + 1)),
          span({ style: { whiteSpace: 'pre' } },
            ...lineTokens.map((token, tIdx) =>
              span({ key: tIdx, style: { color: syntaxColors[token.type] || syntaxColors.text } }, token.value)
            )
          )
        ))
      ),
      !isExpanded ? div(
        {
          class: [design.layout.absolute, design.layout.flex, design.layout.itemsCenter, design.layout.justifyCenter],
          style: {
            bottom: 0, left: 0, width: '100%', height: '120px',
            background: 'linear-gradient(to bottom, transparent, var(--color-bg) 90%)',
            alignItems: 'flex-end',
            paddingBottom: 'var(--layout-space-5)'
          }
        },
        Button({
          variant: 'outline',
          size: 'sm',
          class: [design.typography.weightBold, design.typography.transformUppercase],
          style: { backgroundColor: 'var(--color-surface)', boxShadow: 'var(--effect-shadow-1)' },
          onclick: () => { expanded.value = true; }
        }, 'SHOW FULL CODE')
      ) : null
    )
  );
});
