/**
 * @fileoverview Composable SVG Charting Library for GIANT.JS
 * * Provides a highly composable, zero-dependency SVG charting engine.
 * Charts are constructed using decoupled configuration primitives that
 * define data bindings, while the rendering engines handle the complex SVG math,
 * interactivity, and accessibility.
 */

import { component, html, design, signal } from '../../../giant.js';

const { div, span, svg, rect, text, line, path, polyline, circle, polygon } = html;

/**
 * @typedef {Object} ChartPrimitive
 * @property {string} _chartPrimitive - Internal identifier for the rendering engine.
 */

export const CartesianGrid = (props = {}) => {
  /**
   * Configuration for a Cartesian Grid (used in Bar and Line charts).
   * @param {Object} props
   * @param {boolean} [props.vertical=true] - Whether to show vertical grid lines.
   * @param {boolean} [props.horizontal=true] - Whether to show horizontal grid lines.
   * @param {string} [props.strokeDasharray='4 4'] - SVG stroke-dasharray pattern.
   * @returns {ChartPrimitive}
   */
  return ({ _chartPrimitive: 'grid', ...props });
}

export const XAxis = (props = {}) => {
  /**
   * Configuration for an X-Axis.
   * @param {Object} props
   * @param {string} props.dataKey - The key in the data object to use for labels.
   * @param {Function} [props.tickFormatter] - A function to format the tick labels.
   * @returns {ChartPrimitive}
   */
  return { _chartPrimitive: 'xaxis', ...props }
}

export const Bar = (props = {}) => {
  /**
   * Configuration for a Bar series.
   * @param {Object} props
   * @param {string} props.dataKey - The data key to render.
   * @param {number} [props.radius=0] - Border radius for the top of the bars.
   * @param {string} [props.fill] - CSS color or variable. Defaults to the config injector.
   * @returns {ChartPrimitive}
   */
  return { _chartPrimitive: 'bar', ...props }
}

export const Line = (props = {}) => {
  /**
   * Configuration for a Line series.
   * @param {Object} props
   * @param {string} props.dataKey - The data key to render.
   * @param {number} [props.strokeWidth=2] - Thickness of the line.
   * @param {string} [props.stroke] - CSS color or variable. Defaults to the config injector.
   * @returns {ChartPrimitive}
   */
  return { _chartPrimitive: 'line', ...props }
}

export const Pie = (props = {}) => {
  /**
   * Configuration for a Pie/Donut series.
   * @param {Object} props
   * @param {string} props.dataKey - The numeric data key defining the slice size.
   * @param {string} [props.nameKey='name'] - The data key defining the slice label.
   * @param {number} [props.innerRadius=0] - Inner radius cutout (creates a donut chart if > 0).
   * @returns {ChartPrimitive}
   */
  return { _chartPrimitive: 'pie', ...props }
}

export const Radar = (props = {}) => {
  /**
   * Configuration for a Radar series.
   * @param {Object} props
   * @param {string} props.dataKey - The data key to render on the radar.
   * @param {number} [props.fillOpacity=0.4] - Opacity of the polygon fill (set to 0 for lines only).
   * @param {boolean} [props.dot=false] - Whether to render data points at vertices.
   * @param {string} [props.fill] - Fill color. Defaults to config injector.
   * @param {string} [props.stroke] - Stroke color. Defaults to config injector.
   * @returns {ChartPrimitive}
   */
  return { _chartPrimitive: 'radar', ...props };
};

export const RadialBar = (props = {}) => {
  /**
   * Configuration for a Radial Bar series.
   * @param {Object} props
   * @param {string} props.dataKey - The data key to render.
   * @param {string} [props.nameKey='name'] - The data key defining the label.
   * @param {boolean} [props.background=true] - Whether to draw a background track.
   * @param {boolean} [props.label=false] - Whether to draw labels on the tracks.
   * @returns {ChartPrimitive}
   */
  return { _chartPrimitive: 'radialBar', ...props }
}

export const PolarGrid = (props = {}) => {
  /**
   * Configuration for a Radar Chart's background grid.
   * @param {Object} props
   * @param {'polygon'|'circle'} [props.gridType='polygon'] - Shape of the grid rings.
   * @param {boolean} [props.radialLines=true] - Whether to draw spoke lines from center.
   * @param {boolean} [props.filled=false] - Whether to alternate fill colors on grid rings.
   * @param {number} [props.gridLines=4] - Number of concentric grid rings.
   * @param {string} [props.stroke] - Custom stroke color for the grid lines (e.g., 'var(--color-border-strong)').
   * @returns {ChartPrimitive}
   */
  return { _chartPrimitive: 'polarGrid', ...props };
}

export const PolarAngleAxis = (props = {}) => {
  /**
   * Configuration for a Radar Chart's perimeter labels.
   * @param {Object} props
   * @param {string} props.dataKey - The data key to map to the perimeter axes.
   * @param {Function} [props.tickFormatter] - A function to format the tick labels.
   * @returns {ChartPrimitive}
   */
  return { _chartPrimitive: 'polarAngleAxis', ...props }
}

export const ChartTooltip = (props = {}) => {
  /**
   * Configuration to enable hovering tooltips on a chart.
   * @param {Object} props
   * @param {boolean} [props.cursor=true] - Whether to show a background cursor highlight on hover.
   * @returns {ChartPrimitive}
   */
  return { _chartPrimitive: 'tooltip', ...props }
}

