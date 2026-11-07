
import { component, createRoot, html } from '../../giant.js';
import {
  ChartContainer, ChartBars, ChartLine, ChartPie, ChartRadial, ChartRadar,
  CartesianGrid, XAxis, Bar, Line, Pie, Radar, RadialBar,
  PolarGrid, PolarAngleAxis, ChartTooltip, ChartLegend
} from './charts.js';

const { div, section, h2 } = html;

const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

// --- MOCK DATA & CONFIG ---
const chartData = [
  { category: 'A', metric1: 100, metric2: 50 },
  { category: 'B', metric1: 150, metric2: 80 }
];

const chartConfig = {
  metric1: { label: 'Primary Metric', color: 'rgb(255, 0, 0)' },
  metric2: { label: 'Secondary Metric', color: 'rgb(0, 0, 255)' },
  'Page Views': { color: 'rgb(0, 128, 0)' }
};

// --- TEST UI SETUP ---
const ChartsTestApp = component.ChartsTestApp(() => {
  return div({ class: 'charts-test-wrapper', 'style-layout': 'stack', 'style-gap': 'xxlarge' },

    // 1. Bar Chart
    section({ class: 'test-section' },
      h2('Bar Chart'),
      ChartContainer({ 'data-testid': 'container-bar', config: chartConfig },
        ChartBars({ 'data-testid': 'chart-bar', data: chartData, config: chartConfig },
          CartesianGrid(),
          XAxis({ dataKey: 'category' }),
          ChartTooltip(),
          ChartLegend(),
          Bar({ dataKey: 'metric1' }),
          Bar({ dataKey: 'metric2' })
        )
      )
    ),

    // 2. Line Chart
    section({ class: 'test-section' },
      h2('Line Chart'),
      ChartContainer({ config: chartConfig },
        ChartLine({ 'data-testid': 'chart-line', data: chartData, config: chartConfig },
          CartesianGrid(),
          XAxis({ dataKey: 'category' }),
          Line({ dataKey: 'metric1' })
        )
      )
    ),

    // 2b. Line Chart below minPoints
    section({ class: 'test-section' },
      h2('Line Chart (empty)'),
      ChartLine({ 'data-testid': 'chart-line-empty', data: chartData.slice(0, 1), empty: 'Not enough data' },
        XAxis({ dataKey: 'category' }),
        Line({ dataKey: 'metric1' }),
        ChartLegend()
      )
    ),

    // 3. Pie Chart
    section({ class: 'test-section' },
      h2('Pie Chart'),
      ChartContainer({ config: chartConfig },
        ChartPie({ 'data-testid': 'chart-pie', data: chartData, config: chartConfig },
          ChartTooltip(),
          Pie({ dataKey: 'metric1', nameKey: 'category' })
        )
      )
    ),

    // 4. Radial Chart
    section({ class: 'test-section' },
      h2('Radial Chart'),
      ChartContainer({ config: chartConfig },
        ChartRadial({ 'data-testid': 'chart-radial', data: chartData },
          RadialBar({ dataKey: 'metric1' })
        )
      )
    ),

    // 5. Radar Chart
    section({ class: 'test-section' },
      h2('Radar Chart'),
      ChartContainer({ config: chartConfig },
        ChartRadar({ 'data-testid': 'chart-radar', data: chartData, config: chartConfig },
          PolarGrid(),
          PolarAngleAxis({ dataKey: 'category' }),
          Radar({ dataKey: 'metric1' })
        )
      )
    )
  );
}, 'charts-test-app');


