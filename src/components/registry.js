import { component, match } from '../../giant.js';

import { Button } from './button/button.js';
import { Text } from './text/text.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card/card.js';
import { ColorPicker } from './colorpicker/colorpicker.js';
import { Input, InputGroup, InputLeftAddon, InputRightAddon } from './input/input.js';
import { Label } from './label/label.js';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogAction, DialogCancel } from './dialog/dialog.js';
import { Alert, AlertTitle, AlertDescription } from './alert/alert.js';
import { Badge } from './badge/badge.js';
import { Checkbox, CheckboxIndicator } from './checkbox/checkbox.js';
import { Switch } from './switch/switch.js';
import { Dropdown } from './dropdown/dropdown.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs/tabs.js';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion/accordion.js';
import { Avatar, AvatarImage, AvatarFallback } from './avatar/avatar.js';
import { Progress } from './progress/progress.js';
import { VTable } from './vtable/vtable.js';
import { Separator } from './separator/separator.js';
import { Spinner } from './spinner/spinner.js';
import { Textarea } from './textarea/textarea.js';
import { Toaster, toast } from './toast/toast.js';
import { Tooltip } from './tooltip/tooltip.js';
import { Slider } from './slider/slider.js';
import { Radio, RadioItem } from './radio/radio.js';
import { Tree } from './tree/tree.js';
import { SplitLayout } from './split/split.js';
import { CreditCardInput } from './creditcardinput/creditcardinput.js';
import { Menu } from './menu/menu.js';
import {
  ChartContainer, ChartBars, ChartLine, ChartPie, ChartRadar, CartesianGrid, XAxis, PolarGrid, PolarAngleAxis,
  ChartTooltip, ChartLegend, ChartRadial, RadialBar, Bar, Line, Pie, Radar
} from './charts/charts.js';

const clean = (s = '') => s.replace(/\s+/g, ' ').trim();

