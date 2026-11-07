import { html } from '../../../giant.js';

const { div, table, thead, tbody, tfoot, tr, th, td, caption, span, svg, path } = html;

const PAD = { 'style-pad-block': 'small', 'style-pad-inline': 'medium' };
const SORT_ICONS = { asc: 'm18 15-6-6-6 6', desc: 'm6 9 6 6 6-6' };

// Each primitive accepts the same (attributes?, ...children) arguments as the html factories.
const wrap = (factory, fn) => (...args) => {
  const { attributes, children } = factory(...args);
  return fn(attributes, children);
};

export const VTable = wrap(div, (attrs, children) => div(
  { 'style-width': 'full', 'style-overflow': 'auto', ...attrs },
  table({ 'style-width': 'full', 'style-text': 'small', 'style-text-align': 'start' }, ...children)
));

VTable.Header = thead;
VTable.Body = tbody;

VTable.Footer = wrap(tfoot, (attrs, children) =>
  tfoot({ 'style-surface': 'muted', 'style-weight': 'medium', 'style-divider': 'top', ...attrs }, ...children));

// Row dividers live on the cells: style-emphasis on the row would reset its border colour.
VTable.Row = wrap(tr, ({ hover = true, ...attrs }, children) =>
  tr({ 'style-emphasis': hover ? 'ghost' : undefined, ...attrs }, ...children));

VTable.Head = wrap(th, ({ sortable, sortDirection, draggable, style = {}, ...attrs }, children) => th(
  {
    'style-weight': 'medium',
    'style-tone': 'muted',
    'style-interactive': draggable ? 'clickable' : 'static',
    'style-position': 'sticky',
    'style-inset': 'top',
    'style-layer': 'raised',
    'style-surface': 'base',
    ...PAD,
    ...attrs,
    draggable,
    // TODO(style): collapsed-table borders don't stick with a sticky header, so style-divider can't be used here;
    // a sticky-safe divider (e.g. `style-divider="bottom-inset"`) would replace this inset shadow.
    style: { boxShadow: 'inset 0 -1px 0 var(--border)', ...style }
  },
  div(
    { 'style-layout': 'row', 'style-gap': 'small' },
    span({ 'style-flex': 'grow' }, ...children),
    sortable ? svg(
      {
        viewBox: '0 0 24 24', width: '16', height: '16', fill: 'none', stroke: 'currentColor', 'stroke-width': 2,
        'style-tone': sortDirection ? undefined : 'muted'
      },
      path({ d: SORT_ICONS[sortDirection] || 'm7 15 5 5 5-5M7 9l5-5 5 5' })
    ) : null
  )
));

VTable.Cell = wrap(td, (attrs, children) => td({ ...PAD, 'style-divider': 'bottom', ...attrs }, ...children));

VTable.Caption = wrap(caption, (attrs, children) =>
  caption({ 'style-tone': 'muted', 'style-text': 'xsmall', 'style-pad-block': 'medium', ...attrs }, ...children));
