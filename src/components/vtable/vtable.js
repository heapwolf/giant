import { html, design } from '../../../giant.js';

const { div, table, thead, tbody, tfoot, tr, th, td, caption, span, svg, path } = html;

// =========================================================
// TABLE PRIMITIVES
// =========================================================

export const VTable = (...args) => {
  const { attributes, children } = div(...args);
  const { class: customClass = '', dir, ...rest } = attributes;

  return div(
    { ...rest, class: [design.size.wFull, design.layout.overflowAuto, customClass], dir },
    table({ class: [design.size.wFull, design.typography.size1, design.typography.alignStart], style: { borderCollapse: 'collapse', textIndent: 'initial', borderSpacing: 0 } }, ...children)
  );
};

// Compound component properties attached to the main VTable function
VTable.Header = (...args) => thead(...args);

VTable.Body = (...args) => tbody(...args);

VTable.Footer = (...args) => {
  const { attributes, children } = tfoot(...args);
  const { class: customClass = '', style = {}, ...rest } = attributes;

  return tfoot(
    { ...rest, class: [design.bg.bgMuted, design.typography.weightMedium, customClass], style: { borderTop: '1px solid var(--color-border-muted)', ...style } },
    ...children
  );
};

VTable.Row = (...args) => {
  const { attributes, children } = tr(...args);
  const { class: customClass = '', hover = true, style = {}, ...rest } = attributes;

  return tr(
    {
      ...rest,
      class: [hover ? design.state.hoverColorBg : '', customClass],
      style: { borderBottom: '1px solid var(--color-border-muted)', ...style }
    },
    ...children
  );
};

VTable.Head = (...args) => {
  const { attributes, children } = th(...args);
  const { class: customClass = '', sortable, sortDirection, draggable, style = {}, ...rest } = attributes;

  const innerContent = [span({ style: { flex: 1 } }, ...children)];

  if (sortable) {
    const iconPath = sortDirection === 'asc' ? 'm18 15-6-6-6 6' : sortDirection === 'desc' ? 'm6 9 6 6 6-6' : 'm7 15 5 5 5-5M7 9l5-5 5 5';
    innerContent.push(svg(
      { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, style: { width: '1rem', height: '1rem', opacity: sortDirection ? 1 : 0.3 } },
      path({ d: iconPath })
    ));
  }

  return th(
    {
      ...rest,
      draggable,
      class: [design.typography.weightMedium, design.fg.fgMuted, design.typography.alignStart, design.interaction.selectNone, draggable ? design.interaction.cursorPointer : '', customClass],
      style: {
        padding: '0.75rem 1rem', verticalAlign: 'middle',
        position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--color-surface)',
        boxShadow: 'inset 0 -1px 0 var(--color-border-muted)',
        ...style
      }
    },
    div({ class: [design.layout.flex, design.layout.itemsCenter, design.spacing.gap2] }, ...innerContent)
  );
};

VTable.Cell = (...args) => {
  const { attributes, children } = td(...args);
  const { class: customClass = '', style = {}, ...rest } = attributes;

  return td({ ...rest, class: customClass, style: { padding: '0.75rem 1rem', verticalAlign: 'middle', ...style } }, ...children);
};

VTable.Caption = (...args) => {
  const { attributes, children } = caption(...args);
  const { class: customClass = '', style = {}, ...rest } = attributes;

  return caption({ ...rest, class: [design.fg.fgMuted, design.typography.size0, customClass], style: { paddingTop: '1rem', paddingBottom: '1rem', ...style } }, ...children);
};
