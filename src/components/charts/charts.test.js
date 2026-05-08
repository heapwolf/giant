
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
  metric2: { label: 'Secondary Metric', color: 'rgb(0, 0, 255)' }
};

// --- TEST UI SETUP ---
const ChartsTestApp = component.ChartsTestApp(() => {
  return div({ class: 'charts-test-wrapper', style: { display: 'flex', flexDirection: 'column', gap: '40px' } },

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

  // ==========================================
  // --- CSS VARIABLE INJECTION ---
  // ==========================================
  const barContainerInner = appNode.querySelector('[data-testid="container-bar"]');

  assert(
    barContainerInner &&
    barContainerInner.style.getPropertyValue('--color-metric1') === 'rgb(255, 0, 0)' &&
    barContainerInner.style.getPropertyValue('--color-metric2') === 'rgb(0, 0, 255)',
    'ChartContainer: Successfully injects config colors as CSS variables'
  );

  // ==========================================
  // --- BAR CHART TESTS ---
  // ==========================================
  const barChartInner = appNode.querySelector('[data-testid="chart-bar"]');
  const barSvg = barChartInner.querySelector('svg');
  const barRects = barSvg.querySelectorAll('rect');
  const barTexts = barSvg.querySelectorAll('text');

  assert(
    barSvg !== null && barRects.length >= 4,
    'ChartBars: Math engine successfully maps Data to SVG <rect> elements'
  );

  assert(
    barTexts.length === 2 && barTexts[0].textContent === 'A',
    'ChartBars: Renders XAxis text labels correctly'
  );

  // ==========================================
  // --- LINE CHART TESTS ---
  // ==========================================
  const lineChartInner = appNode.querySelector('[data-testid="chart-line"]');
  const polylines = lineChartInner.querySelectorAll('polyline');

  assert(
    polylines.length === 1 && polylines[0].getAttribute('points').includes(','),
    'ChartLine: Generates SVG <polyline> with correct coordinate pairs'
  );

  // ==========================================
  // --- PIE CHART & INTERACTIVITY TESTS ---
  // ==========================================
  const pieChartInner = appNode.querySelector('[data-testid="chart-pie"]');
  const arcs = pieChartInner.querySelectorAll('path');

  assert(
    arcs.length === 2 && arcs[0].getAttribute('d').includes('A'),
    'ChartPie: Calculates angles and draws valid SVG <path> arc commands'
  );

  // Simulate pointer enter on the first arc to test tooltip reactivity
  arcs[0].dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
  await nextTick();

  // The tooltip is a div sibling to the SVG inside the targeted container
  const tooltipDiv = Array.from(pieChartInner.children).find(el => el.tagName === 'DIV' && el.style.zIndex == '50');

  assert(
    tooltipDiv !== undefined && tooltipDiv.textContent.includes('A') && tooltipDiv.textContent.includes('100'),
    'ChartTooltip: Reactively renders tooltip overlay with correct data on pointerenter'
  );

  // Simulate pointer leave
  arcs[0].dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
  await nextTick();

  const tooltipDivAfterLeave = Array.from(pieChartInner.children).find(el => el.tagName === 'DIV' && el.style.zIndex == '50');
  assert(
    tooltipDivAfterLeave === undefined,
    'ChartTooltip: Reactively unmounts tooltip on pointerleave'
  );

  // ==========================================
  // --- RADIAL & RADAR TESTS ---
  // ==========================================
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