export const ChartLegend = (props = {}) => {
  /**
   * Configuration to display a series legend at the bottom of the chart.
   * @param {Object} props
   * @returns {ChartPrimitive}
   */
  return { _chartPrimitive: 'legend', ...props }
}

export const ChartContainer = component.ChartContainer((props = {}, ...children) => {
  /**
   * Container component that injects JS configurations into standard CSS variables.
   * Allows pure CSS styling, transitions, and theme syncing without JS overhead.
   * * @param {Object} props
   * @param {Object} props.config - Dictionary mapping keys to labels and colors.
   * @param {...unknown} children - The Chart Engine and configurations.
   */
  const { config = {}, class: className = '', style = {}, ...rest } = props;

  // Inject the configuration colors directly into the style object
  const cssVars = { ...style };
  Object.entries(config).forEach(([key, val]) => {
    if (val.color) cssVars[`--color-${key}`] = val.color;
  });

  return div(
    { ...rest, class: [design.size.wFull, className], style: cssVars },
    ...children
  );
});


const renderLegend = (seriesConfigs, configProp) => {
  if (!seriesConfigs || seriesConfigs.length === 0) return null;
  return div(
    { class: [design.layout.flex, design.layout.itemsCenter, design.layout.justifyCenter, design.spacing.gap6], style: { marginTop: '1rem' } },
    ...seriesConfigs.map(s => {
      const label = configProp?.[s.dataKey]?.label || s.dataKey;
      const color = s.fill || s.stroke || `var(--color-${s.dataKey})`;
      return div(
        { class: [design.layout.flex, design.layout.itemsCenter, design.spacing.gap2, design.typography.size1, design.fg.fg] },
        div({ style: { width: '12px', height: '12px', borderRadius: '2px', backgroundColor: color } }),
        label
      );
    })
  );
};

