/**
 * @fileoverview Composable, zero-dependency SVG charts for GIANT.JS.
 * Chart engines (ChartBars, ChartLine, ...) take configuration primitives (Bar, XAxis, ...) as children.
 */

import { component, html, signal } from '../../../giant.js';

const { div, span, svg, rect, text, line, path, polyline, circle, polygon } = html;

// --- Configuration primitives (the in-body docs feed the API reference) ---

export const CartesianGrid = (props = {}) => {
  /**
   * Grid lines for Bar and Line charts.
   * @param {boolean} [props.vertical=true] - Whether to show the grid lines.
   * @param {string} [props.strokeDasharray='4 4'] - SVG stroke-dasharray pattern.
   */
  return { _chartPrimitive: 'grid', ...props };
};

export const XAxis = (props = {}) => {
  /**
   * X-axis labels.
   * @param {string} props.dataKey - The data key used for labels.
   * @param {Function} [props.tickFormatter] - Formats each tick label.
   */
  return { _chartPrimitive: 'xaxis', ...props };
};

export const Bar = (props = {}) => {
  /**
   * A bar series.
   * @param {string} props.dataKey - The data key to render.
   * @param {number} [props.radius=0] - Corner radius of the bars.
   * @param {string} [props.fill] - CSS colour. Defaults to the ChartContainer config colour.
   */
  return { _chartPrimitive: 'bar', ...props };
};

export const Line = (props = {}) => {
  /**
   * A line series.
   * @param {string} props.dataKey - The data key to render.
   * @param {number} [props.strokeWidth=2] - Line thickness.
   * @param {string} [props.stroke] - CSS colour. Defaults to the ChartContainer config colour.
   */
  return { _chartPrimitive: 'line', ...props };
};

export const Pie = (props = {}) => {
  /**
   * A pie/donut series.
   * @param {string} props.dataKey - The numeric data key defining slice size.
   * @param {string} [props.nameKey='name'] - The data key defining slice label and colour key.
   * @param {number} [props.innerRadius=0] - Inner cutout radius (a donut when > 0).
   */
  return { _chartPrimitive: 'pie', ...props };
};

export const Radar = (props = {}) => {
  /**
   * A radar series.
   * @param {string} props.dataKey - The data key to render.
   * @param {number} [props.fillOpacity=0.4] - Polygon fill opacity (0 draws lines only).
   * @param {boolean} [props.dot=false] - Whether to draw points at the vertices.
   * @param {string} [props.fill] - Fill colour. Defaults to the ChartContainer config colour.
   * @param {string} [props.stroke] - Stroke colour. Defaults to the fill.
   */
  return { _chartPrimitive: 'radar', ...props };
};

export const RadialBar = (props = {}) => {
  /**
   * A radial bar series.
   * @param {string} props.dataKey - The data key to render.
   * @param {string} [props.nameKey='name'] - The data key defining label and colour key.
   * @param {boolean} [props.background=true] - Whether to draw a background track.
   * @param {boolean} [props.label=false] - Whether to draw labels on the tracks.
   */
  return { _chartPrimitive: 'radialBar', ...props };
};

export const PolarGrid = (props = {}) => {
  /**
   * Background grid for Radar and Radial charts.
   * @param {'polygon'|'circle'} [props.gridType='polygon'] - Shape of the grid rings.
   * @param {boolean} [props.radialLines=true] - Whether to draw spokes from the centre.
   * @param {boolean} [props.filled=false] - Whether to fill alternate rings.
   * @param {number} [props.gridLines=4] - Number of rings (radar) or spokes (radial, default 12).
   * @param {string} [props.stroke] - Grid line colour, e.g. 'var(--fg)'.
   */
  return { _chartPrimitive: 'polarGrid', ...props };
};

export const PolarAngleAxis = (props = {}) => {
  /**
   * Perimeter labels for Radar charts.
   * @param {string} props.dataKey - The data key mapped to the perimeter.
   * @param {Function} [props.tickFormatter] - Formats each label.
   */
  return { _chartPrimitive: 'polarAngleAxis', ...props };
};