// --- TEST RUNNER EXPORT ---
export async function testCharts(mountPoint, assert) {
  const appNode = await createRoot(ChartsTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // CSS VARIABLE INJECTION
  const barContainerInner = appNode.querySelector('[data-testid="container-bar"]');

  assert(
    barContainerInner &&
    barContainerInner.style.getPropertyValue('--color-metric1') === 'rgb(255, 0, 0)' &&
    barContainerInner.style.getPropertyValue('--color-metric2') === 'rgb(0, 0, 255)',
    'ChartContainer: Successfully injects config colors as CSS variables'
  );

  assert(
    barContainerInner.style.getPropertyValue('--color-page-views') === 'rgb(0, 128, 0)',
    'ChartContainer: Sanitises config keys into valid CSS variable names'
  );

  // BAR CHART TESTS
  const barChartInner = appNode.querySelector('[data-testid="chart-bar"]');
  const barSvg = barChartInner.querySelector('svg');
  const barRects = barSvg.querySelectorAll('rect');
  // x-axis labels are HTML overlays next to the SVG, so they don't stretch with it
  const barLabels = barSvg.parentNode.querySelectorAll(':scope > [style-tone="muted"]');

  assert(
    barSvg !== null && barRects.length >= 4,
    'ChartBars: Math engine successfully maps Data to SVG <rect> elements'
  );

  assert(
    barLabels.length === 2 && barLabels[0].textContent === 'A',
    'ChartBars: Renders XAxis text labels correctly'
  );

  // LINE CHART TESTS
  const lineChartInner = appNode.querySelector('[data-testid="chart-line"]');
  const polylines = lineChartInner.querySelectorAll('polyline');

  assert(
    polylines.length === 1 && polylines[0].getAttribute('points').includes(','),
    'ChartLine: Generates SVG <polyline> with correct coordinate pairs'
  );

  const emptyLine = appNode.querySelector('[data-testid="chart-line-empty"]');
  assert(
    emptyLine.querySelectorAll('polyline').length === 0 &&
    emptyLine.textContent.includes('Not enough data') &&
    !emptyLine.textContent.includes('metric1'),
    'ChartLine: Below minPoints shows the empty state instead of lines, axis and legend'
  );

  // PIE CHART & INTERACTIVITY TESTS
  const pieChartInner = appNode.querySelector('[data-testid="chart-pie"]');
  const arcs = pieChartInner.querySelectorAll('path');

  assert(
    arcs.length === 2 && arcs[0].getAttribute('d').includes('A'),
    'ChartPie: Calculates angles and draws valid SVG <path> arc commands'
  );

  // Hover is hit-tested from the pointer position: point inside slice A (0-144 degrees from the top)
  const pieSvg = pieChartInner.querySelector('svg');
  const angle = (72 - 90) * Math.PI / 180;
  const inA = new DOMPoint(150 + 78 * Math.cos(angle), 150 + 78 * Math.sin(angle)).matrixTransform(pieSvg.getScreenCTM());
  arcs[0].dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: inA.x, clientY: inA.y }));
  await nextTick();

  const tooltipDiv = pieChartInner.querySelector('[style-layer="overlay"]');

  assert(
    tooltipDiv !== null && tooltipDiv.textContent.includes('A') && tooltipDiv.textContent.includes('100'),
    'ChartTooltip: Reactively renders tooltip overlay with correct data on pointermove'
  );

  // Leaving the SVG (pointerout to an element outside it) clears the hover
  arcs[0].dispatchEvent(new PointerEvent('pointerout', { bubbles: true, relatedTarget: document.body }));
  await nextTick();

  assert(
    pieChartInner.querySelector('[style-layer="overlay"]') === null,
    'ChartTooltip: Reactively unmounts tooltip when the pointer leaves the chart'
  );

  // RADIAL & RADAR TESTS
  const radialChartInner = appNode.querySelector('[data-testid="chart-radial"]');
  assert(
    radialChartInner.querySelectorAll('path').length > 0,
    'ChartRadial: Renders radial track paths successfully'
  );

  const radarChartInner = appNode.querySelector('[data-testid="chart-radar"]');
  const radarGridCircles = radarChartInner.querySelectorAll('polygon, circle');
  const radarDataPolygons = Array.from(radarChartInner.querySelectorAll('polygon')).filter(p => !p.getAttribute('fill')?.includes('none'));

  assert(
    radarGridCircles.length > 0 && radarDataPolygons.length > 0,
    'ChartRadar: Renders polar grid and data <polygon> elements'
  );
}