// "[name=default]" → { name, defaultValue, isOptional }
const parseName = (raw) => {
  let name = raw.trim();
  let defaultValue = null;
  const isOptional = name.startsWith('[') && name.endsWith(']');
  if (isOptional) {
    name = name.slice(1, -1);
    const eq = name.indexOf('=');
    if (eq !== -1) {
      defaultValue = name.slice(eq + 1).trim();
      name = name.slice(0, eq).trim();
    }
  }
  if (/^(['"]).*\1$/.test(name)) name = name.slice(1, -1);
  return { name, defaultValue, isOptional };
};

// Reads @prop/@param and @method JSDoc tags from a component's source.
export function introspectComponent(compFn) {
  if (!compFn) return { props: null, methods: null };

  const source = (compFn.rawFn || compFn.raw || compFn.render || compFn).toString();
  const props = [];
  const methods = [];

  const addProp = (entry) => {
    if (!entry.name || ['props', 'children', 'e'].includes(entry.name) || entry.name.startsWith('...')) return;
    const existing = props.find((p) => p.name === entry.name);
    if (!existing) return props.push(entry);
    existing.type ||= entry.type;
    existing.defaultValue ??= entry.defaultValue;
    existing.isOptional ||= entry.isOptional;
    existing.description ||= entry.description;
  };

  for (const block of source.matchAll(/\/\*\*([\s\S]*?)\*\//g)) {
    let current = null;
    const flush = () => { if (current?.kind === 'prop') addProp(current.entry); current = null; };

    for (const rawLine of block[1].split('\n')) {
      const line = rawLine.replace(/^\s*\*\s?/, '').trim();

      const prop = line.match(/^@(?:prop|property|param)\s+\{([^}]+)\}\s+(\[[^\]]+\]|"[^"]+"|'[^']+'|[^\s]+)(?:\s*-\s*(.*))?$/);
      if (prop) {
        flush();
        current = { kind: 'prop', entry: { ...parseName(prop[2]), type: clean(prop[1]), description: clean(prop[3]) } };
        continue;
      }

      const method = line.match(/^@method\s+([a-zA-Z0-9_$]+)\(([^)]*)\)(?:\s*-\s*(.*))?$/);
      if (method) {
        flush();
        const entry = { name: method[1], args: method[2].trim(), description: clean(method[3]) };
        methods.push(entry);
        current = { kind: 'method', entry };
        continue;
      }

      if (current && line && !line.startsWith('@')) current.entry.description += ' ' + clean(line);
    }
    flush();
  }

  return { props: props.length ? props : null, methods: methods.length ? methods : null };
}

// Turns a demo function into a copy-pasteable snippet with its imports.
const autoFormatCode = (fn, exports = [], filepath = '') => {
  if (typeof fn !== 'function') return '';

  const raw = fn.toString();
  const [first, ...rest] = raw.split('\n');
  const indents = rest.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length);
  const minIndent = indents.length ? Math.min(...indents) : 0;
  const formatted = [first, ...rest.map((l) => l.slice(minIndent))].join('\n').trim();

  let imports = raw.includes('match') ? `import { match } from './giant.js';\n` : '';
  const names = exports.map((ex) => ex.name).filter(Boolean);
  if (names.length && filepath) imports += `import { ${names.join(', ')} } from './${filepath.split('/').pop()}';\n`;

  return imports ? `${imports}\n${formatted}` : formatted;
};

// `code` follows the variant the ComponentViewer has selected (_activeVariantIndex).
const documentComponent = (config) => {
  if (config.code || !config.render) return config;
  return Object.defineProperty({ ...config }, 'code', {
    get() {
      const fn = Array.isArray(this.render) ? this.render[this._activeVariantIndex || 0] : this.render;
      return autoFormatCode(fn, this.exports, this.filepath);
    },
    enumerable: true,
    configurable: true
  });
};

export const COMPONENTS = [

  documentComponent({
    id: 'Accordion',
    title: 'Accordion',
    description: 'Expandable panels for managing vertical space.',
    filepath: './accordion/accordion.js',
    imports: "{ Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion/accordion.js'",
    a11y: "aria-expanded, aria-controls, keyboard nav",
    state: "Internal State or Controlled",
    exports: [Accordion, AccordionItem, AccordionTrigger, AccordionContent],
    render: [
      // Only one item open at a time; clicking the open item collapses it.
      function AccordionSingle(state) {
        return Accordion({ type: 'single', collapsible: true, 'style-width': 'full', 'style-max-width': 'medium' },
          AccordionItem({ value: 'item-1' }, AccordionTrigger('Is it accessible?'), AccordionContent({ 'style-tone': 'muted' }, 'Yes. It follows WAI-ARIA design patterns.')),
          AccordionItem({ value: 'item-2' }, AccordionTrigger('Is it styled?'), AccordionContent({ 'style-tone': 'muted' }, 'Yes. It comes with default styles.')),
          AccordionItem({ value: 'item-3' }, AccordionTrigger('Is it animated?'), AccordionContent({ 'style-tone': 'muted' }, 'Yes. It has smooth animations.'))
        );
      },

      // Several items can be open at once.
      function AccordionMultiple(state) {
        return Accordion({ type: 'multiple', 'style-width': 'full', 'style-max-width': 'medium' },
          AccordionItem({ value: 'item-1' }, AccordionTrigger('Is it accessible?'), AccordionContent({ 'style-tone': 'muted' }, 'Yes. It follows WAI-ARIA design patterns.')),
          AccordionItem({ value: 'item-2' }, AccordionTrigger('Is it styled?'), AccordionContent({ 'style-tone': 'muted' }, 'Yes. It comes with default styles.')),
          AccordionItem({ value: 'item-3' }, AccordionTrigger('Is it animated?'), AccordionContent({ 'style-tone': 'muted' }, 'Yes. It has smooth animations.'))
        );
      },

      // Starts open on item 2; one item always stays open.
      function AccordionNonCollapsible(state) {
        return Accordion({ type: 'single', collapsible: false, defaultValue: 'item-2', 'style-width': 'full', 'style-max-width': 'medium' },
          AccordionItem({ value: 'item-1' }, AccordionTrigger('Is it accessible?'), AccordionContent({ 'style-tone': 'muted' }, 'Yes. It follows WAI-ARIA design patterns.')),
          AccordionItem({ value: 'item-2' }, AccordionTrigger('Is it styled?'), AccordionContent({ 'style-tone': 'muted' }, 'Yes. It comes with default styles.')),
          AccordionItem({ value: 'item-3' }, AccordionTrigger('Is it animated?'), AccordionContent({ 'style-tone': 'muted' }, 'Yes. It has smooth animations.'))
        );
      }
    ]
  }),

  documentComponent({
    id: 'Alert',
    title: 'Alert',
    description: 'Visual callouts for statuses and important messages.',
    filepath: './alert/alert.js',
    imports: "{ Alert } from './alert/alert.js'",
    a11y: "role=\"alert\" on destructive alerts",
    state: "Stateless (Pure UI)",
    exports: [Alert, AlertTitle, AlertDescription],
    render: function AlertsExample(state) {
      return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-width': 'full' },
        Alert(AlertTitle('Heads up!'), AlertDescription('You can add components to your app.')),
        Alert({ variant: 'destructive' }, AlertTitle('Error'), AlertDescription('Something went wrong.'))
      );
    }
  }),

  documentComponent({
    id: 'Button',
    title: 'Button',
    description: 'Interactive elements for user actions.',
    filepath: './button/button.js',
    imports: "{ Button } from './button/button.js'",
    a11y: "Native <button> focus management & semantics",
    state: "Stateless (Pure UI)",
    exports: [Button],
    render: function ButtonExample(state) {
      return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-align': 'center', 'style-width': 'full' },
        div({ 'style-layout': 'cluster', 'style-gap': 'medium', 'style-justify': 'center' },
          Button('Primary'),
          Button({ variant: 'secondary' }, 'Secondary'),
          Button({ disabled: true }, 'Disabled'),
          Button({ variant: 'outline' }, 'Outline'),
          Button({ variant: 'ghost' }, 'Ghost'),
          Button({ variant: 'link' }, 'Link'),
          Button({ variant: 'destructive' }, 'Destructive'),
          Button({ variant: 'attention' }, 'Attention')
        ),
        div({ 'style-layout': 'cluster', 'style-gap': 'medium', 'style-justify': 'center' },
          Button({ size: 'sm' }, 'Small'),
          Button({ size: 'md' }, 'Medium'),
          Button({ size: 'lg' }, 'Large'),
          Button({ size: 'icon' }, '♥︎')
        )
      );
    }
  }),

  documentComponent({
    id: 'Card',
    title: 'Card',
    description: 'A container with a header, content, and footer.',
    filepath: './card/card.js',
    imports: "{ Card, CardHeader, CardTitle... } from './card/card.js'",
    a11y: "Role=\"region\" (optional via props)",
    state: "Stateless (Pure UI)",
    exports: [Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter],
    render: [
      function CardExample(state) {
        return Card(
          CardHeader(CardTitle('Card Title'), CardDescription('Card description goes here')),
          CardContent('This is the card content area.'),
          CardFooter(Button({ variant: 'outline' }, 'Cancel'), Button('Save'))
        );
      },

      // variant: default | outline | transparent | sunk
      function CardVariants(state) {
        return div({ 'style-layout': 'grid', 'style-gap': 'medium', 'style-width': 'full' },
          ...['default', 'outline', 'transparent', 'sunk'].map((variant) => Card({ variant }, CardHeader(CardTitle(variant))))
        );
      }
    ]
  }),

  documentComponent({
    id: 'Charts',
    title: 'Charts',
    description: 'Composable charts utilizing native SVG rendering and decoupled configuration generators.',
    filepath: './charts/charts.js',
    imports: "import { ChartContainer, ChartBars, ChartLine, ChartPie, ChartRadar, ChartRadial, CartesianGrid, XAxis, PolarGrid, PolarAngleAxis, ChartTooltip, ChartLegend, Bar, Line, Pie, Radar, RadialBar } from './charts.js'",
    exports: [ChartContainer, ChartBars, ChartLine, ChartPie, ChartRadar, ChartRadial, CartesianGrid, XAxis, PolarGrid, PolarAngleAxis, ChartTooltip, ChartLegend, Bar, Line, Pie, Radar, RadialBar],
    render: [
      function BarChartExample(state) {
        const chartData = [
          { month: "January", desktop: 186 }, { month: "February", desktop: 305 },
          { month: "March", desktop: 237 }, { month: "April", desktop: 73 },
          { month: "May", desktop: 209 }, { month: "June", desktop: 214 },
        ];
        const chartConfig = { desktop: { label: "Desktop", color: 'var(--series-1)' } };

        return Card({ 'style-width': 'full', 'style-max-width': 'large' },
          CardHeader(CardTitle('Bar Chart - Simple')),
          CardContent(
            ChartContainer({ config: chartConfig, style: { height: '250px' } },
              ChartBars({ data: chartData, config: chartConfig },
                CartesianGrid({ vertical: false }),
                XAxis({ dataKey: 'month', tickFormatter: (value) => value.slice(0, 3) }),
                ChartTooltip({ cursor: true }),
                Bar({ dataKey: 'desktop', radius: 4 })
              )
            )
          )
        );
      },

      function LineChartExample(state) {
        const chartData = [
          { month: "January", desktop: 186, mobile: 80 }, { month: "February", desktop: 305, mobile: 200 },
          { month: "March", desktop: 237, mobile: 120 }, { month: "April", desktop: 73, mobile: 190 },
          { month: "May", desktop: 209, mobile: 130 }, { month: "June", desktop: 214, mobile: 140 },
        ];
        const chartConfig = {
          desktop: { label: "Desktop", color: 'var(--series-1)' },
          mobile: { label: "Mobile", color: 'var(--series-2)' }
        };

        return Card({ 'style-width': 'full', 'style-max-width': 'large' },
          CardHeader(CardTitle('Line Chart - Multiple')),
          CardContent(
            ChartContainer({ config: chartConfig, style: { height: '250px' } },
              ChartLine({ data: chartData, config: chartConfig },
                CartesianGrid({ vertical: false }),
                XAxis({ dataKey: 'month', tickFormatter: (value) => value.slice(0, 3) }),
                ChartTooltip({ cursor: true }),
                Line({ dataKey: 'desktop', strokeWidth: 2 }),
                Line({ dataKey: 'mobile', strokeWidth: 2 })
              )
            )
          )
        );
      },

      function DonutChartExample(state) {
        const chartData = [
          { browser: "Chrome", visitors: 275, fill: 'var(--series-1)' },
          { browser: "Safari", visitors: 200, fill: 'var(--series-2)' },
          { browser: "Firefox", visitors: 187, fill: 'var(--series-3)' },
          { browser: "Edge", visitors: 173, fill: 'var(--series-4)' },
          { browser: "Other", visitors: 90, fill: 'var(--series-5)' },
        ];
        const chartConfig = { visitors: { label: "Visitors" } };

        return Card({ 'style-width': 'full', 'style-max-width': 'large' },
          CardHeader({ 'style-align': 'center' }, CardTitle('Donut Chart')),
          CardContent({ 'style-layout': 'row', 'style-justify': 'center' },
            ChartContainer({ config: chartConfig, style: { height: '300px', width: '300px' } },
              ChartPie({ data: chartData, config: chartConfig, width: 300, height: 300 },
                ChartTooltip(),
                Pie({ dataKey: 'visitors', nameKey: 'browser', innerRadius: 80 })
              )
            )
          )
        );
      },

      function RadarChartExplorer(state) {
        if (!state.radarSetup) {
          Object.assign(state, {
            radarGrid: true, radarGridType: 'polygon', radarGridFilled: false, radarRadialLines: true,
            radarDots: false, radarLinesOnly: false, radarMultiple: false, radarLegend: false, radarSetup: true
          });
        }

        const chartData = [
          { month: "January", desktop: 186, mobile: 80 }, { month: "February", desktop: 305, mobile: 200 },
          { month: "March", desktop: 237, mobile: 120 }, { month: "April", desktop: 73, mobile: 190 },
          { month: "May", desktop: 209, mobile: 130 }, { month: "June", desktop: 214, mobile: 140 },
        ];
        const chartConfig = {
          desktop: { label: "Desktop", color: 'var(--series-1)' },
          mobile: { label: "Mobile", color: 'var(--series-2)' }
        };

        const Toggle = (label, key) => div({ 'style-layout': 'row', 'style-justify': 'between', 'style-width': 'full' },
          Label(label),
          Switch({ checked: state[key], onChange: (checked) => { state[key] = checked; } })
        );
        const fillOpacity = state.radarLinesOnly ? 0 : 0.6;

        return Card({ 'style-width': 'full', 'style-max-width': 'xlarge' },
          CardHeader(CardTitle('Radar Chart Explorer'), CardDescription('Toggle properties to test all radar variations.')),
          CardContent({ 'style-layout': 'cluster', 'style-align': 'stretch', 'style-gap': 'xlarge' },
            div({ 'style-layout': 'stack', 'style-gap': 'small', 'style-flex': 'grow', 'style-divider': 'end', 'style-pad-inline': 'medium', style: { minWidth: '220px' } },
              Toggle('Show Grid', 'radarGrid'),
              div({ 'style-layout': 'row', 'style-justify': 'between', 'style-width': 'full' },
                Label('Grid Type: Circle'),
                Switch({ checked: state.radarGridType === 'circle', onChange: (checked) => { state.radarGridType = checked ? 'circle' : 'polygon'; } })
              ),
              Toggle('Filled Grid', 'radarGridFilled'),
              Toggle('Radial Lines', 'radarRadialLines'),
              Separator(),
              Toggle('Show Dots', 'radarDots'),
              Toggle('Lines Only (No Fill)', 'radarLinesOnly'),
              Toggle('Multiple Series', 'radarMultiple'),
              Toggle('Show Legend', 'radarLegend')
            ),
            div({ 'style-layout': 'row', 'style-justify': 'center', 'style-flex': 'grow', style: { minWidth: '300px' } },
              ChartContainer({ config: chartConfig, 'style-width': 'full', 'style-max-width': 'medium', style: { height: '350px' } },
                ChartRadar({ data: chartData, config: chartConfig, width: 400, height: 350 },
                  ChartTooltip(),
                  state.radarGrid && PolarGrid({
                    gridType: state.radarGridType,
                    filled: state.radarGridFilled,
                    stroke: 'var(--border)',
                    radialLines: state.radarRadialLines
                  }),
                  PolarAngleAxis({ dataKey: 'month' }),
                  Radar({ dataKey: 'desktop', dot: state.radarDots, fillOpacity }),
                  state.radarMultiple && Radar({ dataKey: 'mobile', dot: state.radarDots, fillOpacity }),
                  state.radarLegend && ChartLegend()
                )
              )
            )
          )
        );
      },

      function RadialChartStandard(state) {
        const data = [
          { browser: "Chrome", visitors: 275, fill: 'var(--series-1)' },
          { browser: "Safari", visitors: 200, fill: 'var(--series-2)' },
          { browser: "Firefox", visitors: 187, fill: 'var(--series-3)' },
          { browser: "Edge", visitors: 173, fill: 'var(--series-4)' },
          { browser: "Other", visitors: 90, fill: 'var(--series-5)' },
        ];

        return Card({ 'style-width': 'full', 'style-max-width': 'medium' },
          CardHeader(CardTitle('Radial Chart'), CardDescription('January - June 2024')),
          CardContent({ 'style-layout': 'row', 'style-justify': 'center' },
            ChartContainer({ config: { visitors: { label: "Visitors" } }, style: { height: '300px', width: '300px' } },
              ChartRadial({ data, width: 300, height: 300, innerRadius: '30%', outerRadius: '90%' },
                ChartTooltip(),
                RadialBar({ dataKey: 'visitors', nameKey: 'browser' })
              )
            )
          ),
          CardFooter({ 'style-layout': 'stack', 'style-align': 'center', 'style-gap': 'small', 'style-text': 'small' },
            div({ 'style-weight': 'medium' }, "Trending up by 5.2% this month ↗"),
            div({ 'style-tone': 'muted' }, "Showing total visitors for the last 6 months")
          )
        );
      },

      function RadialChartLabel(state) {
        const data = [
          { browser: "Chrome", visitors: 275, fill: 'var(--series-1)' },
          { browser: "Safari", visitors: 200, fill: 'var(--series-2)' },
          { browser: "Firefox", visitors: 187, fill: 'var(--series-3)' },
          { browser: "Edge", visitors: 173, fill: 'var(--series-4)' },
          { browser: "Other", visitors: 90, fill: 'var(--series-5)' },
        ];

        return Card({ 'style-width': 'full', 'style-max-width': 'medium' },
          CardHeader(CardTitle('Radial Chart - Label'), CardDescription('January - June 2024')),
          CardContent({ 'style-layout': 'row', 'style-justify': 'center' },
            ChartContainer({ config: { visitors: { label: "Visitors" } }, style: { height: '300px', width: '300px' } },
              ChartRadial({ data, width: 300, height: 300, innerRadius: '30%', outerRadius: '90%' },
                ChartTooltip(),
                RadialBar({ dataKey: 'visitors', nameKey: 'browser', label: true })
              )
            )
          ),
          CardFooter({ 'style-layout': 'stack', 'style-align': 'center', 'style-gap': 'small', 'style-text': 'small' },
            div({ 'style-weight': 'medium' }, "Trending up by 5.2% this month ↗"),
            div({ 'style-tone': 'muted' }, "Showing total visitors for the last 6 months")
          )
        );
      },

      function RadialChartGrid(state) {
        const data = [
          { browser: "Chrome", visitors: 275, fill: 'var(--series-1)' },
          { browser: "Safari", visitors: 200, fill: 'var(--series-2)' },
          { browser: "Firefox", visitors: 187, fill: 'var(--series-3)' },
        ];

        return Card({ 'style-width': 'full', 'style-max-width': 'medium' },
          CardHeader(CardTitle('Radial Chart - Grid'), CardDescription('January - June 2024')),
          CardContent({ 'style-layout': 'row', 'style-justify': 'center' },
            ChartContainer({ config: { visitors: { label: "Visitors" } }, style: { height: '300px', width: '300px' } },
              ChartRadial({ data, width: 300, height: 300, innerRadius: '30%', outerRadius: '90%' },
                PolarGrid({ gridLines: 12 }),
                ChartTooltip(),
                RadialBar({ dataKey: 'visitors', nameKey: 'browser' })
              )
            )
          ),
          CardFooter({ 'style-layout': 'stack', 'style-align': 'center', 'style-gap': 'small', 'style-text': 'small' },
            div({ 'style-weight': 'medium' }, "Trending up by 5.2% this month ↗"),
            div({ 'style-tone': 'muted' }, "Showing total visitors for the last 6 months")
          )
        );
      },

      function RadialChartText(state) {
        const data = [{ browser: "Safari", visitors: 200, fill: 'var(--series-1)' }];

        return Card({ 'style-width': 'full', 'style-max-width': 'medium' },
          CardHeader(CardTitle('Radial Chart - Text'), CardDescription('January - June 2024')),
          CardContent({ 'style-layout': 'row', 'style-justify': 'center' },
            ChartContainer({ config: { visitors: { label: "Visitors" } }, 'style-position': 'relative', style: { height: '300px', width: '300px' } },
              ChartRadial({ data, max: 250, width: 300, height: 300, innerRadius: '70%', outerRadius: '80%' },
                ChartTooltip(),
                RadialBar({ dataKey: 'visitors', nameKey: 'browser' })
              ),
              div({ 'style-position': 'absolute', 'style-inset': 'fill', 'style-layout': 'stack', 'style-justify': 'center', 'style-align': 'center', 'style-interactive': 'inert' },
                div({ 'style-weight': 'bold', 'style-text': 'xxlarge', 'style-leading': 'tight' }, "200"),
                div({ 'style-tone': 'muted', 'style-text': 'small' }, "Visitors")
              )
            )
          ),
          CardFooter({ 'style-layout': 'stack', 'style-align': 'center', 'style-gap': 'small', 'style-text': 'small' },
            div({ 'style-weight': 'medium' }, "Trending up by 5.2% this month ↗"),
            div({ 'style-tone': 'muted' }, "Showing total visitors for the last 6 months")
          )
        );
      },

      // Semi-circle: 270° (left) to 450° (right), sweeping over the top.
      function RadialChartShape(state) {
        const data = [{ browser: "Safari", visitors: 1260, fill: 'var(--series-1)' }];

        return Card({ 'style-width': 'full', 'style-max-width': 'medium' },
          CardHeader(CardTitle('Radial Chart - Shape'), CardDescription('January - June 2024')),
          CardContent({ 'style-layout': 'row', 'style-justify': 'center' },
            ChartContainer({ config: { visitors: { label: "Visitors" } }, 'style-position': 'relative', style: { height: '220px', width: '300px' } },
              ChartRadial({ data, max: 2000, width: 300, height: 250, startAngle: 270, endAngle: 450, innerRadius: '70%', outerRadius: '85%' },
                ChartTooltip(),
                RadialBar({ dataKey: 'visitors', nameKey: 'browser' })
              ),
              div({ 'style-position': 'absolute', 'style-inset': 'fill', 'style-layout': 'stack', 'style-justify': 'end', 'style-align': 'center', 'style-pad-block': 'xxlarge', 'style-interactive': 'inert' },
                div({ 'style-weight': 'bold', 'style-text': 'xxlarge', 'style-leading': 'tight' }, "1,260"),
                div({ 'style-tone': 'muted', 'style-text': 'small' }, "Visitors")
              )
            )
          ),
          CardFooter({ 'style-layout': 'stack', 'style-align': 'center', 'style-gap': 'small', 'style-text': 'small' },
            div({ 'style-weight': 'medium' }, "Trending up by 5.2% this month ↗"),
            div({ 'style-tone': 'muted' }, "Showing total visitors for the last 6 months")
          )
        );
      },

      function RadialChartStacked(state) {
        const data = [
          { segment: "Mobile", visitors: 800, fill: 'var(--series-1)' },
          { segment: "Desktop", visitors: 600, fill: 'var(--series-2)' },
          { segment: "Tablet", visitors: 430, fill: 'var(--series-3)' }
        ];

        return Card({ 'style-width': 'full', 'style-max-width': 'medium' },
          CardHeader(CardTitle('Radial Chart - Stacked'), CardDescription('January - June 2024')),
          CardContent({ 'style-layout': 'row', 'style-justify': 'center' },
            ChartContainer({ config: { visitors: { label: "Visitors" } }, 'style-position': 'relative', style: { height: '220px', width: '300px' } },
              ChartRadial({ data, stacked: true, width: 300, height: 250, startAngle: 270, endAngle: 450, innerRadius: '65%', outerRadius: '85%' },
                ChartTooltip(),
                RadialBar({ dataKey: 'visitors', nameKey: 'segment' })
              ),
              div({ 'style-position': 'absolute', 'style-inset': 'fill', 'style-layout': 'stack', 'style-justify': 'end', 'style-align': 'center', 'style-pad-block': 'xxlarge', 'style-interactive': 'inert' },
                div({ 'style-weight': 'bold', 'style-text': 'xxlarge', 'style-leading': 'tight' }, "1,830"),
                div({ 'style-tone': 'muted', 'style-text': 'small' }, "Visitors")
              )
            )
          ),
          CardFooter({ 'style-layout': 'stack', 'style-align': 'center', 'style-gap': 'small', 'style-text': 'small' },
            div({ 'style-weight': 'medium' }, "Trending up by 5.2% this month ↗"),
            div({ 'style-tone': 'muted' }, "Showing total visitors for the last 6 months")
          )
        );
      }
    ]
  }),

  documentComponent({
    id: 'ColorPicker',
    title: 'Color Picker',
    description: 'A highly interactive, Figma-inspired color picker. Features a 2D saturation/brightness drag area, hue and alpha sliders, hex/rgba toggles, and an awaitable open() API.',
    filepath: './colorpicker/colorpicker.js',
    imports: "{ ColorPicker } from './colorpicker/colorpicker.js'",
    a11y: "Pointer event management for touch/mouse drag surfaces, dialog focus trapping.",
    state: "Controlled via awaitable open(initialColor) API, internal HSV/RGBA state.",
    exports: [ColorPicker],
    render: [
      function BasicUsage() {
        const picker = ColorPicker({});

        const handlePick = async (e) => {
          const row = e.target.closest('[data-demo-row]');
          const swatch = row.querySelector('.color-swatch');
          const label = row.querySelector('.color-text');
          const result = await picker.open(label.textContent);
          if (result) { swatch.style.backgroundColor = result; label.textContent = result; }
        };

        return div({ 'data-demo-row': true, 'style-layout': 'row', 'style-gap': 'medium', 'style-pad-block': 'xlarge', 'style-pad-inline': 'medium' },
          Button({ onclick: handlePick },
            div({ class: 'color-swatch', 'style-size': 'xsmall', 'style-radius': 'round', 'style-border': 'thin', style: { backgroundColor: '#4F46E5' } }),
            'Pick Color'
          ),
          span({ class: 'color-text', 'style-font': 'mono', 'style-text': 'small', 'style-tone': 'muted' }, '#4F46E5'),
          picker
        );
      },

      function AlphaTransparency() {
        const picker = ColorPicker({});
        const checkerboard = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><path fill="%23e5e7eb" d="M0 0h4v4H0zm4 4h4v4H4z"/></svg>')`;

        const handlePick = async (e) => {
          const row = e.target.closest('[data-demo-row]');
          const swatch = row.querySelector('.color-swatch');
          const label = row.querySelector('.color-text');
          const result = await picker.open(label.textContent);
          if (result) { swatch.style.backgroundColor = result; label.textContent = result; }
        };

        return div({ 'data-demo-row': true, 'style-layout': 'row', 'style-gap': 'medium', 'style-pad-block': 'xlarge', 'style-pad-inline': 'medium' },
          Button({ onclick: handlePick },
            div({ 'style-size': 'xsmall', 'style-radius': 'round', style: { backgroundImage: checkerboard } },
              div({ class: 'color-swatch', 'style-width': 'full', 'style-height': 'full', 'style-radius': 'round', style: { backgroundColor: 'rgba(239, 68, 68, 0.5)' } })
            ),
            'Pick with Alpha'
          ),
          span({ class: 'color-text', 'style-font': 'mono', 'style-text': 'small', 'style-tone': 'muted' }, 'rgba(239, 68, 68, 0.5)'),
          picker
        );
      },

      function CustomBackdrop() {
        const picker = ColorPicker({
          style: { backgroundColor: 'color-mix(in oklch, var(--success) 10%, transparent)', backdropFilter: 'blur(8px)' }
        });

        const handlePick = async (e) => {
          const row = e.target.closest('[data-demo-row]');
          const swatch = row.querySelector('.color-swatch');
          const label = row.querySelector('.color-text');
          const result = await picker.open(label.textContent);
          if (result) { swatch.style.backgroundColor = result; label.textContent = result; }
        };

        return div({ 'data-demo-row': true, 'style-layout': 'row', 'style-gap': 'medium', 'style-pad-block': 'xlarge', 'style-pad-inline': 'medium' },
          Button({ onclick: handlePick },
            div({ class: 'color-swatch', 'style-size': 'xsmall', 'style-radius': 'round', 'style-border': 'thin', style: { backgroundColor: '#10B981' } }),
            'Custom Backdrop Filter'
          ),
          span({ class: 'color-text', hidden: true }, '#10B981'),
          picker
        );
      }
    ]
  }),

  documentComponent({
    id: 'Inputs',
    title: 'Inputs',
    description: 'Standard text inputs, textareas, and input groups.',
    filepath: './input/input.js',
    imports: "{ Input, InputGroup... } from './input/input.js'",
    a11y: "aria-invalid, aria-describedby binding",
    state: "Controlled or Uncontrolled",
    exports: [Input, InputGroup, InputLeftAddon, InputRightAddon, Label, Textarea],
    render: [
      function StandardInputs(state) {
        return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-width': 'full', 'style-max-width': 'medium' },
          div({ 'style-layout': 'stack', 'style-gap': 'small' },
            Label('Email'),
            Input({ id: 'demo-email-input', type: 'email', placeholder: 'Enter your email' })
          ),
          div({ 'style-layout': 'stack', 'style-gap': 'small' },
            Label('Password'),
            Input({ id: 'demo-password-input', type: 'password', placeholder: 'Enter password', errorMessage: 'Password must be at least 8 characters' })
          )
        );
      },

      function InputGroups(state) {
        return div({ 'style-layout': 'stack', 'style-gap': 'small', 'style-width': 'full', 'style-max-width': 'medium' },
          Label('Search'),
          InputGroup({ id: 'demo-search-group' },
            span({ 'style-layout': 'row', 'style-tone': 'muted', 'style-pad-inline': 'small', 'style-flex': 'none' }, '🔍'),
            Input({ id: 'demo-search-input', variant: 'ghost', placeholder: 'Search...', 'style-pad-inline': 'xsmall' })
          )
        );
      },

      function Textareas(state) {
        return div({ 'style-layout': 'stack', 'style-gap': 'small', 'style-width': 'full', 'style-max-width': 'medium' },
          Label('Message'),
          Textarea({ id: 'demo-message-textarea', placeholder: 'Enter your message', rows: 4 })
        );
      }
    ]
  }),

  documentComponent({
    id: 'Checkbox',
    title: 'Checkbox',
    description: 'A button-based checkbox with accessible checked state, label activation, optional form serialization, and controlled or uncontrolled state.',
    filepath: './checkbox/checkbox.js',
    imports: "{ Checkbox, CheckboxIndicator } from './checkbox/checkbox.js'",
    a11y: 'role="checkbox", aria-checked, aria-required, label activation, focus ring, disabled state',
    state: 'Controlled via checked, uncontrolled via defaultChecked, or imperative via check/uncheck/toggle',
    exports: [Checkbox, CheckboxIndicator],
    render: function CheckboxExample(state) {
      if (state.agreed === undefined) state.agreed = true;

      return Checkbox(
        {
          id: 'terms',
          name: 'terms',
          checked: state.agreed,
          required: true,
          onChange: (isChecked) => { state.agreed = isChecked; }
        },
        Label(`Accept terms and conditions (${state.agreed ? 'Accepted' : 'Pending'})`)
      );
    }
  }),

  documentComponent({
    id: 'Switch',
    title: 'Switch',
    description: 'A control that allows the user to toggle a boolean state.',
    filepath: './switch/switch.js',
    imports: "{ Switch } from './switch/switch.js'",
    a11y: "role=\"switch\", aria-checked, keyboard nav",
    state: "Controlled or Uncontrolled",
    exports: [Switch],
    render: function SwitchExample(state) {
      if (state.notifications === undefined) state.notifications = true;

      // the switch also fires a bubbling `change` event (detail.checked), so a parent can listen
      return div({ onchange: (e) => { if (e.detail) state.lastChange = e.detail.checked ? 'on' : 'off'; } },
        Switch(
          {
            id: 'notifications',
            checked: state.notifications,
            onChange: (checked) => { state.notifications = checked; }
          },
          Label(`Enable notifications: ${state.notifications ? 'ON' : 'OFF'}`)
        ),
        state.lastChange && span({ 'style-text': 'small', 'style-tone': 'muted' }, `Last change event: ${state.lastChange}`)
      );
    }
  }),

  documentComponent({
    id: 'Text',
    title: 'Text',
    description: 'A polymorphic typography primitive that maps props directly to design system text tokens.',
    filepath: './text/text.js',
    imports: "{ Text } from './text/text.js'",
    a11y: "Semantic HTML tags dictated by the 'as' prop (e.g., p, h1, span, label).",
    state: "Stateless",
    exports: [Text],
    render: function TextExample(state) {
      return div({ 'style-layout': 'stack' },
        Text({ as: 'h3', size: 'xlarge', weight: 'bold', leading: 'tight' }, 'Typography Primitive'),
        Text({ as: 'p', size: 'small', color: 'muted', wrap: 'pretty' }, 'This component handles all typography routing without writing custom CSS classes. It delegates rendering to the exact HTML tag requested.')
      );
    }
  }),

  documentComponent({
    id: 'Tooltip',
    title: 'Tooltip',
    description: 'A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.',
    filepath: './tooltip/tooltip.js',
    imports: "{ Tooltip } from './tooltip/tooltip.js'",
    a11y: "role='tooltip', focusin/focusout management",
    state: "Uncontrolled (internal hover/focus state)",
    exports: [Tooltip],
    render: [
      function Placements(state) {
        return div({ 'style-layout': 'row', 'style-justify': 'center', 'style-gap': 'xlarge', 'style-pad-block': 'xxlarge', 'style-pad-inline': 'medium' },
          Tooltip({ id: 'demo-tt-top', content: 'Top tooltip', position: 'top' }, Button('Top')),
          Tooltip({ id: 'demo-tt-bottom', content: 'Bottom tooltip', position: 'bottom' }, Button('Bottom')),
          Tooltip({ id: 'demo-tt-left', content: 'Left tooltip', position: 'left' }, Button('Left')),
          Tooltip({ id: 'demo-tt-right', content: 'Right tooltip', position: 'right' }, Button('Right'))
        );
      },

      function CustomConfigurations(state) {
        return div({ 'style-layout': 'row', 'style-gap': 'xlarge', 'style-pad-block': 'xlarge', 'style-pad-inline': 'medium' },
          Tooltip({ id: 'demo-tt-instant', content: 'I appear instantly!', delay: 0, offset: 16 }, Button('Instant & Offset')),
          Tooltip({ id: 'demo-tt-thick', content: 'Lots of breathing room', pad: 'medium', position: 'bottom' }, Button('Custom Padding')),
          Tooltip({ id: 'demo-tt-error', content: 'This field is required', forceOpen: true, variant: 'danger', position: 'bottom' }, Button({ variant: 'outline' }, 'Always open (danger)'))
        );
      },

      function EdgeCases(state) {
        return div({ 'style-layout': 'row', 'style-gap': 'xlarge', 'style-pad-block': 'xlarge', 'style-pad-inline': 'medium' },
          Tooltip({ id: 'demo-tt-rtl', content: 'عربى (RTL)', dir: 'rtl', position: 'left' }, Button('RTL Auto-Flip (Left to Right)')),
          Tooltip({ id: 'demo-tt-disabled', content: 'You will never see this', disabled: true }, Button({ disabled: true }, 'Disabled Tooltip'))
        );
      }
    ]
  }),

  documentComponent({
    id: 'Dropdown',
    title: 'Dropdown',
    description: 'A composable dropdown menu with trigger, value display, listbox content, groups, labels, separators, and selectable items. Supports multiple selection.',
    filepath: './dropdown/dropdown.js',
    imports: "import { Dropdown } from './dropdown/dropdown.js'",
    exports: [Dropdown],
    a11y: 'role="combobox" trigger with aria-expanded and listbox content',
    state: 'Stateful selected value and open state',
    render: [
      // The open list aligns the selected item over the trigger.
      function DropdownItemAligned(state) {
        if (state.alignedValue === undefined) state.alignedValue = 'giant';

        return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-align': 'center', 'style-pad': 'xlarge', style: { minHeight: '280px' } },
          Label('Item-Aligned (Shadcn-style)'),
          Dropdown(
            {
              name: 'framework_aligned',
              value: state.alignedValue,
              onValueChange: (value) => { state.alignedValue = value; },
              'style-width': 'small'
            },
            Dropdown.Label('Frameworks'),
            Dropdown.Item({ value: 'giant' }, 'Giant'),
            Dropdown.Item({ value: 'react' }, 'React'),
            Dropdown.Item({ value: 'vue' }, 'Vue'),
            Dropdown.Item({ value: 'svelte' }, 'Svelte'),
            Dropdown.Separator(),
            Dropdown.Group(
              Dropdown.Label('Meta'),
              Dropdown.Item({ value: 'vanilla' }, 'Vanilla JS')
            )
          )
        );
      },

      // ghost and lg variants; invalid gives the danger tone
      function DropdownVariants(state) {
        return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-align': 'center', 'style-pad': 'xlarge', style: { minHeight: '280px' } },
          Label('Ghost, large and invalid'),
          Dropdown({ name: 'fruit_ghost', variant: 'ghost', size: 'lg', value: 'apple', 'style-width': 'small' },
            Dropdown.Item({ value: 'apple' }, 'Apple'),
            Dropdown.Item({ value: 'banana' }, 'Banana')
          ),
          Dropdown({ name: 'fruit_invalid', invalid: true, 'style-width': 'small' },
            Dropdown.Item({ value: 'apple' }, 'Apple'),
            Dropdown.Item({ value: 'banana' }, 'Banana')
          )
        );
      },

      function DropdownMultiSelect(state) {
        if (state.multiValue === undefined) state.multiValue = ['giant', 'svelte'];

        return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-align': 'center', 'style-pad': 'xlarge', style: { minHeight: '280px' } },
          Label(`Multi-Select: ${state.multiValue.join(', ') || 'None'}`),
          Dropdown(
            {
              name: 'framework_multi',
              multiple: true,
              value: state.multiValue,
              onValueChange: (value) => { state.multiValue = value; },
              'style-width': 'small'
            },
            Dropdown.Label('Frameworks'),
            Dropdown.Item({ value: 'giant' }, 'Giant'),
            Dropdown.Item({ value: 'react' }, 'React'),
            Dropdown.Item({ value: 'vue' }, 'Vue'),
            Dropdown.Item({ value: 'svelte' }, 'Svelte')
          )
        );
      }
    ]
  }),

  documentComponent({
    id: 'Menu',
    title: 'Menu',
    description: 'A composable suite of dropdown and context menus with flawless flexbox alignment and tactile physics.',
    filepath: './menu/menu.js',
    imports: "{ Menu } from './menu/menu.js'",
    exports: [Menu],
    render: function MenuExample(state) {
      if (state.showRuler === undefined) state.showRuler = true;
      if (state.activeProfile === undefined) state.activeProfile = 'work';

      return div({ 'style-layout': 'row', 'style-justify': 'center', 'style-align': 'start', 'style-pad': 'xlarge', style: { minHeight: '450px' } },
        Menu({ defaultOpen: true },
          Menu.Trigger({
            'style-layout': 'inline', 'style-radius': 'small', 'style-border': 'thin', 'style-tone': 'neutral',
            'style-emphasis': 'outline', 'style-pad-block': 'small', 'style-pad-inline': 'medium'
          }, 'Edit'),

          Menu.Content(
            Menu.Item({ id: 'menu-undo' }, 'Undo', Menu.Shortcut('⌘Z')),
            Menu.Item({ id: 'menu-redo' }, 'Redo', Menu.Shortcut('⇧⌘Z')),
            Menu.Separator(),
            Menu.Sub(
              Menu.SubTrigger('Find'),
              Menu.SubContent(
                Menu.Item('Search the web'),
                Menu.Separator(),
                Menu.Item('Find...'),
                Menu.Item('Find Next'),
                Menu.Item('Find Previous')
              )
            ),
            Menu.Separator(),
            Menu.Item({ id: 'menu-cut' }, 'Cut'),
            Menu.Item({ id: 'menu-copy' }, 'Copy'),
            Menu.Item({ id: 'menu-paste' }, 'Paste'),
            Menu.Separator(),
            Menu.CheckboxItem({ id: 'menu-ruler', checked: state.showRuler, onclick: () => { state.showRuler = !state.showRuler; } }, 'Show Ruler'),
            Menu.Separator(),
            Menu.RadioGroup(
              Menu.RadioItem({ id: 'menu-profile-work', checked: state.activeProfile === 'work', onclick: () => { state.activeProfile = 'work'; } }, 'Work Profile'),
              Menu.RadioItem({ id: 'menu-profile-personal', checked: state.activeProfile === 'personal', onclick: () => { state.activeProfile = 'personal'; } }, 'Personal Profile')
            )
          )
        )
      );
    }
  }),

  documentComponent({
    id: 'Badge',
    title: 'Badge',
    description: 'Visual callouts for statuses and important messages.',
    filepath: './badge/badge.js',
    imports: "{ Badge } from './badge/badge.js'",
    a11y: "role=\"badge\" on destructive badges",
    state: "Stateless (Pure UI)",
    exports: [Badge],
    render: function BadgeExample(state) {
      return div({ 'style-layout': 'cluster', 'style-gap': 'medium' },
        Badge('Default'),
        Badge({ variant: 'secondary' }, 'Secondary'),
        Badge({ variant: 'outline' }, 'Outline'),
        Badge({ variant: 'destructive' }, 'Destructive')
      );
    }
  }),

  documentComponent({
    id: 'Spinner',
    title: 'Spinner',
    description: 'A loading indicator for asynchronous operations.',
    filepath: './spinner/spinner.js',
    imports: "{ Spinner } from './spinner/spinner.js'",
    a11y: "Combine with aria-live regions or aria-busy on parent containers.",
    state: "Controlled or Imperative API",
    exports: [Spinner],
    render: [
      function SpinnerSizes(state) {
        return div({ 'style-layout': 'stack', 'style-gap': 'medium' },
          Label('Standard Sizes'),
          div({ 'style-layout': 'row', 'style-gap': 'xlarge' },
            Spinner({ size: 'sm' }),
            Spinner({ size: 'md' }),
            Spinner({ size: 'lg' }),
            Spinner({ size: 'xl' })
          )
        );
      },

      // Declarative: the spinner mounts only while loading.
      function SpinnerDeclarative(state) {
        if (state.isLoading === undefined) state.isLoading = false;

        return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-align': 'start' },
          Label('Declarative State Control'),
          Button({
            variant: 'outline',
            loading: state.isLoading,
            onclick: () => {
              state.isLoading = true;
              setTimeout(() => { state.isLoading = false; }, 2000); // simulate a network request
            }
          },
            state.isLoading && Spinner({ size: 'sm', spinning: true }),
            state.isLoading ? 'Please wait' : 'Start Loading'
          )
        );
      },

      // Imperative: call .timeout(ms) on the spinner element.
      function SpinnerImperative(state) {
        return div({ 'style-layout': 'stack', 'style-gap': 'medium' },
          Label('Imperative API (.timeout)'),
          div({ 'style-layout': 'row', 'style-gap': 'medium' },
            Button({
              variant: 'secondary',
              onclick: () => document.getElementById('demo-api-spinner')?.timeout?.(2000)
            }, 'Trigger 2s Timeout'),
            Badge({ variant: 'secondary' },
              Spinner({ id: 'demo-api-spinner', spinning: false, size: 'sm' }),
              'Processing'
            )
          )
        );
      }
    ]
  }),

  documentComponent({
    id: 'Radio',
    title: 'Radio',
    description: 'A set of checkable buttons, known as radio buttons, where no more than one of the buttons can be checked at a time.',
    filepath: './radio/radio.js',
    imports: "import { Radio, RadioItem } from './radio/radio.js'",
    a11y: "role=\"radiogroup\", fully native <input type=\"radio\"> accessibility and keyboard navigation.",
    state: "Controlled Component",
    exports: [Radio, RadioItem],
    render: function RadioExample(state) {
      if (state.radioValue === undefined) state.radioValue = 'comfortable';

      return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-width': 'medium' },
        div({ 'style-text': 'small', 'style-weight': 'medium', 'style-tone': 'muted' }, `Selected Density: ${state.radioValue}`),
        Radio({ value: state.radioValue, onValueChange: (val) => { state.radioValue = val; } },
          RadioItem({ value: 'default' }, 'Default'),
          RadioItem({ value: 'comfortable' }, 'Comfortable'),
          RadioItem({ value: 'compact' }, 'Compact'),
          RadioItem({ value: 'custom', disabled: true }, 'Custom (Disabled)')
        )
      );
    }
  }),

  documentComponent({
    id: 'Tabs',
    title: 'Tabs',
    description: 'Switch between different views within the same context.',
    filepath: './tabs/tabs.js',
    imports: "{ Tabs, TabsList, TabsTrigger, TabsContent } from './tabs/tabs.js'",
    a11y: "role=\"tablist\", keyboard navigation (Arrows, Home, End)",
    state: "Internal Context",
    exports: [Tabs, TabsList, TabsTrigger, TabsContent],
    render: function TabsExample(state) {
      const panels = [
        ['overview', 'Overview', 'View your key metrics and recent project activity. Track progress across all your active projects.', 'You have 12 active projects and 3 pending tasks.'],
        ['analytics', 'Analytics', 'Analyze your traffic and engagement over the last 30 days. Drill down into specific user cohorts.', 'Total visits: 14,203 (+12% from last month).'],
        ['reports', 'Reports', 'Download and view automated weekly performance reports. Configure your email delivery preferences.', 'Your next scheduled report will be generated on Monday at 9:00 AM.'],
        ['settings', 'Settings', 'Manage your account preferences, billing information, and API keys. Enable two-factor authentication.', 'Warning: Changing your primary region will restart your instances.']
      ];

      return Tabs({ defaultValue: 'overview', 'style-max-width': 'large' },
        TabsList(...panels.map(([value, title]) => TabsTrigger({ value }, title))),
        ...panels.map(([value, title, body, note]) =>
          TabsContent({ value },
            Card(
              CardHeader(CardTitle(title)),
              CardContent({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-text': 'small', 'style-tone': 'muted' },
                p({ 'style-margin': 'none' }, body),
                p({ 'style-margin': 'none' }, note)
              )
            )
          )
        )
      );
    }
  }),

  documentComponent({
    id: 'Toaster',
    title: 'Toast',
    description: 'An toaster component with stacking, momentum swipe-to-dismiss, and interruptible transitions.',
    filepath: './toast/toast.js',
    imports: "{ Toaster, toast } from './toast/toast.js'",
    a11y: "aria-live region injected automatically.",
    state: "Global Observer Pattern",
    exports: [Toaster],
    render: function ToastExample(state) {
      const triggerToast = (position, type, msg) => {
        const opts = { position };
        if (type === 'promise') {
          toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), { ...opts, loading: 'Processing...', success: msg, error: 'Error' });
        } else if (type === 'success') {
          toast.success(msg, opts);
        } else if (type === 'error') {
          toast.error(msg, opts);
        } else {
          toast(msg, opts);
        }
      };

      return div(
        {
          'style-layout': 'row', 'style-justify': 'center', 'style-width': 'full', 'style-position': 'relative',
          'style-overflow': 'hidden', 'style-radius': 'medium', 'style-border': 'dashed', style: { minHeight: '400px' }
        },
        div({ 'style-layout': 'cluster', 'style-justify': 'center', 'style-gap': 'medium', 'style-max-width': 'large' },
          Button({ variant: 'outline', onclick: () => triggerToast('top-left', 'default', 'Event has been created') }, 'Top Left'),
          Button({ variant: 'outline', onclick: () => triggerToast('top-center', 'promise', 'Successfully processed!') }, 'Top Center'),
          Button({ variant: 'outline', onclick: () => triggerToast('top-right', 'success', 'Settings saved') }, 'Top Right'),
          Button({ variant: 'outline', onclick: () => triggerToast('bottom-left', 'error', 'Failed to connect') }, 'Bottom Left'),
          Button({ variant: 'outline', onclick: () => triggerToast('bottom-center', 'default', 'Profile updated') }, 'Bottom Center'),
          Button({ variant: 'outline', onclick: () => triggerToast('bottom-right', 'success', 'Action completed') }, 'Bottom Right')
        ),
        // fixed: false keeps the toasts inside this frame instead of the viewport
        Toaster({ id: 'demo-toaster', fixed: false, 'style-layer': 'overlay' })
      );
    }
  }),

  documentComponent({
    id: 'Slider',
    title: 'Slider',
    description: 'An interactive input for selecting a value or range of values from a continuous or discrete set.',
    filepath: './slider/slider.js',
    imports: "import { Slider } from './slider/slider.js'",
    a11y: "role=\"slider\", aria-valuenow",
    state: "Controlled Component",
    exports: [Slider],
    render: [
      // Slider always reports an array, even for a single thumb.
      function SliderBasic(state) {
        if (state.basicValue === undefined) state.basicValue = [50];

        return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-width': 'full', 'style-max-width': 'medium', 'style-interactive': 'static' },
          Label(`Volume: ${state.basicValue[0]}`),
          Slider({ value: state.basicValue, min: 0, max: 100, onValueChange: (val) => { state.basicValue = val; } })
        );
      },

      function SliderRange(state) {
        if (state.rangeValue === undefined) state.rangeValue = [25, 75];

        return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-width': 'full', 'style-max-width': 'medium', 'style-interactive': 'static' },
          div({ 'style-layout': 'row', 'style-justify': 'between' },
            Label('Price Range'),
            span({ 'style-weight': 'medium' }, `$${state.rangeValue[0]} - $${state.rangeValue[1]}`)
          ),
          Slider({ value: state.rangeValue, min: 0, max: 100, onValueChange: (val) => { state.rangeValue = val; } })
        );
      },

      function SliderStepped(state) {
        if (state.stepValue === undefined) state.stepValue = [30];

        return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-width': 'full', 'style-max-width': 'medium', 'style-interactive': 'static' },
          Label(`Discrete Step (10s): ${state.stepValue[0]}`),
          Slider({ value: state.stepValue, min: 0, max: 100, step: 10, onValueChange: (val) => { state.stepValue = val; } })
        );
      },

      // A vertical slider needs a container with an explicit height.
      function SliderVertical(state) {
        if (state.vertValue === undefined) state.vertValue = [60];

        return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-interactive': 'static' },
          Label(`Vertical Slider: ${state.vertValue[0]}`),
          div({ style: { height: '150px' } },
            Slider({ value: state.vertValue, min: 0, max: 100, orientation: 'vertical', onValueChange: (val) => { state.vertValue = val; } })
          )
        );
      },

      function SliderDisabled(state) {
        return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-width': 'full', 'style-max-width': 'medium', 'style-interactive': 'static' },
          Label('Disabled State'),
          Slider({ value: [50], min: 0, max: 100, disabled: true })
        );
      }
    ]
  }),

  documentComponent({
    id: 'Progress',
    title: 'Progress',
    description: 'Displays an indicator showing the completion progress of a task, supporting determinate and indeterminate states.',
    filepath: './progress/progress.js',
    imports: "{ Progress } from './progress/progress.js'",
    a11y: "role=\"progressbar\", aria-valuenow, aria-valuetext, indeterminate handling",
    state: "Controlled Component",
    exports: [Progress],
    render: [
      function ProgressInteractive(state) {
        if (state.progressValue === undefined) state.progressValue = 33;

        return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-width': 'full', 'style-max-width': 'medium' },
          div({ 'style-layout': 'row', 'style-justify': 'between', 'style-gap': 'medium' },
            Label(`Downloading data (${state.progressValue}%)`),
            Button({
              variant: 'outline',
              size: 'sm',
              onclick: () => { state.progressValue = state.progressValue >= 100 ? 0 : Math.min(100, state.progressValue + 15); }
            }, state.progressValue >= 100 ? 'Reset' : 'Increase')
          ),
          Progress({ value: state.progressValue })
        );
      },

      // value: null renders the indeterminate animation.
      function ProgressIndeterminate(state) {
        return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-width': 'full', 'style-max-width': 'medium' },
          Label('Connecting to server (Indeterminate)'),
          Progress({ value: null })
        );
      },

      // The indicator follows style-tone.
      function ProgressComplete(state) {
        return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-width': 'full', 'style-max-width': 'medium' },
          Label('Installation Complete'),
          Progress({ value: 100, 'style-tone': 'success' })
        );
      }
    ]
  }),

  documentComponent({
    id: 'VTable',
    title: 'VTable',
    description: 'A composable table rendering live asynchronous data from Hacker News, sorting, and drag-and-drop columns.',
    filepath: './vtable/vtable.js',
    imports: "import { VTable } from './vtable/vtable.js'",
    exports: [VTable],
    render: [
      function VTableHNExample(state) {
        if (state.stories === undefined && !state.isLoading) {
          Object.assign(state, {
            isLoading: true,
            columns: [
              { key: 'title', label: 'Title' },
              { key: 'score', label: 'Points' },
              { key: 'by', label: 'Author' },
              { key: 'descendants', label: 'Comments' }
            ],
            sortKey: 'score', sortDir: 'desc', draggedCol: null, scrollTop: 0
          });

          fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
            .then(res => res.json())
            .then(ids => Promise.all(ids.slice(0, 100).map(id =>
              fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
            )))
            .then(stories => { state.stories = stories.filter(Boolean); state.isLoading = false; })
            .catch(() => { state.stories = []; state.isLoading = false; });
        }

        if (state.isLoading) {
          return div({ 'style-layout': 'center', 'style-width': 'full', style: { height: '400px' } },
            span({ 'style-tone': 'muted' }, 'Fetching top stories from Hacker News...')
          );
        }

        const handleSort = (key) => {
          state.sortDir = state.sortKey === key && state.sortDir === 'desc' ? 'asc' : 'desc';
          state.sortKey = key;
        };

        const sortedData = [...(state.stories || [])].sort((a, b) => {
          const valA = a[state.sortKey] ?? '';
          const valB = b[state.sortKey] ?? '';
          const order = typeof valA === 'number' && typeof valB === 'number'
            ? valA - valB
            : String(valA).localeCompare(String(valB));
          return state.sortDir === 'asc' ? order : -order;
        });

        // Virtualization: render only the rows in view, with spacer rows above and below.
        const rowHeight = 45;
        const viewportHeight = 400;
        const buffer = 5;
        const startIndex = Math.max(0, Math.floor(state.scrollTop / rowHeight) - buffer);
        const endIndex = Math.min(sortedData.length, startIndex + Math.ceil(viewportHeight / rowHeight) + buffer * 2);
        const paddingTop = startIndex * rowHeight;
        const paddingBottom = (sortedData.length - endIndex) * rowHeight;

        const onDrop = (targetCol) => {
          if (!state.draggedCol || state.draggedCol.key === targetCol.key) return;
          const cols = state.columns.filter(c => c.key !== state.draggedCol.key);
          cols.splice(cols.findIndex(c => c.key === targetCol.key), 0, state.draggedCol);
          state.columns = cols;
          state.draggedCol = null;
        };

        const renderCell = (key, row) => key === 'title'
          ? a({ href: row.url || `https://news.ycombinator.com/item?id=${row.id}`, target: '_blank', 'style-weight': 'medium', 'style-decoration': 'none' }, row.title)
          : row[key] || '0';

        return VTable({ style: { height: `${viewportHeight}px` }, onscroll: (e) => { state.scrollTop = e.target.scrollTop; } },
          VTable.Caption(`Top ${sortedData.length} Hacker News Stories`),
          VTable.Header(
            VTable.Row(...state.columns.map(col =>
              VTable.Head({
                sortable: true,
                sortDirection: state.sortKey === col.key ? state.sortDir : null,
                onclick: () => handleSort(col.key),
                draggable: true,
                ondragstart: () => { state.draggedCol = col; },
                ondragover: (e) => e.preventDefault(),
                ondrop: () => onDrop(col),
              }, col.label)
            ))
          ),
          VTable.Body(
            paddingTop > 0 && tr({ style: { height: `${paddingTop}px` } }, td({ colSpan: state.columns.length, 'style-pad': 'none', 'style-border': 'none' })),
            ...sortedData.slice(startIndex, endIndex).map((row, index) =>
              VTable.Row({ key: row.id, 'style-surface': (startIndex + index) % 2 ? 'muted' : undefined },
                ...state.columns.map(col =>
                  VTable.Cell({ 'style-wrap': 'truncate', 'style-max-width': col.key === 'title' ? 'small' : undefined }, renderCell(col.key, row))
                )
              )
            ),
            paddingBottom > 0 && tr({ style: { height: `${paddingBottom}px` } }, td({ colSpan: state.columns.length, 'style-pad': 'none', 'style-border': 'none' }))
          )
        );
      },

      function VTableHugeExample(state) {
        if (!state.invoices) {
          Object.assign(state, {
            invoices: Array.from({ length: 50000 }, (_, i) => ({
              invoice: `INV${String(i + 1).padStart(5, '0')}`,
              status: i % 3 === 0 ? 'Pending' : i % 5 === 0 ? 'Unpaid' : 'Paid',
              method: i % 2 === 0 ? 'Credit Card' : 'PayPal',
              amount: `$${(Math.random() * 1000).toFixed(2)}`
            })),
            columns: [
              { key: 'invoice', label: 'Invoice' },
              { key: 'status', label: 'Status' },
              { key: 'method', label: 'Method' },
              { key: 'amount', label: 'Amount' }
            ],
            sortKey: 'invoice', sortDir: 'asc', draggedCol: null, scrollTop: 0
          });
        }

        const handleSort = (key) => {
          state.sortDir = state.sortKey === key && state.sortDir === 'asc' ? 'desc' : 'asc';
          state.sortKey = key;
        };

        const sortedData = [...state.invoices].sort((a, b) => {
          const valA = String(a[state.sortKey]).replace('$', '');
          const valB = String(b[state.sortKey]).replace('$', '');
          const numA = parseFloat(valA);
          const numB = parseFloat(valB);
          const order = !isNaN(numA) && !isNaN(numB) ? numA - numB : valA.localeCompare(valB);
          return state.sortDir === 'asc' ? order : -order;
        });

        // Virtualization: render only the rows in view, with spacer rows above and below.
        const rowHeight = 45;
        const viewportHeight = 400;
        const buffer = 5;
        const startIndex = Math.max(0, Math.floor(state.scrollTop / rowHeight) - buffer);
        const endIndex = Math.min(sortedData.length, startIndex + Math.ceil(viewportHeight / rowHeight) + buffer * 2);
        const paddingTop = startIndex * rowHeight;
        const paddingBottom = (sortedData.length - endIndex) * rowHeight;

        const onDrop = (targetCol) => {
          if (!state.draggedCol || state.draggedCol.key === targetCol.key) return;
          const cols = state.columns.filter(c => c.key !== state.draggedCol.key);
          cols.splice(cols.findIndex(c => c.key === targetCol.key), 0, state.draggedCol);
          state.columns = cols;
          state.draggedCol = null;
        };

        return VTable({ style: { height: `${viewportHeight}px` }, onscroll: (e) => { state.scrollTop = e.target.scrollTop; } },
          VTable.Caption('A virtualized list of 50,000 invoices.'),
          VTable.Header(
            VTable.Row(...state.columns.map(col =>
              VTable.Head({
                sortable: true,
                sortDirection: state.sortKey === col.key ? state.sortDir : null,
                onclick: () => handleSort(col.key),
                draggable: true,
                ondragstart: () => { state.draggedCol = col; },
                ondragover: (e) => e.preventDefault(),
                ondrop: () => onDrop(col),
              }, col.label)
            ))
          ),
          VTable.Body(
            paddingTop > 0 && tr({ style: { height: `${paddingTop}px` } }, td({ colSpan: state.columns.length, 'style-pad': 'none', 'style-border': 'none' })),
            ...sortedData.slice(startIndex, endIndex).map((row, index) =>
              VTable.Row({ key: row.invoice, 'style-surface': (startIndex + index) % 2 ? 'muted' : undefined },
                ...state.columns.map(col => VTable.Cell(row[col.key]))
              )
            ),
            paddingBottom > 0 && tr({ style: { height: `${paddingBottom}px` } }, td({ colSpan: state.columns.length, 'style-pad': 'none', 'style-border': 'none' }))
          )
        );
      }
    ]
  }),

  documentComponent({
    id: 'Avatar',
    title: 'Avatar',
    description: 'User representation with automatic initials fallback.',
    filepath: './avatar/avatar.js',
    imports: "{ Avatar, AvatarImage, AvatarFallback } from './avatar/avatar.js'",
    a11y: "aria-hidden on fallback if image loads",
    state: "Image Load Lifecycle",
    exports: [Avatar, AvatarImage, AvatarFallback],
    render: function AvatarExample(state) {
      return div({ 'style-layout': 'inline', 'style-gap': 'small' },
        Avatar(AvatarFallback('JD')),
        Avatar(AvatarFallback('AB')),
        Avatar(AvatarFallback('CD')),
        Avatar({ generate: 'ada.lovelace@example.com' })
      );
    }
  }),

  documentComponent({
    id: 'Dialog',
    title: 'Dialog',
    description: 'Overlays for deep interactions.',
    filepath: './dialog/dialog.js',
    imports: "{ Dialog, DialogContent, DialogHeader... } from './dialog/dialog.js'",
    a11y: "Focus trap, aria-modal=\"true\", Promise-based API",
    state: "Programmatic Async State",
    exports: [Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogAction, DialogCancel],
    render: [
      function DialogExample(state) {
        return div(
          Button({
            onclick: async () => {
              const result = await document.getElementById('demo-dialog').open();
              console.log('Dialog closed with result:', result);
            }
          }, 'Open Dialog'),
          Dialog({ id: 'demo-dialog' },
            DialogContent(
              DialogHeader(
                DialogTitle('Are you absolutely sure?'),
                DialogDescription('This action cannot be undone. This will permanently delete your data.')
              ),
              DialogFooter(
                DialogCancel(Button({ variant: 'outline' }, 'Cancel')),
                DialogAction({ value: 'confirm-delete' }, Button({ variant: 'destructive' }, 'Continue'))
              )
            )
          )
        );
      },

      // Controlled: the parent owns `open`; onclose syncs it when the dialog closes itself.
      function DialogControlled(state) {
        if (state.dialogOpen === undefined) state.dialogOpen = false;

        return div(
          Button({ variant: 'outline', onclick: () => { state.dialogOpen = true; } }, 'Open Controlled Dialog'),
          Dialog({ id: 'demo-dialog-controlled', open: state.dialogOpen, onclose: () => { state.dialogOpen = false; } },
            DialogContent(
              DialogHeader(DialogTitle('Controlled dialog'), DialogDescription('Its visibility lives in the parent state.')),
              DialogFooter(DialogCancel(Button('Close')))
            )
          )
        );
      }
    ]
  }),

  documentComponent({
    id: 'Separator',
    title: 'Separator',
    description: 'A visual divider between content sections.',
    filepath: './separator/separator.js',
    imports: "{ Separator } from './separator/separator.js'",
    a11y: "role=\"none\" if decorative, else role=\"separator\"",
    state: "Stateless (Pure UI)",
    exports: [Separator],
    render: function SeparatorExample(state) {
      return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-max-width': 'small', 'style-text': 'small', 'style-tone': 'muted' },
        div('Content above'),
        Separator(),
        div('Content below')
      );
    }
  }),

  documentComponent({
    id: 'Tree',
    title: 'Tree',
    description: 'A hierarchical list of expandable, selectable items.',
    filepath: './tree/tree.js',
    imports: "{ Tree } from './tree/tree.js'",
    a11y: 'role="tree", role="treeitem" with aria-expanded / aria-selected / aria-disabled, role="group" branches',
    state: 'Controlled (expanded, selected)',
    exports: [Tree],
    render: function TreeExample(state) {
      if (state.treeOpen === undefined) state.treeOpen = { src: true };
      if (state.treeSelected === undefined) state.treeSelected = 'index.js';

      const toggle = (key) => () => { state.treeOpen = { ...state.treeOpen, [key]: !state.treeOpen[key] }; };
      const item = (name, depth, extra = {}) => Tree.Item({
        depth,
        selected: state.treeSelected === name,
        onclick: () => { state.treeSelected = name; },
        ...extra
      }, Tree.Label(name));

      return Tree({ 'style-max-width': 'small' },
        item('src', 0, { hasChildren: true, expanded: !!state.treeOpen.src, onToggle: toggle('src') }),
        Tree.Branch({ expanded: !!state.treeOpen.src },
          item('components', 1, { hasChildren: true, expanded: !!state.treeOpen.components, onToggle: toggle('components') }),
          Tree.Branch({ expanded: !!state.treeOpen.components },
            item('button.js', 2),
            item('tree.js', 2)
          ),
          item('index.js', 1)
        ),
        item('package.json', 0),
        item('secrets.env', 0, { disabled: true })
      );
    }
  }),

  documentComponent({
    id: 'SplitLayout',
    title: 'Split Layout',
    description: 'Two resizable panes with a draggable handle; the size is saved per id and one side can collapse.',
    filepath: './split/split.js',
    imports: "{ SplitLayout } from './split/split.js'",
    a11y: 'role="separator" handle with aria-orientation',
    state: 'Internal size (persisted to localStorage by id), controlled collapse',
    exports: [SplitLayout],
    render: function SplitLayoutExample(state) {
      if (state.splitCollapsed === undefined) state.splitCollapsed = false;

      return div({ 'style-layout': 'stack', 'style-gap': 'medium', 'style-width': 'full' },
        Button({ variant: 'outline', onclick: () => { state.splitCollapsed = !state.splitCollapsed; } }, state.splitCollapsed ? 'Show sidebar' : 'Hide sidebar'),
        div({ 'style-position': 'relative', 'style-width': 'full', 'style-ratio': 'video', 'style-border': 'thin', 'style-radius': 'medium', 'style-overflow': 'hidden' },
          SplitLayout({ id: 'demo-split', initialSplit: 200, min: 120, max: 400, collapseSide: 'left', isCollapsed: { value: state.splitCollapsed } },
            div({ 'style-pad': 'medium', 'style-surface': 'muted', 'style-height': 'full', 'style-divider': 'end' }, 'Sidebar'),
            div({ 'style-pad': 'medium' }, 'Drag the handle to resize.')
          )
        )
      );
    }
  }),

  documentComponent({
    id: 'CreditCardInput',
    title: 'Credit Card Input',
    description: 'A card number field that groups digits in fours and shows the card brand.',
    filepath: './creditcardinput/creditcardinput.js',
    imports: "{ CreditCardInput } from './creditcardinput/creditcardinput.js'",
    a11y: 'inputmode="numeric", autocomplete="cc-number", aria-invalid',
    state: 'Controlled or Uncontrolled, imperative getValue/setValue/clear/setInvalid',
    exports: [CreditCardInput],
    render: function CreditCardInputExample(state) {
      if (state.cardNumber === undefined) state.cardNumber = '';

      return div({ 'style-layout': 'stack', 'style-gap': 'small', 'style-width': 'full', 'style-max-width': 'medium' },
        Label('Card number'),
        CreditCardInput({
          id: 'demo-card-input',
          placeholder: '0000 0000 0000 0000',
          value: state.cardNumber,
          oninput: (e, value) => { state.cardNumber = value; }
        }),
        span({ 'style-text': 'small', 'style-tone': 'muted' }, 'Try a number starting with 4 or 5.')
      );
    }
  })
];