export const ChartBars = component.ChartBars((props = {}, ...configs) => {
  /**
   * ChartBars Component
   *
   * @component
   * @description SVG bar chart rendering engine with grid, x-axis, tooltip, legend, and grouped bars.
   *
   * @prop {Array<Object>} [data=[]] - Chart data array.
   * @prop {number} [width=500] - SVG viewBox width.
   * @prop {number} [height=250] - SVG viewBox height.
   * @prop {Object} [config] - Series configuration for labels and colors.
   * @prop {string} [class] - Additional classes.
   */
  const hoverIndex = signal.hoverIndex(null);
  const { data = [], width = 500, height = 250, class: customClass = '', ...rest } = props;

  const flatConfigs = configs.flat(Infinity).filter(Boolean);
  const grid = flatConfigs.find(c => c._chartPrimitive === 'grid');
  const xAxis = flatConfigs.find(c => c._chartPrimitive === 'xaxis');
  const tooltip = flatConfigs.find(c => c._chartPrimitive === 'tooltip');
  const legend = flatConfigs.find(c => c._chartPrimitive === 'legend');
  const bars = flatConfigs.filter(c => c._chartPrimitive === 'bar');

  const margin = { top: 20, right: 20, bottom: xAxis ? 40 : 20, left: 20 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const maxVal = Math.max(1, ...data.map(d => Math.max(...bars.map(b => d[b.dataKey] || 0))));
  const yRatio = innerHeight / maxVal;
  const xStep = innerWidth / data.length;

  const handleMove = (e) => {
    const svgNode = e.target.closest('svg');
    if (!svgNode) return;
    const rect = svgNode.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (width / rect.width);
    const index = Math.floor((x - margin.left) / xStep);
    hoverIndex.value = (index >= 0 && index < data.length) ? index : null;
  };
  const handleLeave = () => { hoverIndex.value = null; };

  const svgChildren = [];

  if (grid && grid.vertical !== false) {
    for (let i = 0; i <= 4; i++) {
      const y = margin.top + (innerHeight / 4) * i;
      svgChildren.push(line({ x1: margin.left, x2: width - margin.right, y1: y, y2: y, stroke: 'var(--color-border-muted)', strokeDasharray: grid.strokeDasharray || '4 4' }));
    }
  }

  if (xAxis) {
    data.forEach((d, i) => {
      const x = margin.left + (i * xStep) + (xStep / 2);
      const val = xAxis.tickFormatter ? xAxis.tickFormatter(d[xAxis.dataKey]) : d[xAxis.dataKey];
      svgChildren.push(text({ x, y: height - 10, fill: 'var(--color-fg-muted)', fontSize: 12, textAnchor: 'middle', style: { pointerEvents: 'none' } }, val));
    });
  }

  const groupWidth = xStep * 0.8;
  const barWidth = groupWidth / bars.length;

  data.forEach((d, i) => {
    const groupX = margin.left + (i * xStep) + (xStep * 0.1);

    if (hoverIndex.value === i && tooltip && tooltip.cursor !== false) {
      svgChildren.push(rect({ x: margin.left + (i * xStep), y: margin.top, width: xStep, height: innerHeight, fill: 'var(--color-surface-muted)', rx: 4 }));
    }

    bars.forEach((bar, j) => {
      const h = (d[bar.dataKey] || 0) * yRatio;
      svgChildren.push(rect({
        x: groupX + (j * barWidth), y: height - margin.bottom - h, width: barWidth - 2, height: h,
        fill: bar.fill || `var(--color-${bar.dataKey})`, rx: bar.radius || 0
      }));
    });
  });

  return div(
    { class: [design.layout.relative, customClass], style: { width: '100%', height: '100%' }, ...rest },
    svg({ viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none', style: { width: '100%', height: '100%', overflow: 'visible', cursor: 'crosshair' }, onpointermove: handleMove, onpointerleave: handleLeave }, ...svgChildren),

    (tooltip && hoverIndex.value !== null && data[hoverIndex.value]) ? div(
      {
        class: [design.layout.absolute, design.bg.bgSurface, design.shape.border1, design.border.borderMuted, design.shape.radius2, design.effect.shadow2],
        style: { pointerEvents: 'none', top: '10%', left: `${Math.min(90, Math.max(10, (margin.left + (hoverIndex.value * xStep) + (xStep / 2)) / width * 100))}%`, transform: 'translateX(-50%)', padding: '0.75rem', zIndex: 50, minWidth: '120px' }
      },
      div({ class: [design.typography.weightMedium, design.typography.size1, design.layout.margin0, design.spacing.pb2] }, data[hoverIndex.value][xAxis?.dataKey]),
      ...bars.map(b => div(
        { class: [design.layout.flex, design.layout.justifyBetween, design.layout.itemsCenter, design.spacing.gap4, design.typography.size1] },
        div({ class: [design.layout.flex, design.layout.itemsCenter, design.spacing.gap2] }, div({ style: { width: '8px', height: '8px', backgroundColor: b.fill || `var(--color-${b.dataKey})`, borderRadius: '2px' } }), span({ class: design.fg.fgMuted }, props.config?.[b.dataKey]?.label || b.dataKey)),
        span({ class: [design.typography.weightBold, design.typography.fontMono] }, data[hoverIndex.value][b.dataKey])
      ))
    ) : null,

    legend ? renderLegend(bars, props.config) : null
  );
});


export const ChartLine = component.ChartLine((props = {}, ...configs) => {
 /**
   * ChartLine Component
   *
   * @component
   * @description SVG line chart rendering engine with grid, x-axis, hover cursor, tooltip, and legend.
   *
   * @prop {Array<Object>} [data=[]] - Chart data array.
   * @prop {number} [width=500] - SVG viewBox width.
   * @prop {number} [height=250] - SVG viewBox height.
   * @prop {Object} [config] - Series configuration for labels and colors.
   * @prop {string} [class] - Additional classes.
   */
  const hoverIndex = signal.hoverIndex(null);
  const { data = [], width = 500, height = 250, class: customClass = '', ...rest } = props;

  const flatConfigs = configs.flat(Infinity).filter(Boolean);
  const grid = flatConfigs.find(c => c._chartPrimitive === 'grid');
  const xAxis = flatConfigs.find(c => c._chartPrimitive === 'xaxis');
  const tooltip = flatConfigs.find(c => c._chartPrimitive === 'tooltip');
  const legend = flatConfigs.find(c => c._chartPrimitive === 'legend');
  const lines = flatConfigs.filter(c => c._chartPrimitive === 'line');

  const margin = { top: 20, right: 20, bottom: xAxis ? 40 : 20, left: 20 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const maxVal = Math.max(1, ...data.map(d => Math.max(...lines.map(l => d[l.dataKey] || 0))));
  const yRatio = innerHeight / maxVal;
  const xStep = innerWidth / Math.max(1, data.length - 1);

  const handleMove = (e) => {
    const svgNode = e.target.closest('svg');
    if (!svgNode) return;
    const rect = svgNode.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (width / rect.width);

    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < data.length; i++) {
      const diff = Math.abs(x - (margin.left + i * xStep));
      if (diff < minDiff) { minDiff = diff; closestIdx = i; }
    }
    hoverIndex.value = closestIdx;
  };
  const handleLeave = () => { hoverIndex.value = null; };

  const svgChildren = [];

  if (grid && grid.vertical !== false) {
    for (let i = 0; i <= 4; i++) {
      const y = margin.top + (innerHeight / 4) * i;
      svgChildren.push(line({ x1: margin.left, x2: width - margin.right, y1: y, y2: y, stroke: 'var(--color-border-muted)', strokeDasharray: grid.strokeDasharray || '4 4' }));
    }
  }

  if (xAxis) {
    data.forEach((d, i) => {
      const val = xAxis.tickFormatter ? xAxis.tickFormatter(d[xAxis.dataKey]) : d[xAxis.dataKey];
      svgChildren.push(text({ x: margin.left + (i * xStep), y: height - 10, fill: 'var(--color-fg-muted)', fontSize: 12, textAnchor: 'middle', style: { pointerEvents: 'none' } }, val));
    });
  }

  lines.forEach((lConfig) => {
    const points = data.map((d, i) => {
      const x = margin.left + (i * xStep);
      const y = height - margin.bottom - ((d[lConfig.dataKey] || 0) * yRatio);
      return `${x},${y}`;
    }).join(' ');

    svgChildren.push(polyline({
      points, fill: 'none', stroke: lConfig.stroke || `var(--color-${lConfig.dataKey})`,
      strokeWidth: lConfig.strokeWidth || 2, strokeLinecap: 'round', strokeLinejoin: 'round',
      style: { pointerEvents: 'none' }
    }));
  });

  if (hoverIndex.value !== null && hoverIndex.value !== undefined && data[hoverIndex.value]) {
    const hoverX = margin.left + (hoverIndex.value * xStep);

    if (tooltip && tooltip.cursor !== false) {
      svgChildren.push(line({ x1: hoverX, x2: hoverX, y1: margin.top, y2: height - margin.bottom, stroke: 'var(--color-border)', strokeWidth: 1, strokeDasharray: '4 4' }));
    }

    lines.forEach((lConfig) => {
      const y = height - margin.bottom - ((data[hoverIndex.value][lConfig.dataKey] || 0) * yRatio);
      svgChildren.push(circle({ cx: hoverX, cy: y, r: 4, fill: 'var(--color-surface)', stroke: lConfig.stroke || `var(--color-${lConfig.dataKey})`, strokeWidth: 2 }));
    });
  }

  return div(
    { class: [design.layout.relative, customClass], style: { width: '100%', height: '100%' }, ...rest },
    svg({ viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none', style: { width: '100%', height: '100%', overflow: 'visible', cursor: 'crosshair' }, onpointermove: handleMove, onpointerleave: handleLeave }, ...svgChildren),

    (tooltip && hoverIndex.value !== null && data[hoverIndex.value]) ? div(
      {
        class: [design.layout.absolute, design.bg.bgSurface, design.shape.border1, design.border.borderMuted, design.shape.radius2, design.effect.shadow2],
        style: { pointerEvents: 'none', top: '10%', left: `${Math.min(90, Math.max(10, (margin.left + (hoverIndex.value * xStep)) / width * 100))}%`, transform: 'translateX(-50%)', padding: '0.75rem', zIndex: 50, minWidth: '120px' }
      },
      div({ class: [design.typography.weightMedium, design.typography.size1, design.layout.margin0, design.spacing.pb2] }, data[hoverIndex.value][xAxis?.dataKey]),
      ...lines.map(l => div(
        { class: [design.layout.flex, design.layout.justifyBetween, design.layout.itemsCenter, design.spacing.gap4, design.typography.size1] },
        div({ class: [design.layout.flex, design.layout.itemsCenter, design.spacing.gap2] }, div({ style: { width: '8px', height: '2px', backgroundColor: l.stroke || `var(--color-${l.dataKey})` } }), span({ class: design.fg.fgMuted }, props.config?.[l.dataKey]?.label || l.dataKey)),
        span({ class: [design.typography.weightBold, design.typography.fontMono] }, data[hoverIndex.value][l.dataKey])
      ))
    ) : null,

    legend ? renderLegend(lines, props.config) : null
  );
});


export const ChartPie = component.ChartPie((props = {}, ...configs) => {
 /**
   * ChartPie Component
   *
   * @component
   * @description SVG pie and donut chart rendering engine with hover interaction, tooltip, and legend.
   *
   * @prop {Array<Object>} [data=[]] - Chart data array.
   * @prop {number} [width=300] - SVG viewBox width.
   * @prop {number} [height=300] - SVG viewBox height.
   * @prop {Object} [config] - Series configuration for labels and colors.
   * @prop {string} [class] - Additional classes.
   */
  const hoverIndex = signal.hoverIndex(null);
  const { data = [], width = 300, height = 300, class: customClass = '', ...rest } = props;

  const flatConfigs = configs.flat(Infinity).filter(Boolean);
  const pieConfig = flatConfigs.find(c => c._chartPrimitive === 'pie');
  const tooltip = flatConfigs.find(c => c._chartPrimitive === 'tooltip');
  const legend = flatConfigs.find(c => c._chartPrimitive === 'legend');

  if (!pieConfig) return div('Pie configuration missing');

  const dataKey = pieConfig.dataKey;
  const nameKey = pieConfig.nameKey || 'name';
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 20;
  const innerRadius = pieConfig.innerRadius || 0;
  const total = data.reduce((sum, d) => sum + (d[dataKey] || 0), 0);

  const polarToCartesian = (cx, cy, r, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return { x: cx + (r * Math.cos(angleInRadians)), y: cy + (r * Math.sin(angleInRadians)) };
  };

  const createArc = (startAngle, endAngle, r, ir) => {
    if (endAngle - startAngle >= 360) endAngle -= 0.001;
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    if (ir > 0) {
      const innerStart = polarToCartesian(cx, cy, ir, endAngle);
      const innerEnd = polarToCartesian(cx, cy, ir, startAngle);
      return [
        "M", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y,
        "L", innerEnd.x, innerEnd.y, "A", ir, ir, 0, largeArcFlag, 1, innerStart.x, innerStart.y, "Z"
      ].join(" ");
    }
    return ["M", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y, "L", cx, cy, "Z"].join(" ");
  };

  let currentAngle = 0;
  const svgChildren = data.map((d, i) => {
    const val = d[dataKey] || 0;
    const sliceAngle = (val / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const isHovered = hoverIndex.value === i;
    const fillValue = d.fill || `var(--color-${d[nameKey]?.toLowerCase().replace(/\s+/g, '-')})`;
    const pathData = createArc(startAngle, endAngle, radius, innerRadius);

    return path({
      d: pathData, fill: fillValue, stroke: 'var(--color-surface)', strokeWidth: 2,
      style: { transition: 'opacity 0.2s, transform 0.2s', transformOrigin: `${cx}px ${cy}px`, transform: isHovered ? `scale(1.04)` : `scale(1)`, cursor: 'pointer', opacity: (hoverIndex.value !== null && !isHovered) ? 0.6 : 1 },
      onpointerenter: () => { hoverIndex.value = i; },
      onpointerleave: () => { hoverIndex.value = null; }
    });
  });

  return div(
    { class: [design.layout.relative, design.layout.flex, design.layout.itemsCenter, customClass], style: { flexDirection: 'column', width: '100%', height: '100%' }, ...rest },
    svg({ viewBox: `0 0 ${width} ${height}`, style: { width: '100%', height: '100%', overflow: 'visible' } }, ...svgChildren),

    (tooltip && hoverIndex.value !== null && data[hoverIndex.value]) ? div(
      {
        class: [design.layout.absolute, design.bg.bgSurface, design.shape.border1, design.border.borderMuted, design.shape.radius2, design.effect.shadow2],
        style: { pointerEvents: 'none', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', padding: '0.75rem', zIndex: 50, minWidth: '130px', textAlign: 'center' }
      },
      div({ class: [design.typography.weightMedium, design.typography.size1, design.layout.margin0, design.spacing.pb2] }, data[hoverIndex.value][nameKey]),
      div(
        { class: [design.layout.flex, design.layout.justifyBetween, design.layout.itemsCenter, design.spacing.gap4, design.typography.size1] },
        div({ class: [design.layout.flex, design.layout.itemsCenter, design.spacing.gap2] },
          div({ style: { width: '8px', height: '8px', borderRadius: '2px', backgroundColor: data[hoverIndex.value].fill || `var(--color-${data[hoverIndex.value][nameKey]?.toLowerCase().replace(/\s+/g, '-')})` } }),
          span({ class: design.fg.fgMuted }, props.config?.[dataKey]?.label || dataKey)
        ),
        span({ class: [design.typography.weightBold, design.typography.fontMono] }, data[hoverIndex.value][dataKey])
      )
    ) : null,

    legend ? renderLegend(data.map(d => ({ dataKey: d[nameKey], fill: d.fill || `var(--color-${d[nameKey]?.toLowerCase().replace(/\s+/g, '-')})` }))) : null
  );
});

export const ChartRadial = component.ChartRadial((props = {}, ...configs) => {
  /**
   * ChartRadial Component
   *
   * @component
   * @description SVG radial bar chart engine supporting concentric tracks, stacked tracks, grids, and semi-circles.
   *
   * @prop {Array<Object>} [data=[]] - Chart data array.
   * @prop {number} [width=300] - SVG viewBox width.
   * @prop {number} [height=300] - SVG viewBox height.
   * @prop {string|number} [innerRadius='30%'] - Inner radius.
   * @prop {string|number} [outerRadius='90%'] - Outer radius.
   * @prop {number} [startAngle=0] - Start angle in degrees.
   * @prop {number} [endAngle=360] - End angle in degrees.
   * @prop {boolean} [stacked=false] - Whether bars stack on one track.
   * @prop {number} [max] - Explicit maximum value.
   * @prop {Object} [config] - Series configuration for labels and colors.
   * @prop {string} [class] - Additional classes.
   */
  const hoverIndex = signal.hoverIndex(null);
  const { data = [], width = 300, height = 300, innerRadius = '30%', outerRadius = '90%', startAngle = 0, endAngle = 360, stacked = false, max, class: customClass = '', ...rest } = props;

  const flatConfigs = configs.flat(Infinity).filter(Boolean);
  const radialBars = flatConfigs.filter(c => c._chartPrimitive === 'radialBar');
  const polarGrid = flatConfigs.find(c => c._chartPrimitive === 'polarGrid');
  const tooltip = flatConfigs.find(c => c._chartPrimitive === 'tooltip');
  const legend = flatConfigs.find(c => c._chartPrimitive === 'legend');

  if (!radialBars.length) return div('RadialBar configuration missing');
  const rConfig = radialBars[0];
  const dataKey = rConfig.dataKey;
  const nameKey = rConfig.nameKey || 'name';

  const cx = width / 2;
  const cy = height / 2;

  const getR = (val) => typeof val === 'string' && val.endsWith('%') ? (Math.min(cx, cy)) * parseFloat(val) / 100 : val;
  const ir = getR(innerRadius);
  const or = getR(outerRadius);

  const polarToCartesian = (cx, cy, r, angleInDegrees) => {
    // -90 so 0 degrees maps mathematically to Top
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return { x: cx + (r * Math.cos(angleInRadians)), y: cy + (r * Math.sin(angleInRadians)) };
  };

  const describeArc = (x, y, radius, startA, endA) => {
    let diff = endA - startA;
    if (diff >= 359.9) {
      const p1 = polarToCartesian(x, y, radius, startA);
      const p2 = polarToCartesian(x, y, radius, startA + 180);
      return [
        "M", p1.x, p1.y,
        "A", radius, radius, 0, 1, 1, p2.x, p2.y,
        "A", radius, radius, 0, 1, 1, p1.x, p1.y
      ].join(" ");
    }
    const start = polarToCartesian(x, y, radius, startA);
    const end = polarToCartesian(x, y, radius, endA);
    const largeArcFlag = diff <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y
    ].join(" ");
  };

  const maxVal = max !== undefined ? max : (stacked
    ? data.reduce((sum, d) => sum + (d[dataKey] || 0), 0)
    : Math.max(...data.map(d => d[dataKey] || 0)));

  const totalAngle = endAngle - startAngle;
  const dataLen = data.length;
  const trackGap = dataLen > 1 ? (or - ir) * 0.08 : 0;
  const availableWidth = or - ir;
  const trackWidth = stacked ? availableWidth : (availableWidth - (trackGap * (dataLen - 1))) / Math.max(1, dataLen);

  const svgChildren = [];

  // Radial Background Grid
  if (polarGrid && !stacked) {
    const numLines = polarGrid.gridLines || 12;
    const step = 360 / numLines;
    for (let a = 0; a < 360; a += step) {
       const startPt = polarToCartesian(cx, cy, ir - trackWidth/2, a);
       const endPt = polarToCartesian(cx, cy, or + trackWidth/2, a);
       svgChildren.push(line({ x1: startPt.x, y1: startPt.y, x2: endPt.x, y2: endPt.y, stroke: 'var(--color-border-muted)', strokeWidth: 1 }));
    }
  }

  if (stacked) {
    const r = ir + trackWidth / 2;
    if (rConfig.background !== false) {
      svgChildren.push(path({ d: describeArc(cx, cy, r, startAngle, endAngle), fill: 'none', stroke: 'var(--color-surface-muted)', strokeWidth: trackWidth, strokeLinecap: 'round' }));
    }

    let currentA = startAngle;
    data.forEach((d, i) => {
      const val = d[dataKey] || 0;
      const sliceA = (val / Math.max(1, maxVal)) * totalAngle;
      const endA = currentA + sliceA;
      const isHovered = hoverIndex.value === i;

      if (val > 0) {
        svgChildren.push(path({
          d: describeArc(cx, cy, r, currentA, endA),
          fill: 'none', stroke: d.fill || `var(--color-${d[nameKey]?.toLowerCase().replace(/\s+/g, '-')})`,
          strokeWidth: trackWidth, strokeLinecap: 'round',
          style: { transition: 'opacity 0.2s', cursor: 'pointer', opacity: (hoverIndex.value !== null && !isHovered) ? 0.6 : 1 },
          onpointerenter: () => { hoverIndex.value = i; },
          onpointerleave: () => { hoverIndex.value = null; }
        }));
      }
      currentA = endA;
    });
  } else {
    data.forEach((d, i) => {
      // Outermost track is index 0
      const r = or - i * (trackWidth + trackGap) - trackWidth / 2;
      const val = d[dataKey] || 0;
      const sliceA = (val / Math.max(1, maxVal)) * totalAngle;
      const isHovered = hoverIndex.value === i;

      if (rConfig.background !== false) {
        svgChildren.push(path({
          d: describeArc(cx, cy, r, startAngle, endAngle),
          fill: 'none', stroke: 'var(--color-surface-muted)', strokeWidth: trackWidth, strokeLinecap: 'round'
        }));
      }

      if (val > 0) {
        svgChildren.push(path({
          d: describeArc(cx, cy, r, startAngle, startAngle + sliceA),
          fill: 'none', stroke: d.fill || `var(--color-${d[nameKey]?.toLowerCase().replace(/\s+/g, '-')})`,
          strokeWidth: trackWidth, strokeLinecap: 'round',
          style: { transition: 'opacity 0.2s', cursor: 'pointer', opacity: (hoverIndex.value !== null && !isHovered) ? 0.6 : 1 },
          onpointerenter: () => { hoverIndex.value = i; },
          onpointerleave: () => { hoverIndex.value = null; }
        }));
      }

      // Track Labels aligned at start
      if (rConfig.label) {
         const lblPt = polarToCartesian(cx, cy, r, startAngle);
         svgChildren.push(text({
           x: lblPt.x, y: lblPt.y + (trackWidth * 0.35),
           textAnchor: 'middle', fill: 'var(--color-surface)', fontSize: Math.max(10, trackWidth * 0.45), fontWeight: 600, style: { pointerEvents: 'none' }
         }, d[nameKey]));
      }
    });
  }

  return div(
    { class: [design.layout.relative, design.layout.flex, design.layout.itemsCenter, customClass], style: { flexDirection: 'column', width: '100%', height: '100%' }, ...rest },
    svg({ viewBox: `0 0 ${width} ${height}`, style: { width: '100%', height: '100%', overflow: 'visible' } }, ...svgChildren),

    (tooltip && hoverIndex.value !== null && data[hoverIndex.value]) ? div(
      {
        class: [design.layout.absolute, design.bg.bgSurface, design.shape.border1, design.border.borderMuted, design.shape.radius2, design.effect.shadow2],
        style: { pointerEvents: 'none', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', padding: '0.75rem', zIndex: 50, minWidth: '130px', textAlign: 'center' }
      },
      div({ class: [design.typography.weightMedium, design.typography.size1, design.layout.margin0, design.spacing.pb2] }, data[hoverIndex.value][nameKey]),
      div(
        { class: [design.layout.flex, design.layout.justifyBetween, design.layout.itemsCenter, design.spacing.gap4, design.typography.size1] },
        div({ class: [design.layout.flex, design.layout.itemsCenter, design.spacing.gap2] },
          div({ style: { width: '8px', height: '8px', borderRadius: '2px', backgroundColor: data[hoverIndex.value].fill || `var(--color-${data[hoverIndex.value][nameKey]?.toLowerCase().replace(/\s+/g, '-')})` } }),
          span({ class: design.fg.fgMuted }, props.config?.[dataKey]?.label || dataKey)
        ),
        span({ class: [design.typography.weightBold, design.typography.fontMono] }, data[hoverIndex.value][dataKey])
      )
    ) : null,

    legend ? renderLegend(data.map(d => ({ dataKey: d[nameKey], fill: d.fill || `var(--color-${d[nameKey]?.toLowerCase().replace(/\s+/g, '-')})` }))) : null
  );
});

export const ChartRadar = component.ChartRadar((props = {}, ...configs) => {
 /**
   * ChartRadar Component
   *
   * @component
   * @description SVG radar chart engine with polar grid, angle axis labels, hover state, tooltip, and legend.
   *
   * @prop {Array<Object>} [data=[]] - Chart data array.
   * @prop {number} [width=300] - SVG viewBox width.
   * @prop {number} [height=300] - SVG viewBox height.
   * @prop {Object} [config] - Series configuration for labels and colors.
   * @prop {string} [class] - Additional classes.
   */
  const hoverIndex = signal.hoverIndex(null);
  const {
    data = [],
    width = 300,
    height = 300,
    class: customClass = '',
    ...rest
  } = props;

  const flatConfigs = configs.flat(Infinity).filter(Boolean);
  const polarGrid = flatConfigs.find(c => c._chartPrimitive === 'polarGrid');
  const polarAngleAxis = flatConfigs.find(c => c._chartPrimitive === 'polarAngleAxis');
  const tooltip = flatConfigs.find(c => c._chartPrimitive === 'tooltip');
  const legend = flatConfigs.find(c => c._chartPrimitive === 'legend');
  const radars = flatConfigs.filter(c => c._chartPrimitive === 'radar');

  // Math Setup
  const cx = width / 2;
  const cy = height / 2;
  // Make room for axis labels at the perimeter
  const outerRadius = Math.min(cx, cy) - (polarAngleAxis ? 40 : 10);
  const dataLen = data.length;
  const angleStep = (Math.PI * 2) / Math.max(1, dataLen);

  // Find max value across all data sources mapped to radars
  const maxVal = Math.max(1, ...data.map(d => Math.max(...radars.map(r => d[r.dataKey] || 0))));

  const getPolarPoint = (r, angle) => ({
    x: cx + r * Math.sin(angle),
    y: cy - r * Math.cos(angle) // -y because SVG 0,0 is top-left
  });

  const handleMove = (e) => {
    const svgNode = e.target.closest('svg');
    if (!svgNode) return;
    const rect = svgNode.getBoundingClientRect();

    // Calculate cursor coordinate relative to SVG center
    const x = (e.clientX - rect.left) * (width / rect.width) - cx;
    const y = (e.clientY - rect.top) * (height / rect.height) - cy;

    // Find Angle
    let angle = Math.atan2(y, x) + (Math.PI / 2); // Shift so 0 is Top
    if (angle < 0) angle += Math.PI * 2;

    // Find closest data index based on angle sector
    const index = Math.round(angle / angleStep) % dataLen;
    hoverIndex.value = index;
  };
  const handleLeave = () => { hoverIndex.value = null; };

  const svgChildren = [];

  // Render Polar Grid Background
  if (polarGrid) {
    const numLines = polarGrid.gridLines || 4;
    const radiusStep = outerRadius / numLines;

    const gridStrokeColor = polarGrid.stroke || 'var(--color-border-muted)';

    for (let i = 1; i <= numLines; i++) {
      const r = i * radiusStep;

      const gridProps = {
        stroke: gridStrokeColor,
        strokeWidth: 1,
        fill: (polarGrid.filled && i % 2 !== 0) ? 'var(--color-surface-muted)' : 'none',
      };

      if (polarGrid.gridType === 'circle') {
        svgChildren.push(circle({ cx, cy, r, ...gridProps }));
      } else {
        // Draw Polygon Grid
        const points = Array.from({ length: dataLen }).map((_, j) => {
          const pt = getPolarPoint(r, j * angleStep);
          return `${pt.x},${pt.y}`;
        }).join(' ');
        svgChildren.push(polygon({ points, ...gridProps }));
      }
    }

    // Radial Spoke Lines
    if (polarGrid.radialLines !== false) {
      data.forEach((_, j) => {
        const endPt = getPolarPoint(outerRadius, j * angleStep);
        svgChildren.push(line({
          x1: cx, y1: cy, x2: endPt.x, y2: endPt.y,
          stroke: gridStrokeColor,
          strokeWidth: 1
        }));
      });
    }
  }

  // Render Polar Angle Axis (Labels)
  const labelCoordinates = []; // Keep track for tooltip snapping

  if (polarAngleAxis) {
    data.forEach((d, i) => {
      const val = polarAngleAxis.tickFormatter ? polarAngleAxis.tickFormatter(d[polarAngleAxis.dataKey]) : d[polarAngleAxis.dataKey];
      // Push text slightly further out than the outerRadius
      const pt = getPolarPoint(outerRadius + 15, i * angleStep);
      labelCoordinates.push(pt);

      svgChildren.push(text({
        x: pt.x, y: pt.y + 4, // +4 to optically vertically center the baseline
        fill: hoverIndex.value === i ? 'var(--color-fg)' : 'var(--color-fg-muted)',
        fontSize: 12,
        fontWeight: hoverIndex.value === i ? '600' : '400',
        textAnchor: 'middle',
        style: { pointerEvents: 'none', transition: 'all 0.2s' }
      }, val));
    });
  } else {
    // Still calculate label coordinates for tooltip positioning even if hidden
    data.forEach((_, i) => {
      labelCoordinates.push(getPolarPoint(outerRadius + 15, i * angleStep));
    });
  }

  // Render Radar Polygons
  radars.forEach((rConfig) => {
    const color = rConfig.fill || rConfig.stroke || `var(--color-${rConfig.dataKey})`;

    // Generate Polygon Points
    const pts = data.map((d, i) => {
      const val = d[rConfig.dataKey] || 0;
      const r = (val / maxVal) * outerRadius;
      const pt = getPolarPoint(r, i * angleStep);
      return `${pt.x},${pt.y}`;
    });

    const isLinesOnly = rConfig.fillOpacity === 0;

    svgChildren.push(polygon({
      points: pts.join(' '),
      fill: isLinesOnly ? 'none' : color,
      fillOpacity: rConfig.fillOpacity !== undefined ? rConfig.fillOpacity : 0.4,
      stroke: color,
      strokeWidth: rConfig.strokeWidth || 2,
      style: { pointerEvents: 'none' }
    }));

    // Render optional dots
    if (rConfig.dot) {
      data.forEach((d, i) => {
        const val = d[rConfig.dataKey] || 0;
        const r = (val / maxVal) * outerRadius;
        const pt = getPolarPoint(r, i * angleStep);
        svgChildren.push(circle({
          cx: pt.x, cy: pt.y, r: 3,
          fill: 'var(--color-surface)', stroke: color, strokeWidth: 2,
          style: { pointerEvents: 'none' }
        }));
      });
    }
  });

  // Render Hover Interactive Artifacts
  if (hoverIndex.value !== null && hoverIndex.value !== undefined && data[hoverIndex.value]) {
    // Hover Spoke Line highlight
    const endPt = getPolarPoint(outerRadius, hoverIndex.value * angleStep);
    svgChildren.push(line({
      x1: cx, y1: cy, x2: endPt.x, y2: endPt.y,
      stroke: 'var(--color-fg-subtle)', strokeWidth: 1, strokeDasharray: '4 4', style: { pointerEvents: 'none' }
    }));

    // Hover Vertex Dots
    radars.forEach((rConfig) => {
      const val = data[hoverIndex.value][rConfig.dataKey] || 0;
      const r = (val / maxVal) * outerRadius;
      const pt = getPolarPoint(r, hoverIndex.value * angleStep);
      const color = rConfig.fill || rConfig.stroke || `var(--color-${rConfig.dataKey})`;
      svgChildren.push(circle({
        cx: pt.x, cy: pt.y, r: 4,
        fill: 'var(--color-surface)', stroke: color, strokeWidth: 2, style: { pointerEvents: 'none' }
      }));
    });
  }

  // Calculate Tooltip Position
  let tooltipStyles = {};
  if (hoverIndex.value !== null && hoverIndex.value !== undefined && data[hoverIndex.value]) {
    const anchorPt = labelCoordinates[hoverIndex.value];
    // Simple heuristic to prevent tooltip from flying off screen:
    // Anchor tooltip opposite to center relative to hovered point
    const isRightHalf = anchorPt.x >= cx;
    const isBottomHalf = anchorPt.y >= cy;

    tooltipStyles = {
      pointerEvents: 'none',
      top: `${(anchorPt.y / height) * 100}%`,
      left: `${(anchorPt.x / width) * 100}%`,
      transform: `translate(${isRightHalf ? '-110%' : '10%'}, ${isBottomHalf ? '-110%' : '10%'})`,
      padding: '0.75rem',
      zIndex: 50,
      minWidth: '130px'
    };
  }

  return div(
    { class: [design.layout.relative, design.layout.flex, design.layout.itemsCenter, customClass], style: { flexDirection: 'column', width: '100%', height: '100%' }, ...rest },

    // Canvas
    svg(
      { viewBox: `0 0 ${width} ${height}`, style: { width: '100%', height: '100%', overflow: 'visible', cursor: 'crosshair' }, onpointermove: handleMove, onpointerleave: handleLeave },
      ...svgChildren
    ),

    // Absolute Tooltip Overlay
    (tooltip && hoverIndex.value !== null && data[hoverIndex.value]) ? div(
      { class: [design.layout.absolute, design.bg.bgSurface, design.shape.border1, design.border.borderMuted, design.shape.radius2, design.effect.shadow2], style: tooltipStyles },
      div({ class: [design.typography.weightMedium, design.typography.size1, design.layout.margin0, design.spacing.pb2] }, polarAngleAxis ? (polarAngleAxis.tickFormatter ? polarAngleAxis.tickFormatter(data[hoverIndex.value][polarAngleAxis.dataKey]) : data[hoverIndex.value][polarAngleAxis.dataKey]) : `Point ${hoverIndex.value}`),
      ...radars.map(r => div(
        { class: [design.layout.flex, design.layout.justifyBetween, design.layout.itemsCenter, design.spacing.gap4, design.typography.size1] },
        div({ class: [design.layout.flex, design.layout.itemsCenter, design.spacing.gap2] },
          div({ style: { width: '8px', height: '8px', borderRadius: '2px', backgroundColor: r.fill || r.stroke || `var(--color-${r.dataKey})` } }),
          span({ class: design.fg.fgMuted }, props.config?.[r.dataKey]?.label || r.dataKey)
        ),
        span({ class: [design.typography.weightBold, design.typography.fontMono] }, data[hoverIndex.value][r.dataKey])
      ))
    ) : null,

    legend ? renderLegend(radars, props.config) : null
  );
});