export const ChartTooltip = (props = {}) => {
  /**
   * Enables hover tooltips.
   * @param {boolean} [props.cursor=true] - Whether to highlight the hovered position.
   */
  return { _chartPrimitive: 'tooltip', ...props };
};

export const ChartLegend = (props = {}) => {
  /**
   * Shows a series legend below the chart.
   */
  return { _chartPrimitive: 'legend', ...props };
};

export const ChartContainer = component.ChartContainer((props = {}, ...children) => {
  /**
   * Exposes each config colour as a CSS variable (--color-<key>) for the charts inside.
   * Keys are lower-cased and anything outside [a-z0-9-] becomes '-', so 'Page Views' is --color-page-views.
   * @param {Object} props.config - Maps series keys to { label, color }.
   */
  const { config = {}, style = {}, ...rest } = props;
  const vars = { ...style };
  for (const [key, val] of Object.entries(config)) if (val.color) vars[colorVar(key)] = val.color;
  return div({ 'style-width': 'full', ...rest, style: vars }, ...children);
});

// --- Shared helpers ---

// SVG paints from the giant.tokens variables
const INK = 'var(--fg)';
const INK_MUTED = 'color-mix(in oklch, var(--fg) 55%, var(--bg))';
const INK_SUBTLE = 'color-mix(in oklch, var(--fg) 30%, var(--bg))';
const GRID = 'var(--border)';
const TRACK = 'var(--muted)';
const PAPER = 'var(--bg)';
// cartesian plots stretch (preserveAspectRatio none); this keeps their strokes at their pixel width
const CRISP = { 'vector-effect': 'non-scaling-stroke' };

// The root stacks the plot and the legend; the plot anchors the tooltip and the HTML overlays.
const ROOT = { 'style-layout': 'stack', 'style-gap': 'medium', 'style-width': 'full', 'style-height': 'full' };
const POLAR_ROOT = { ...ROOT, 'style-align': 'center' };
const PLOT_AREA = { 'style-position': 'relative', 'style-flex': 'grow', 'style-width': 'full' };
const PLOT = { 'style-width': 'full', 'style-height': 'full', 'style-overflow': 'visible' };
const INERT = { 'style-interactive': 'inert' };
const SLICE = { 'style-interactive': 'clickable', 'style-motion': 'all' };

const TOOLTIP = {
  'style-position': 'absolute', 'style-layer': 'overlay', 'style-interactive': 'inert',
  'style-surface': 'overlay', 'style-border': 'thin', 'style-radius': 'medium',
  'style-pad-block': 'small', 'style-pad-inline': 'medium',
  'style-layout': 'stack', 'style-gap': 'xsmall', 'style-text': 'small', 'style-wrap': 'nowrap',
};

// x-axis labels are HTML so the stretched SVG doesn't distort the text
const AXIS_LABEL = {
  'style-position': 'absolute', 'style-interactive': 'inert', 'style-text': 'xsmall',
  'style-weight': 'medium', 'style-tone': 'muted', 'style-wrap': 'nowrap',
};

const EMPTY = { 'style-position': 'absolute', 'style-inset': 'fill', 'style-layout': 'center', 'style-interactive': 'inert' };

const parse = (configs) => {
  const flat = configs.flat(Infinity).filter(Boolean);
  const all = (type) => flat.filter(c => c._chartPrimitive === type);
  return { all, one: (type) => all(type)[0] };
};

const colorVar = (key) => `--color-${String(key).toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
const num = (v) => Number(v) || 0;
const seriesColor = (s) => s.fill || s.stroke || `var(${colorVar(s.dataKey)})`;
const nameColor = (d, nameKey, config) => config?.[d[nameKey]]?.color || d.fill || `var(${colorVar(d[nameKey])})`;
const tick = (axis, d) => axis.tickFormatter ? axis.tickFormatter(d[axis.dataKey]) : d[axis.dataKey];
const maxOf = (data, series) => Math.max(1, ...data.map(d => Math.max(...series.map(s => num(d[s.dataKey])))));

// 0 degrees is the top, clockwise
const polar = (cx, cy, r, deg) => {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

// A full circle as two half arcs (a single arc can't end where it starts); sweep 0 winds it the other way
const ring = (cx, cy, r, from = 0, sweep = 1) => {
  const [a, b] = [polar(cx, cy, r, from), polar(cx, cy, r, from + 180)];
  return `M ${a.x} ${a.y} A ${r} ${r} 0 1 ${sweep} ${b.x} ${b.y} A ${r} ${r} 0 1 ${sweep} ${a.x} ${a.y}`;
};

// Index of the region ({ i, r0, r1, from, sweep }) under (x, y), for pie and radial hover
const regionAt = (regions, cx, cy, x, y) => {
  const r = Math.hypot(x - cx, y - cy);
  const deg = Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90;
  return regions.find(g => r >= g.r0 && r <= g.r1 && (((deg - g.from) % 360) + 360) % 360 < g.sweep)?.i ?? null;
};

// Tracks the pointer over the plot: { x, y } in viewBox units, { left, top } as fractions of the plot box.
// Handlers are delegated, so this uses pointerout (which bubbles) rather than pointerleave.
const tracking = (pointer) => ({
  'style-interactive': 'precise',
  onpointermove: (e) => {
    const node = e.target.closest('svg');
    const { x, y } = new DOMPoint(e.clientX, e.clientY).matrixTransform(node.getScreenCTM().inverse());
    const box = node.getBoundingClientRect();
    pointer.value = { x, y, left: (e.clientX - box.left) / box.width, top: (e.clientY - box.top) / box.height };
  },
  onpointerout: (e) => {
    if (!e.target.closest('svg').contains(e.relatedTarget)) pointer.value = null;
  },
});

// The hovered index under the pointer, or null
const hoverOf = (pointer, pick) => (pointer.value ? pick(pointer.value.x, pointer.value.y) : null);

// Tooltip next to the pointer, flipped towards the centre so it stays inside the plot
const nearPointer = ({ left, top }) => ({
  left: `${left * 100}%`,
  top: `${top * 100}%`,
  transform: `translate(${left > 0.5 ? '-115%' : '15%'}, ${top > 0.5 ? '-115%' : '15%'})`,
});

// A colour key drawn in SVG, so the runtime colour is a paint attribute
const swatch = (color, w = 8, h = 8, rx = 2) =>
  svg({ width: w, height: h, viewBox: `0 0 ${w} ${h}`, 'aria-hidden': 'true' }, rect({ width: w, height: h, rx, fill: color }));

// A dot that stays round in a stretched plot: a zero-length stroke with round caps
const dot = (x, y, color) => [
  path({ d: `M ${x} ${y} h 0`, stroke: color, 'stroke-width': 10, 'stroke-linecap': 'round', ...CRISP, ...INERT }),
  path({ d: `M ${x} ${y} h 0`, stroke: PAPER, 'stroke-width': 5, 'stroke-linecap': 'round', ...CRISP, ...INERT }),
];

const tooltipRow = (key, label, value) => div(
  { 'style-layout': 'row', 'style-justify': 'between', 'style-gap': 'medium' },
  div({ 'style-layout': 'row', 'style-gap': 'small' }, key, span({ 'style-tone': 'muted' }, label)),
  span({ 'style-weight': 'bold', 'style-font': 'mono' }, value)
);

// `position` is the runtime top/left/transform anchoring the tooltip
const tooltipBox = (position, attrs, title, rows) =>
  div({ ...TOOLTIP, ...attrs, style: position }, div({ 'style-weight': 'medium' }, title), ...rows);

const seriesRows = (series, d, config, key = (s) => swatch(seriesColor(s))) =>
  series.map(s => tooltipRow(key(s), config?.[s.dataKey]?.label || s.dataKey, d[s.dataKey]));

const legendFor = (series, config) => series.length ? div(
  { 'style-layout': 'row', 'style-justify': 'center', 'style-gap': 'xlarge' },
  ...series.map(s => div(
    { 'style-layout': 'row', 'style-gap': 'small', 'style-text': 'small' },
    swatch(seriesColor(s), 12, 12),
    config?.[s.dataKey]?.label || s.dataKey
  ))
) : null;

// `overlays` are HTML layered over the plot: axis labels, an empty state, the tooltip
const chart = (root, rest, svgAttrs, plot, overlays, legend) => div({ ...root, ...rest },
  div(PLOT_AREA, svg({ ...PLOT, ...svgAttrs }, ...plot.flat(Infinity).filter(Boolean)), ...overlays),
  legend
);

// Shared layout for bar and line charts; `side` is the left/right margin
const cartesian = (configs, type, data, width, height, side) => {
  const { one, all } = parse(configs);
  const xAxis = one('xaxis');
  const series = all(type);
  const margin = { top: 20, right: side, bottom: xAxis ? 40 : 20, left: side };
  const innerHeight = height - margin.top - margin.bottom;
  const yRatio = innerHeight / maxOf(data, series);
  const grid = one('grid');
  const gridLines = grid && grid.vertical !== false
    ? [0, 1, 2, 3, 4].map(i => {
        const y = margin.top + (innerHeight / 4) * i;
        return line({ x1: margin.left, x2: width - margin.right, y1: y, y2: y, stroke: GRID, 'stroke-dasharray': grid.strokeDasharray || '4 4', ...CRISP });
      })
    : [];
  // the first, the last and about five between, each with a tick mark and an HTML label
  const every = Math.max(1, Math.floor(data.length / 5));
  const shown = xAxis ? data.flatMap((d, i) => (i === 0 || i === data.length - 1 || i % every === 0 ? [i] : [])) : [];
  const axis = (xAt) => ({
    ticks: shown.map(i => line({ x1: xAt(i), x2: xAt(i), y1: height - margin.bottom, y2: height - margin.bottom + 4, stroke: GRID, ...CRISP })),
    // TODO(style): no attribute to centre a box on a point (translateX(-50%))
    labels: shown.map(i => div({
      ...AXIS_LABEL,
      style: { left: `${(xAt(i) / width) * 100}%`, top: `${((height - margin.bottom + 14) / height) * 100}%`, transform: 'translateX(-50%)' }
    }, tick(xAxis, data[i]))),
  });
  return {
    xAxis, series, margin, innerWidth: width - margin.left - margin.right, innerHeight, gridLines, axis,
    tooltip: one('tooltip'), legend: one('legend'),
    yAt: (v) => height - margin.bottom - num(v) * yRatio,
  };
};

// --- Chart engines ---

export const ChartBars = component.ChartBars((props = {}, ...configs) => {
  /**
   * SVG bar chart with grid, x-axis, tooltip, legend and grouped bars.
   * @prop {Array<Object>} [data=[]] - Chart data.
   * @prop {number} [width=500] - SVG viewBox width.
   * @prop {number} [height=250] - SVG viewBox height.
   * @prop {Object} [config] - Series labels.
   */
  const pointer = signal.pointer(null);
  const { data = [], width = 500, height = 250, config, ...rest } = props;
  const c = cartesian(configs, 'bar', data, width, height, 20);
  const xStep = c.innerWidth / Math.max(1, data.length);
  const barWidth = (xStep * 0.8) / c.series.length;
  const centre = (i) => c.margin.left + i * xStep + xStep / 2;
  const h = hoverOf(pointer, (x) => {
    const i = Math.floor((x - c.margin.left) / xStep);
    return i >= 0 && i < data.length ? i : null;
  });
  const { ticks, labels } = c.axis(centre);

  const bars = data.flatMap((d, i) => [
    h === i && c.tooltip && c.tooltip.cursor !== false
      ? rect({ x: c.margin.left + i * xStep, y: c.margin.top, width: xStep, height: c.innerHeight, fill: TRACK, rx: 4 })
      : null,
    ...c.series.map((bar, j) => {
      const y = c.yAt(d[bar.dataKey]);
      return rect({
        x: c.margin.left + i * xStep + xStep * 0.1 + j * barWidth, y, width: barWidth - 2, height: height - c.margin.bottom - y,
        fill: seriesColor(bar), rx: bar.radius || 0
      });
    })
  ]);

  return chart(ROOT, rest,
    { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none', ...tracking(pointer) },
    [c.gridLines, ticks, bars],
    [
      ...labels,
      c.tooltip && h !== null
        ? tooltipBox(nearPointer(pointer.value), {}, data[h][c.xAxis?.dataKey], seriesRows(c.series, data[h], config))
        : null
    ],
    c.legend ? legendFor(c.series, config) : null
  );
});

export const ChartLine = component.ChartLine((props = {}, ...configs) => {
  /**
   * SVG line chart with grid, x-axis, hover cursor, tooltip and legend.
   * @prop {Array<Object>} [data=[]] - Chart data.
   * @prop {number} [width=500] - SVG viewBox width.
   * @prop {number} [height=250] - SVG viewBox height.
   * @prop {Object} [config] - Series labels.
   * @prop {number} [minPoints=2] - Below this many points only the grid and `empty` are drawn.
   * @prop {*} [empty] - Content shown centred over the plot while there is too little data.
   */
  const pointer = signal.pointer(null);
  const { data = [], width = 500, height = 250, config, minPoints = 2, empty, ...rest } = props;
  const c = cartesian(configs, 'line', data, width, height, 40);
  const ready = data.length >= minPoints && c.series.length > 0;
  const xStep = c.innerWidth / Math.max(1, data.length - 1);
  const xAt = (i) => c.margin.left + i * xStep;
  const h = ready ? hoverOf(pointer, (x) => Math.max(0, Math.min(data.length - 1, Math.round((x - c.margin.left) / xStep)))) : null;
  const { ticks, labels } = ready ? c.axis(xAt) : { ticks: [], labels: [] };

  const plot = ready ? [
    ticks,
    c.series.map(s => polyline({
      points: data.map((d, i) => `${xAt(i)},${c.yAt(d[s.dataKey])}`).join(' '),
      fill: 'none', stroke: seriesColor(s), 'stroke-width': s.strokeWidth || 2,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...CRISP, ...INERT
    })),
    h !== null && c.tooltip && c.tooltip.cursor !== false
      ? line({ x1: xAt(h), x2: xAt(h), y1: c.margin.top, y2: height - c.margin.bottom, stroke: INK_SUBTLE, 'stroke-width': 1, 'stroke-dasharray': '4 4', ...CRISP })
      : null,
    h !== null ? c.series.map(s => dot(xAt(h), c.yAt(data[h][s.dataKey]), seriesColor(s))) : []
  ] : [];

  return chart(ROOT, rest,
    { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none', ...(ready ? tracking(pointer) : {}) },
    [c.gridLines, plot],
    [
      ...labels,
      !ready && empty != null ? div(EMPTY, empty) : null,
      c.tooltip && h !== null
        ? tooltipBox(nearPointer(pointer.value), {}, data[h][c.xAxis?.dataKey], seriesRows(c.series, data[h], config, s => swatch(seriesColor(s), 8, 2, 0)))
        : null
    ],
    c.legend && ready ? legendFor(c.series, config) : null
  );
});

// Pie and radial charts share a single-row tooltip and a legend keyed by nameKey
const nameTooltip = (position, d, nameKey, dataKey, config) => tooltipBox(
  position,
  { 'style-text-align': 'center' },
  config?.[d[nameKey]]?.label || d[nameKey],
  [tooltipRow(swatch(nameColor(d, nameKey, config)), config?.[dataKey]?.label || dataKey, d[dataKey])]
);
const nameLegend = (data, nameKey, config) =>
  legendFor(data.map(d => ({ dataKey: d[nameKey], fill: nameColor(d, nameKey, config) })), config);

export const ChartPie = component.ChartPie((props = {}, ...configs) => {
  /**
   * SVG pie and donut chart with hover, tooltip and legend. With no data it draws an empty ring.
   * @prop {Array<Object>} [data=[]] - Chart data.
   * @prop {number} [width=300] - SVG viewBox width.
   * @prop {number} [height=300] - SVG viewBox height.
   * @prop {Object} [config] - Labels and colours, keyed by series and by slice name.
   */
  const pointer = signal.pointer(null);
  const { data = [], width = 300, height = 300, config, ...rest } = props;
  const { one } = parse(configs);
  const pie = one('pie');
  if (!pie) return div('Pie configuration missing');

  const { dataKey, nameKey = 'name', innerRadius: ir = 0 } = pie;
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(cx, cy) - 20;
  const total = data.reduce((sum, d) => sum + num(d[dataKey]), 0);

  const arc = (from, to) => {
    // a lone slice is a full ring; the inner circle winds the other way to cut the hole
    if (to - from >= 359.9) return ir > 0 ? `${ring(cx, cy, r)} ${ring(cx, cy, ir, 0, 0)}` : ring(cx, cy, r);
    const large = to - from <= 180 ? 0 : 1;
    const [s, e] = [polar(cx, cy, r, to), polar(cx, cy, r, from)];
    if (ir <= 0) return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} L ${cx} ${cy} Z`;
    const [is, ie] = [polar(cx, cy, ir, to), polar(cx, cy, ir, from)];
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y} L ${ie.x} ${ie.y} A ${ir} ${ir} 0 ${large} 1 ${is.x} ${is.y} Z`;
  };

  let angle = 0;
  const regions = [];
  data.forEach((d, i) => {
    const sweep = (num(d[dataKey]) / (total || 1)) * 360;
    if (sweep > 0) regions.push({ i, r0: ir, r1: r, from: angle, sweep });
    angle += sweep;
  });
  const h = hoverOf(pointer, (x, y) => regionAt(regions, cx, cy, x, y));

  const slices = total > 0
    ? regions.map(({ i, from, sweep }) => path({
        d: arc(from, from + sweep), fill: nameColor(data[i], nameKey, config), stroke: PAPER, 'stroke-width': 2, ...SLICE,
        style: { transformOrigin: `${cx}px ${cy}px`, transform: `scale(${h === i ? 1.04 : 1})`, opacity: h !== null && h !== i ? 0.6 : 1 }
      }))
    : [path({ d: arc(0, 360), fill: TRACK, stroke: PAPER, 'stroke-width': 2 })];

  return chart(POLAR_ROOT, rest, { viewBox: `0 0 ${width} ${height}`, ...tracking(pointer) }, slices,
    [one('tooltip') && h !== null ? nameTooltip(nearPointer(pointer.value), data[h], nameKey, dataKey, config) : null],
    one('legend') && total > 0 ? nameLegend(data, nameKey, config) : null
  );
});

export const ChartRadial = component.ChartRadial((props = {}, ...configs) => {
  /**
   * SVG radial bar chart: concentric or stacked tracks, optional grid, partial arcs.
   * @prop {Array<Object>} [data=[]] - Chart data.
   * @prop {number} [width=300] - SVG viewBox width.
   * @prop {number} [height=300] - SVG viewBox height.
   * @prop {string|number} [innerRadius='30%'] - Inner radius.
   * @prop {string|number} [outerRadius='90%'] - Outer radius.
   * @prop {number} [startAngle=0] - Start angle in degrees.
   * @prop {number} [endAngle=360] - End angle in degrees.
   * @prop {boolean} [stacked=false] - Whether bars stack on one track.
   * @prop {number} [max] - Explicit maximum value.
   * @prop {Object} [config] - Labels and colours, keyed by series and by bar name.
   */
  const pointer = signal.pointer(null);
  const { data = [], width = 300, height = 300, innerRadius = '30%', outerRadius = '90%', startAngle = 0, endAngle = 360, stacked = false, max, config, ...rest } = props;
  const { one } = parse(configs);
  const bar = one('radialBar');
  if (!bar) return div('RadialBar configuration missing');

  const { dataKey, nameKey = 'name' } = bar;
  const cx = width / 2;
  const cy = height / 2;
  const radius = (v) => typeof v === 'string' && v.endsWith('%') ? Math.min(cx, cy) * parseFloat(v) / 100 : v;
  const ir = radius(innerRadius);
  const or = radius(outerRadius);

  const arc = (r, from, to) => {
    if (to - from >= 359.9) return ring(cx, cy, r, from);
    const [s, e] = [polar(cx, cy, r, from), polar(cx, cy, r, to)];
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${to - from <= 180 ? 0 : 1} 1 ${e.x} ${e.y}`;
  };

  const values = data.map(d => num(d[dataKey]));
  const maxVal = max ?? (stacked ? values.reduce((a, b) => a + b, 0) : Math.max(...values));
  const sweepOf = (v) => (v / Math.max(1, maxVal)) * (endAngle - startAngle);
  const n = data.length;
  const gap = n > 1 ? (or - ir) * 0.08 : 0;
  const trackWidth = stacked ? or - ir : (or - ir - gap * (n - 1)) / Math.max(1, n);
  const track = (r) => path({ d: arc(r, startAngle, endAngle), fill: 'none', stroke: TRACK, 'stroke-width': trackWidth, 'stroke-linecap': 'round' });

  // one hoverable value arc per datum: radius r, from..from+sweep
  let from = startAngle;
  const regions = data.map((d, i) => {
    const r = stacked ? ir + trackWidth / 2 : or - i * (trackWidth + gap) - trackWidth / 2; // index 0 is the outermost track
    const region = { i, r, r0: r - trackWidth / 2, r1: r + trackWidth / 2, from: stacked ? from : startAngle, sweep: sweepOf(values[i]) };
    if (stacked) from += region.sweep;
    return region;
  });
  const h = hoverOf(pointer, (x, y) => regionAt(regions, cx, cy, x, y));

  const plot = [];
  const grid = one('polarGrid');
  if (grid && !stacked) {
    const step = 360 / (grid.gridLines || 12);
    for (let a = 0; a < 360; a += step) {
      const [s, e] = [polar(cx, cy, ir - trackWidth / 2, a), polar(cx, cy, or + trackWidth / 2, a)];
      plot.push(line({ x1: s.x, y1: s.y, x2: e.x, y2: e.y, stroke: GRID, 'stroke-width': 1 }));
    }
  }

  if (bar.background !== false) plot.push(...(stacked ? regions.slice(0, 1) : regions).map(g => track(g.r)));
  regions.forEach(({ i, r, from, sweep }) => {
    if (sweep > 0) plot.push(path({
      d: arc(r, from, from + sweep), fill: 'none', stroke: nameColor(data[i], nameKey, config), 'stroke-width': trackWidth,
      'stroke-linecap': 'round', ...SLICE, style: { opacity: h !== null && h !== i ? 0.6 : 1 }
    }));
    if (bar.label && !stacked) {
      const at = polar(cx, cy, r, startAngle);
      plot.push(text({
        x: at.x, y: at.y + trackWidth * 0.35, 'text-anchor': 'middle', fill: PAPER,
        'font-size': Math.max(10, trackWidth * 0.45), 'font-weight': 600, ...INERT
      }, data[i][nameKey]));
    }
  });

  return chart(POLAR_ROOT, rest, { viewBox: `0 0 ${width} ${height}`, ...tracking(pointer) }, plot,
    [one('tooltip') && h !== null
      ? nameTooltip({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }, data[h], nameKey, dataKey, config)
      : null],
    one('legend') ? nameLegend(data, nameKey, config) : null
  );
});

export const ChartRadar = component.ChartRadar((props = {}, ...configs) => {
  /**
   * SVG radar chart with polar grid, angle labels, hover, tooltip and legend.
   * @prop {Array<Object>} [data=[]] - Chart data.
   * @prop {number} [width=300] - SVG viewBox width.
   * @prop {number} [height=300] - SVG viewBox height.
   * @prop {Object} [config] - Series labels.
   */
  const pointer = signal.pointer(null);
  const { data = [], width = 300, height = 300, config, ...rest } = props;
  const { one, all } = parse(configs);
  const grid = one('polarGrid');
  const axis = one('polarAngleAxis');
  const radars = all('radar');

  const cx = width / 2;
  const cy = height / 2;
  const outer = Math.min(cx, cy) - (axis ? 40 : 10); // room for perimeter labels
  const n = data.length;
  const step = 360 / Math.max(1, n);
  const maxVal = maxOf(data, radars);
  const at = (r, i) => polar(cx, cy, r, i * step);
  const valueAt = (s, i) => at((num(data[i][s.dataKey]) / maxVal) * outer, i);
  const points = (pts) => pts.map(p => `${p.x},${p.y}`).join(' ');
  const h = n ? hoverOf(pointer, (x, y) => {
    const deg = Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90; // 0 at the top
    return Math.round((deg + 360) % 360 / step) % n;
  }) : null;

  const plot = [];
  if (grid) {
    const rings = grid.gridLines || 4;
    const stroke = grid.stroke || GRID;
    for (let r = 1; r <= rings; r++) {
      const attrs = { stroke, 'stroke-width': 1, fill: grid.filled && r % 2 ? TRACK : 'none' };
      plot.push(grid.gridType === 'circle'
        ? circle({ cx, cy, r: (r * outer) / rings, ...attrs })
        : polygon({ points: points(data.map((_, i) => at((r * outer) / rings, i))), ...attrs }));
    }
    if (grid.radialLines !== false) {
      data.forEach((_, i) => {
        const e = at(outer, i);
        plot.push(line({ x1: cx, y1: cy, x2: e.x, y2: e.y, stroke, 'stroke-width': 1 }));
      });
    }
  }

  if (axis) {
    data.forEach((d, i) => {
      const p = at(outer + 15, i);
      plot.push(text({
        x: p.x, y: p.y + 4, // +4 optically centres the baseline
        fill: h === i ? INK : INK_MUTED, 'font-size': 12, 'font-weight': h === i ? '600' : '400', 'text-anchor': 'middle',
        ...INERT, 'style-motion': 'all'
      }, tick(axis, d)));
    });
  }

  radars.forEach((s) => {
    const color = seriesColor(s);
    plot.push(polygon({
      points: points(data.map((_, i) => valueAt(s, i))),
      fill: s.fillOpacity === 0 ? 'none' : color, 'fill-opacity': s.fillOpacity ?? 0.4,
      stroke: color, 'stroke-width': s.strokeWidth || 2, ...INERT
    }));
    if (s.dot) data.forEach((_, i) => {
      const p = valueAt(s, i);
      plot.push(circle({ cx: p.x, cy: p.y, r: 3, fill: PAPER, stroke: color, 'stroke-width': 2, ...INERT }));
    });
  });

  let position;
  if (h !== null) {
    const e = at(outer, h);
    plot.push(line({ x1: cx, y1: cy, x2: e.x, y2: e.y, stroke: INK_SUBTLE, 'stroke-width': 1, 'stroke-dasharray': '4 4', ...INERT }));
    radars.forEach((s) => {
      const p = valueAt(s, h);
      plot.push(circle({ cx: p.x, cy: p.y, r: 4, fill: PAPER, stroke: seriesColor(s), 'stroke-width': 2, ...INERT }));
    });
    // anchor at the label, offset away from the centre so it stays on screen
    const a = at(outer + 15, h);
    position = {
      top: `${(a.y / height) * 100}%`,
      left: `${(a.x / width) * 100}%`,
      transform: `translate(${a.x >= cx ? '-110%' : '10%'}, ${a.y >= cy ? '-110%' : '10%'})`
    };
  }

  return chart(POLAR_ROOT, rest, { viewBox: `0 0 ${width} ${height}`, ...tracking(pointer) }, plot,
    [one('tooltip') && h !== null
      ? tooltipBox(position, {}, axis ? tick(axis, data[h]) : data[h].name ?? `Point ${h}`, seriesRows(radars, data[h], config))
      : null],
    one('legend') ? legendFor(radars, config) : null
  );
});
