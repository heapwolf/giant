import { component, design, match } from '../../giant.js';

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
import { VTable } from './vtable/vtable.js'
import { Separator } from './separator/separator.js';
import { Spinner } from './spinner/spinner.js';
import { Textarea } from './textarea/textarea.js';
import { Toaster, toast } from './toast/toast.js';
import { Tooltip } from './tooltip/tooltip.js';
import { Slider } from './slider/slider.js';
import { Radio, RadioItem } from './radio/radio.js';

import {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubTrigger,
  MenuSubContent,
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem
} from './menu/menu.js';

import {
  ChartContainer,
  ChartBars,
  ChartLine,
  ChartPie,
  ChartRadar,
  CartesianGrid,
  XAxis,
  PolarGrid,
  PolarAngleAxis,
  ChartTooltip,
  ChartLegend,
  ChartRadial,
  RadialBar,
  Bar,
  Line,
  Pie,
  Radar
} from './charts/charts.js';

export function introspectComponent(compFn) {
  if (!compFn) return { props: null, methods: null };

  const targetFn = compFn.rawFn || compFn.raw || compFn.render || compFn;
  const source = targetFn.toString();

  const props = [];
  const methods = [];

  const clean = (s = '') => s.replace(/\s+/g, ' ').trim();

  const parseName = (raw) => {
    let name = raw.trim();
    let defaultValue = null;
    let isOptional = false;

    if (name.startsWith('[') && name.endsWith(']')) {
      isOptional = true;
      name = name.slice(1, -1);

      const eq = name.indexOf('=');
      if (eq !== -1) {
        defaultValue = name.slice(eq + 1).trim();
        name = name.slice(0, eq).trim();
      }
    }

    if (
      (name.startsWith("'") && name.endsWith("'")) ||
      (name.startsWith('"') && name.endsWith('"'))
    ) {
      name = name.slice(1, -1);
    }

    return { name, defaultValue, isOptional };
  };

  const addProp = (entry) => {
    if (!entry.name) return;

    if (
      entry.name === 'props' ||
      entry.name === 'children' ||
      entry.name === 'e' ||
      entry.name.startsWith('...')
    ) return;

    const existing = props.find((p) => p.name === entry.name);

    if (existing) {
      existing.type ||= entry.type;
      existing.defaultValue ??= entry.defaultValue;
      existing.isOptional ||= entry.isOptional;
      existing.description ||= entry.description;
      return;
    }

    props.push(entry);
  };

  const jsdocBlocks = [...source.matchAll(/\/\*\*([\s\S]*?)\*\//g)];

  for (const match of jsdocBlocks) {
    const lines = match[1]
      .split('\n')
      .map((l) => l.replace(/^\s*\*\s?/, ''));

    let currentProp = null;
    let currentMethod = null;

    for (let line of lines) {
      line = line.trim();

      const propMatch = line.match(
        /^@(?:prop|property|param)\s+\{([^}]+)\}\s+(\[[^\]]+\]|"[^"]+"|'[^']+'|[^\s]+)(?:\s*-\s*(.*))?$/
      );

      if (propMatch) {
        if (currentProp) addProp(currentProp);

        const { name, defaultValue, isOptional } = parseName(propMatch[2]);

        currentProp = {
          name,
          type: clean(propMatch[1]),
          defaultValue,
          isOptional,
          description: clean(propMatch[3] || '')
        };

        currentMethod = null;
        continue;
      }

      const methodMatch = line.match(
        /^@method\s+([a-zA-Z0-9_$]+)\(([^)]*)\)(?:\s*-\s*(.*))?$/
      );

      if (methodMatch) {
        if (currentProp) {
          addProp(currentProp);
          currentProp = null;
        }

        currentMethod = {
          name: methodMatch[1],
          args: methodMatch[2].trim(),
          description: clean(methodMatch[3] || '')
        };

        methods.push(currentMethod);
        continue;
      }

      if (currentProp && line && !line.startsWith('@')) {
        currentProp.description += ' ' + clean(line);
      }

      if (currentMethod && line && !line.startsWith('@')) {
        currentMethod.description += ' ' + clean(line);
      }
    }

    if (currentProp) addProp(currentProp);
  }

  return {
    props: props.length ? props : null,
    methods: methods.length ? methods : null
  };
}

const autoFormatCode = (fn, exports = [], filepath = '') => {
  if (typeof fn !== 'function') return '';

  const raw = fn.toString();
  const lines = raw.split('\n');
  let formatted = raw.trim();

  if (lines.length > 1) {
    const indents = lines.slice(1)
      .filter(line => line.trim().length > 0)
      .map(line => line.match(/^\s*/)[0].length);

    const minIndent = indents.length > 0 ? Math.min(...indents) : 0;
    formatted = lines.map((line, i) => i === 0 ? line : line.slice(minIndent)).join('\n');
  }

  let importsStr = '';

  const giantImports = ['design', 'match'].filter(token => raw.includes(token));
  if (giantImports.length > 0) {
    importsStr += `import { ${giantImports.join(', ')} } from './giant.js';\n`;
  }

  if (exports?.length > 0 && filepath) {
    const exportNames = exports.map(ex => ex.name).filter(Boolean);
    const flatPath = `./${filepath.split('/').pop()}`;
    importsStr += `import { ${exportNames.join(', ')} } from '${flatPath}';\n`;
  }

  return importsStr ? `${importsStr}\n${formatted}` : formatted;
};

// =========================================================
// UPDATED COMPONENT DEFINER
// =========================================================
const documentComponent = (config) => {
  const component = { ...config };

  if (!component.code && component.render) {
    Object.defineProperty(component, 'code', {
      get() {
        // Read the active index set by the ComponentViewer
        if (Array.isArray(this.render)) {
          const activeFn = this.render[this._activeVariantIndex || 0];
          return autoFormatCode(activeFn, this.exports, this.filepath);
        }
        return autoFormatCode(this.render, this.exports, this.filepath);
      },
      enumerable: true,
      configurable: true
    });
  }

  return component;
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
      /**
       * Variation 1: Single (Default)
       * Allows only one item to be open at a time. Clicking an open item collapses it.
       */
      function AccordionSingle(state) {
        return div(
          { class: [design.layout.stack, design.spacing.gap4], style: { maxWidth: '400px', width: '100%' } },
          Label('Single (Default)'),
          Accordion({ type: 'single', collapsible: true },
            AccordionItem({ value: 'item-1' },
              AccordionTrigger('Is it accessible?'),
              AccordionContent({ class: design.fg.fgMuted }, 'Yes. It follows WAI-ARIA design patterns.')
            ),
            AccordionItem({ value: 'item-2' },
              AccordionTrigger('Is it styled?'),
              AccordionContent({ class: design.fg.fgMuted }, 'Yes. It comes with default styles.')
            ),
            AccordionItem({ value: 'item-3' },
              AccordionTrigger('Is it animated?'),
              AccordionContent({ class: design.fg.fgMuted }, 'Yes. It has smooth animations.')
            )
          )
        );
      },

      /**
       * Variation 2: Multiple
       * Allows multiple items to be open simultaneously.
       */
      function AccordionMultiple(state) {
        return div(
          { class: [design.layout.stack, design.spacing.gap4], style: { maxWidth: '400px', width: '100%' } },
          Label('Multiple (Open multiple items)'),
          Accordion({ type: 'multiple' },
            AccordionItem({ value: 'item-1' },
              AccordionTrigger('Is it accessible?'),
              AccordionContent({ class: design.fg.fgMuted }, 'Yes. It follows WAI-ARIA design patterns.')
            ),
            AccordionItem({ value: 'item-2' },
              AccordionTrigger('Is it styled?'),
              AccordionContent({ class: design.fg.fgMuted }, 'Yes. It comes with default styles.')
            ),
            AccordionItem({ value: 'item-3' },
              AccordionTrigger('Is it animated?'),
              AccordionContent({ class: design.fg.fgMuted }, 'Yes. It has smooth animations.')
            )
          )
        );
      },

      /**
       * Variation 3: Non-Collapsible & Default Value
       * Starts with one item open, and it cannot be collapsed unless another item is clicked.
       */
      function AccordionNonCollapsible(state) {
        return div(
          { class: [design.layout.stack, design.spacing.gap4], style: { maxWidth: '400px', width: '100%' } },
          Label('Single Non-Collapsible (Always one open)'),
          Accordion({ type: 'single', collapsible: false, defaultValue: 'item-2' },
            AccordionItem({ value: 'item-1' },
              AccordionTrigger('Is it accessible?'),
              AccordionContent({ class: design.fg.fgMuted }, 'Yes. It follows WAI-ARIA design patterns.')
            ),
            AccordionItem({ value: 'item-2' },
              AccordionTrigger('Is it styled?'),
              AccordionContent({ class: design.fg.fgMuted }, 'Yes. It comes with default styles.')
            ),
            AccordionItem({ value: 'item-3' },
              AccordionTrigger('Is it animated?'),
              AccordionContent({ class: design.fg.fgMuted }, 'Yes. It has smooth animations.')
            )
          )
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
      return div(
        { class: [design.layout.stack, design.size.wFull] },
        Alert(
          AlertTitle('Heads up!'),
          AlertDescription( 'You can add components to your app.')
        ),
        Alert({ variant: 'destructive' },
          AlertTitle('Error'),
          AlertDescription('Something went wrong.')
        )
      );
    }
  }),

  documentComponent({
    id: 'Button',
    title: 'Button',
    description: 'Interactive elements for user actions.',
    ...introspectComponent(Button),
    filepath: './button/button.js',
    imports: "{ Button } from './button/button.js'",
    a11y: "Native <button> focus management & semantics",
    state: "Stateless (Pure UI)",
    exports: [Button],
    render: function ButtonExample(state) {
      return div(
        { class: [design.layout.stack, design.size.wFull, design.layout.itemsCenter] },
        div(
          { class: [design.layout.cluster, design.layout.justifyCenter] },
          Button('Default'),
          Button({ variant: 'secondary' }, 'Secondary'),
          Button({ disabled: true }, 'Disabled'),
          Button({ variant: 'outline' }, 'Outline'),
          Button({ variant: 'ghost' }, 'Ghost'),
          Button({ variant: 'link' }, 'Link'),
          Button({ variant: 'destructive' }, 'Destructive')
        ),
        div(
          { class: [design.layout.cluster, design.layout.itemsCenter, design.layout.justifyCenter] },
          Button({ size: 'sm' }, 'Small'),
          Button({ size: 'default' }, 'Default'),
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
    render: function CardExample(state) {
      return Card(
        CardHeader(
          CardTitle('Card Title'),
          CardDescription('Card description goes here')
        ),
        CardContent('This is the card content area.'),
        CardFooter(
          Button({ variant: 'outline' }, 'Cancel'),
          Button('Save')
        )
      );
    }
  }),

  documentComponent({
    id: 'Charts',
    title: 'Charts',
    description: 'Composable charts utilizing native SVG rendering and decoupled configuration generators.',
    filepath: './charts/charts.js',
    imports: "import { ChartContainer, ChartBars, ChartLine, ChartPie, ChartRadar, ChartRadial, CartesianGrid, XAxis, PolarGrid, PolarAngleAxis, ChartTooltip, ChartLegend, Bar, Line, Pie, Radar, RadialBar } from './charts.js'",
    exports: [ChartContainer, ChartBars, ChartLine, ChartPie, ChartRadar, ChartRadial, CartesianGrid, XAxis, PolarGrid, PolarAngleAxis, ChartTooltip, ChartLegend, Bar, Line, Pie, Radar, RadialBar],
    render: [
      /**
       * Simple Bar Chart Example
       */
      function BarChartExample(state) {
        const chartData = [
          { month: "January", desktop: 186 }, { month: "February", desktop: 305 },
          { month: "March", desktop: 237 }, { month: "April", desktop: 73 },
          { month: "May", desktop: 209 }, { month: "June", desktop: 214 },
        ];
        const chartConfig = { desktop: { label: "Desktop", color: design.color.accent[3] } };

        return Card({ style: { width: '100%', maxWidth: '600px' } },
          CardHeader(CardTitle('Bar Chart - Simple')),
          CardContent(
            ChartContainer({ config: chartConfig, style: { height: '250px' } },
              ChartBars(
                { data: chartData, config: chartConfig },
                CartesianGrid({ vertical: false }),
                XAxis({ dataKey: 'month', tickFormatter: (value) => value.slice(0, 3) }),
                ChartTooltip({ cursor: true }),
                Bar({ dataKey: 'desktop', radius: 4 })
              )
            )
          )
        );
      },

      /**
       * Multiple Line Chart Example
       */
      function LineChartExample(state) {
        const chartData = [
          { month: "January", desktop: 186, mobile: 80 }, { month: "February", desktop: 305, mobile: 200 },
          { month: "March", desktop: 237, mobile: 120 }, { month: "April", desktop: 73, mobile: 190 },
          { month: "May", desktop: 209, mobile: 130 }, { month: "June", desktop: 214, mobile: 140 },
        ];
        const chartConfig = {
          desktop: { label: "Desktop", color: design.color.accent[3] },
          mobile: { label: "Mobile", color: design.color.neutral[5] }
        };

        return Card({ style: { width: '100%', maxWidth: '600px' } },
          CardHeader(CardTitle('Line Chart - Multiple')),
          CardContent(
            ChartContainer({ config: chartConfig, style: { height: '250px' } },
              ChartLine(
                { data: chartData, config: chartConfig },
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

      /**
       * Donut Chart Example (Pie with innerRadius)
       */
      function DonutChartExample(state) {
        const chartData = [
          { browser: "Chrome", visitors: 275, fill: design.color.accent[4] },
          { browser: "Safari", visitors: 200, fill: design.color.accent[3] },
          { browser: "Firefox", visitors: 187, fill: design.color.accent[2] },
          { browser: "Edge", visitors: 173, fill: design.color.accent[1] },
          { browser: "Other", visitors: 90, fill: design.color.neutral[3] },
        ];
        const chartConfig = { visitors: { label: "Visitors" } };

        return Card({ style: { width: '100%', maxWidth: '600px' } },
          CardHeader({ class: design.layout.itemsCenter }, CardTitle('Donut Chart')),
          CardContent({ class: [design.layout.flex, design.layout.justifyCenter] },
            ChartContainer({ config: chartConfig, style: { height: '300px', width: '300px' } },
              ChartPie(
                { data: chartData, config: chartConfig, width: 300, height: 300 },
                ChartTooltip(),
                Pie({ dataKey: 'visitors', nameKey: 'browser', innerRadius: 80 })
              )
            )
          )
        );
      },

      /**
       * Interactive Radar Chart Explorer
       */
      function RadarChartExplorer(state) {
        if (!state.radarSetup) {
          state.radarGrid = true;
          state.radarGridType = 'polygon';
          state.radarGridFilled = false;
          state.radarRadialLines = true;
          state.radarDots = false;
          state.radarLinesOnly = false;
          state.radarMultiple = false;
          state.radarLegend = false;
          state.radarSetup = true;
        }

        const chartData = [
          { month: "January", desktop: 186, mobile: 80 },
          { month: "February", desktop: 305, mobile: 200 },
          { month: "March", desktop: 237, mobile: 120 },
          { month: "April", desktop: 73, mobile: 190 },
          { month: "May", desktop: 209, mobile: 130 },
          { month: "June", desktop: 214, mobile: 140 },
        ];

        const chartConfig = {
          desktop: { label: "Desktop", color: design.color.accent[3] },
          mobile: { label: "Mobile", color: design.color.accent[4] }
        };

        const Toggle = (label, checked, onclick) => div(
          {
            class: [design.layout.flex, design.layout.itemsCenter, design.layout.justifyBetween, design.size.wFull],
            style: { justifyContent: 'space-between' }
          },
          Label(label),
          Switch({ checked, onclick })
        );

        return Card({ style: { width: '100%', maxWidth: '800px' } },
          CardHeader(
            CardTitle('Radar Chart Explorer'),
            CardDescription('Toggle properties to test all radar variations.')
          ),
          CardContent({ class: [design.layout.flex], style: { gap: '2rem', flexWrap: 'wrap' } },
            div({ class: [design.layout.stack, design.spacing.gap3], style: { flex: '1', minWidth: '220px', borderRight: '1px solid var(--color-border-muted)', paddingRight: '2rem' } },
              Toggle('Show Grid', state.radarGrid, (e) => { e.preventDefault(); state.radarGrid = !state.radarGrid; }),
              Toggle('Grid Type: Circle', state.radarGridType === 'circle', (e) => { e.preventDefault(); state.radarGridType = state.radarGridType === 'circle' ? 'polygon' : 'circle'; }),
              Toggle('Filled Grid', state.radarGridFilled, (e) => { e.preventDefault(); state.radarGridFilled = !state.radarGridFilled; }),
              Toggle('Radial Lines', state.radarRadialLines, (e) => { e.preventDefault(); state.radarRadialLines = !state.radarRadialLines; }),
              div({ style: { height: '1px', backgroundColor: 'var(--color-border-muted)', margin: '0.5rem 0' } }),
              Toggle('Show Dots', state.radarDots, (e) => { e.preventDefault(); state.radarDots = !state.radarDots; }),
              Toggle('Lines Only (No Fill)', state.radarLinesOnly, (e) => { e.preventDefault(); state.radarLinesOnly = !state.radarLinesOnly; }),
              Toggle('Multiple Series', state.radarMultiple, (e) => { e.preventDefault(); state.radarMultiple = !state.radarMultiple; }),
              Toggle('Show Legend', state.radarLegend, (e) => { e.preventDefault(); state.radarLegend = !state.radarLegend; })
            ),
            div({ style: { flex: '2', minWidth: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' } },
              ChartContainer({ config: chartConfig, style: { height: '350px', width: '100%', maxWidth: '400px' } },
                ChartRadar(
                  { data: chartData, config: chartConfig, width: 400, height: 350 },
                  ChartTooltip(),
                  state.radarGrid ? PolarGrid({
                    gridType: state.radarGridType,
                    filled: state.radarGridFilled,
                    stroke: design.color.primary[4],
                    radialLines: state.radarRadialLines
                  }) : null,
                  PolarAngleAxis({ dataKey: 'month' }),
                  Radar({
                    dataKey: 'desktop',
                    dot: state.radarDots,
                    fillOpacity: state.radarLinesOnly ? 0 : 0.6
                  }),
                  state.radarMultiple ? Radar({
                    dataKey: 'mobile',
                    dot: state.radarDots,
                    fillOpacity: state.radarLinesOnly ? 0 : 0.6
                  }) : null,
                  state.radarLegend ? ChartLegend() : null
                )
              )
            )
          )
        );
      },

      /**
       * Radial Chart - Standard
       */
      function RadialChartStandard(state) {
        const data = [
          { browser: "Chrome", visitors: 275, fill: design.color.accent[4] },
          { browser: "Safari", visitors: 200, fill: design.color.accent[3] },
          { browser: "Firefox", visitors: 187, fill: design.color.accent[2] },
          { browser: "Edge", visitors: 173, fill: design.color.accent[1] },
          { browser: "Other", visitors: 90, fill: design.color.neutral[3] },
        ];

        return Card({ style: { width: '100%', maxWidth: '400px' } },
          CardHeader(CardTitle('Radial Chart'), CardDescription('January - June 2024')),
          CardContent({ class: [design.layout.flex, design.layout.justifyCenter] },
            ChartContainer({ config: { visitors: { label: "Visitors" } }, style: { height: '300px', width: '300px' } },
              ChartRadial(
                { data, width: 300, height: 300, innerRadius: '30%', outerRadius: '90%' },
                ChartTooltip(),
                RadialBar({ dataKey: 'visitors', nameKey: 'browser' })
              )
            )
          ),
          CardFooter({ class: [design.layout.flex, design.layout.itemsCenter, design.layout.justifyCenter, design.layout.stack, design.spacing.gap2, design.typography.size1] },
            div({ class: [design.typography.weightMedium, design.layout.flex, design.spacing.gap2] }, "Trending up by 5.2% this month ↗"),
            div({ class: design.fg.fgMuted }, "Showing total visitors for the last 6 months")
          )
        );
      },

      /**
       * Radial Chart - Label
       */
      function RadialChartLabel(state) {
        const data = [
          { browser: "Chrome", visitors: 275, fill: design.color.accent[4] },
          { browser: "Safari", visitors: 200, fill: design.color.accent[3] },
          { browser: "Firefox", visitors: 187, fill: design.color.accent[2] },
          { browser: "Edge", visitors: 173, fill: design.color.accent[1] },
          { browser: "Other", visitors: 90, fill: design.color.neutral[3] },
        ];

        return Card({ style: { width: '100%', maxWidth: '400px' } },
          CardHeader(CardTitle('Radial Chart - Label'), CardDescription('January - June 2024')),
          CardContent({ class: [design.layout.flex, design.layout.justifyCenter] },
            ChartContainer({ config: { visitors: { label: "Visitors" } }, style: { height: '300px', width: '300px' } },
              ChartRadial(
                { data, width: 300, height: 300, innerRadius: '30%', outerRadius: '90%' },
                ChartTooltip(),
                RadialBar({ dataKey: 'visitors', nameKey: 'browser', label: true })
              )
            )
          ),
          CardFooter({ class: [design.layout.flex, design.layout.itemsCenter, design.layout.justifyCenter, design.layout.stack, design.spacing.gap2, design.typography.size1] },
            div({ class: [design.typography.weightMedium, design.layout.flex, design.spacing.gap2] }, "Trending up by 5.2% this month ↗"),
            div({ class: design.fg.fgMuted }, "Showing total visitors for the last 6 months")
          )
        );
      },

      /**
       * Radial Chart - Grid
       */
      function RadialChartGrid(state) {
        const data = [
          { browser: "Chrome", visitors: 275, fill: design.color.accent[4] },
          { browser: "Safari", visitors: 200, fill: design.color.accent[3] },
          { browser: "Firefox", visitors: 187, fill: design.color.accent[2] },
        ];

        return Card({ style: { width: '100%', maxWidth: '400px' } },
          CardHeader(CardTitle('Radial Chart - Grid'), CardDescription('January - June 2024')),
          CardContent({ class: [design.layout.flex, design.layout.justifyCenter] },
            ChartContainer({ config: { visitors: { label: "Visitors" } }, style: { height: '300px', width: '300px' } },
              ChartRadial(
                { data, width: 300, height: 300, innerRadius: '30%', outerRadius: '90%' },
                PolarGrid({ gridLines: 12 }),
                ChartTooltip(),
                RadialBar({ dataKey: 'visitors', nameKey: 'browser' })
              )
            )
          ),
          CardFooter({ class: [design.layout.flex, design.layout.itemsCenter, design.layout.justifyCenter, design.layout.stack, design.spacing.gap2, design.typography.size1] },
            div({ class: [design.typography.weightMedium, design.layout.flex, design.spacing.gap2] }, "Trending up by 5.2% this month ↗"),
            div({ class: design.fg.fgMuted }, "Showing total visitors for the last 6 months")
          )
        );
      },

      /**
       * Radial Chart - Text Overlay
       */
      function RadialChartText(state) {
        const data = [{ browser: "Safari", visitors: 200, fill: design.color.accent[3] }];

        return Card({ style: { width: '100%', maxWidth: '400px' } },
          CardHeader(CardTitle('Radial Chart - Text'), CardDescription('January - June 2024')),
          CardContent({ class: [design.layout.flex, design.layout.justifyCenter] },
            ChartContainer({ config: { visitors: { label: "Visitors" } }, style: { height: '300px', width: '300px', position: 'relative' } },
              ChartRadial(
                { data, max: 250, width: 300, height: 300, innerRadius: '70%', outerRadius: '80%' },
                ChartTooltip(),
                RadialBar({ dataKey: 'visitors', nameKey: 'browser' })
              ),
              div({ class: [design.layout.absolute], style: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' } },
                div({ class: [design.typography.weightBold], style: { fontSize: '3rem', lineHeight: '1.1' } }, "200"),
                div({ class: [design.fg.fgMuted, design.typography.size1] }, "Visitors")
              )
            )
          ),
          CardFooter({ class: [design.layout.flex, design.layout.itemsCenter, design.layout.justifyCenter, design.layout.stack, design.spacing.gap2, design.typography.size1] },
            div({ class: [design.typography.weightMedium, design.layout.flex, design.spacing.gap2] }, "Trending up by 5.2% this month ↗"),
            div({ class: design.fg.fgMuted }, "Showing total visitors for the last 6 months")
          )
        );
      },

      /**
       * Radial Chart - Shape (Semi-circle)
       */
      function RadialChartShape(state) {
        const data = [{ browser: "Safari", visitors: 1260, fill: design.color.accent[3] }];

        return Card({ style: { width: '100%', maxWidth: '400px' } },
          CardHeader(CardTitle('Radial Chart - Shape'), CardDescription('January - June 2024')),
          CardContent({ class: [design.layout.flex, design.layout.justifyCenter] },
            ChartContainer({ config: { visitors: { label: "Visitors" } }, style: { height: '220px', width: '300px', position: 'relative' } },
              // start 270 (Left) to 450 (Right) = 180 deg semi circle sweeping over Top
              ChartRadial(
                { data, max: 2000, width: 300, height: 250, startAngle: 270, endAngle: 450, innerRadius: '70%', outerRadius: '85%' },
                ChartTooltip(),
                RadialBar({ dataKey: 'visitors', nameKey: 'browser' })
              ),
              div({ class: [design.layout.absolute], style: { top: '65%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' } },
                div({ class: [design.typography.weightBold], style: { fontSize: '2.5rem', lineHeight: '1.1' } }, "1,260"),
                div({ class: [design.fg.fgMuted, design.typography.size1] }, "Visitors")
              )
            )
          ),
          CardFooter({ class: [design.layout.flex, design.layout.itemsCenter, design.layout.justifyCenter, design.layout.stack, design.spacing.gap2, design.typography.size1] },
            div({ class: [design.typography.weightMedium, design.layout.flex, design.spacing.gap2] }, "Trending up by 5.2% this month ↗"),
            div({ class: design.fg.fgMuted }, "Showing total visitors for the last 6 months")
          )
        );
      },

      /**
       * Radial Chart - Stacked
       */
      function RadialChartStacked(state) {
        const data = [
          { segment: "Mobile", visitors: 800, fill: design.color.accent[4] },
          { segment: "Desktop", visitors: 600, fill: design.color.accent[3] },
          { segment: "Tablet", visitors: 430, fill: design.color.accent[2] }
        ];

        return Card({ style: { width: '100%', maxWidth: '400px' } },
          CardHeader(CardTitle('Radial Chart - Stacked'), CardDescription('January - June 2024')),
          CardContent({ class: [design.layout.flex, design.layout.justifyCenter] },
            ChartContainer({ config: { visitors: { label: "Visitors" } }, style: { height: '220px', width: '300px', position: 'relative' } },
              ChartRadial(
                { data, stacked: true, width: 300, height: 250, startAngle: 270, endAngle: 450, innerRadius: '65%', outerRadius: '85%' },
                ChartTooltip(),
                RadialBar({ dataKey: 'visitors', nameKey: 'segment' })
              ),
              div({ class: [design.layout.absolute], style: { top: '65%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' } },
                div({ class: [design.typography.weightBold], style: { fontSize: '2.25rem', lineHeight: '1.1' } }, "1,830"),
                div({ class: [design.fg.fgMuted, design.typography.size1] }, "Visitors")
              )
            )
          ),
          CardFooter({ class: [design.layout.flex, design.layout.itemsCenter, design.layout.justifyCenter, design.layout.stack, design.spacing.gap2, design.typography.size1] },
            div({ class: [design.typography.weightMedium, design.layout.flex, design.spacing.gap2] }, "Trending up by 5.2% this month ↗"),
            div({ class: design.fg.fgMuted }, "Showing total visitors for the last 6 months")
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
          // Look specifically for the element marked with our data attribute
          const demoRow = e.target.closest('[data-demo-row]');
          if (!demoRow) return;

          const swatch = demoRow.querySelector('.color-swatch');
          const textSpan = demoRow.querySelector('.color-text');

          const result = await picker.open(textSpan.textContent);

          if (result) {
            swatch.style.backgroundColor = result;
            textSpan.textContent = result;
          }
        };

        return div(
          { 'data-demo-row': true, class: [design.layout.flex, design.layout.itemsCenter, design.spacing.gap4], style: { padding: '40px 20px' } },
          Button(
            {
              onclick: handlePick,
              class: [design.typography.size1, design.shape.radius1, design.bg.bgAction, design.fg.fgAction, design.layout.flex, design.layout.itemsCenter],
              style: { padding: '0.5rem 1rem', gap: '8px', cursor: 'pointer' }
            },
            div({ class: 'color-swatch', style: { width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#4F46E5', border: '1px solid rgba(255,255,255,0.2)' } }),
            'Pick Color'
          ),
          span({ class: ['color-text', design.typography.fontMono, design.typography.size1, design.fg.fgMuted] }, '#4F46E5'),
          picker
        );
      },
      function AlphaTransparency() {
        const picker = ColorPicker({});

        const handlePick = async (e) => {
          const demoRow = e.target.closest('[data-demo-row]');
          if (!demoRow) return;

          const swatch = demoRow.querySelector('.color-swatch');
          const textSpan = demoRow.querySelector('.color-text');

          const result = await picker.open(textSpan.textContent);

          if (result) {
            swatch.style.backgroundColor = result;
            textSpan.textContent = result;
          }
        };

        const checkerboard = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><path fill="%23e5e7eb" d="M0 0h4v4H0zm4 4h4v4H4z"/></svg>')`;

        return div(
          { 'data-demo-row': true, class: [design.layout.flex, design.layout.itemsCenter, design.spacing.gap4], style: { padding: '40px 20px' } },
          Button(
            {
              onclick: handlePick,
              class: [design.typography.size1, design.shape.radius1, design.bg.bgAction, design.fg.fgAction, design.layout.flex, design.layout.itemsCenter],
              style: { padding: '0.5rem 1rem', gap: '8px', cursor: 'pointer' }
            },
            div(
              { style: { width: '16px', height: '16px', borderRadius: '50%', backgroundImage: checkerboard } },
              div({ class: 'color-swatch', style: { width: '100%', height: '100%', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.5)' } })
            ),
            'Pick with Alpha'
          ),
          span({ class: ['color-text', design.typography.fontMono, design.typography.size1, design.fg.fgMuted] }, 'rgba(239, 68, 68, 0.5)'),
          picker
        );
      },
      function CustomBackdrop() {
        const picker = ColorPicker({
          style: { backgroundColor: 'rgba(16, 185, 129, 0.1)', backdropFilter: 'blur(8px)' }
        });

        const handlePick = async (e) => {
          const demoRow = e.target.closest('[data-demo-row]');
          if (!demoRow) return;

          const swatch = demoRow.querySelector('.color-swatch');
          const textSpan = demoRow.querySelector('.color-text');

          const result = await picker.open(textSpan.textContent);
          if (result) {
            swatch.style.backgroundColor = result;
            textSpan.textContent = result;
          }
        };

        return div(
          { 'data-demo-row': true, class: [design.layout.flex, design.layout.itemsCenter, design.spacing.gap4], style: { padding: '40px 20px' } },
          Button(
            {
              onclick: handlePick,
              class: [design.typography.size1, design.shape.radius1, design.bg.bgAction, design.fg.fgAction, design.layout.flex, design.layout.itemsCenter],
              style: { padding: '0.5rem 1rem', gap: '8px', cursor: 'pointer' }
            },
            div({ class: 'color-swatch', style: { width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#10B981', border: '1px solid rgba(255,255,255,0.2)' } }),
            'Custom Backdrop Filter'
          ),
          span({ class: ['color-text', design.typography.fontMono, design.typography.size1, design.fg.fgMuted], style: { display: 'none'} }, '#10B981'),
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
        return div(
          { class: [design.layout.stack, design.spacing.gap4], style: { maxWidth: '400px', width: '100%' } },
          div(
            { class: [design.layout.stack, design.spacing.gap2] },
            Label('Email'),
            Input({ id: 'demo-email-input', type: 'email', placeholder: 'Enter your email' })
          ),
          div(
            { class: [design.layout.stack, design.spacing.gap2] },
            Label('Password'),
            Input({ id: 'demo-password-input', type: 'password', placeholder: 'Enter password', invalid: true })
          )
        );
      },
      function InputGroups(state) {
        return div(
          { class: [design.layout.stack, design.spacing.gap4], style: { maxWidth: '400px', width: '100%' } },
          div(
            { class: [design.layout.stack, design.spacing.gap2] },
            Label('Search'),
            InputGroup({ id: 'demo-search-group' },
              span({
                class: [design.layout.flex, design.layout.itemsCenter, design.layout.justifyCenter, design.fg.fgMuted],
                style: { paddingLeft: '0.75rem', paddingRight: '0.25rem', flexShrink: 0 }
              }, '🔍'),
              Input({
                id: 'demo-search-input',
                variant: 'ghost',
                placeholder: 'Search...',
                style: { paddingLeft: '0.25rem' }
              })
            )
          )
        );
      },
      function Textareas(state) {
        return div(
          { class: [design.layout.stack, design.spacing.gap4], style: { maxWidth: '400px', width: '100%' } },
          div(
            { class: [design.layout.stack, design.spacing.gap2] },
            Label('Message'),
            Textarea({ id: 'demo-message-textarea', placeholder: 'Enter your message', rows: 4 })
          )
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

      return div(
        {
          class: [
            design.layout.inlineFlex,
            design.layout.itemsCenter,
            design.spacing.gap2,
            design.interaction.selectNone
          ]
        },
        Checkbox(
          {
            id: 'terms',
            name: 'terms',
            checked: state.agreed,
            required: true,
            onChange: (isChecked) => {
              state.agreed = isChecked;
            }
          },
          Label(
            `Accept terms and conditions (${state.agreed ? 'Accepted' : 'Pending'})`
          )
        )
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

      return div(
        {
          class: [
            design.layout.inlineFlex,
            design.layout.itemsCenter,
            design.spacing.gap2,
            design.interaction.selectNone
          ]
        },
        Switch(
          {
            id: 'notifications',
            checked: state.notifications,
            onclick: e => { state.notifications = !state.notifications; }
          },
          Label(`Enable notifications: ${state.notifications ? 'ON' : 'OFF'}`)
        )
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
      return div(
        { class: design.layout.stack, style: { gap: 0, margin: '10%' } },
        Text({ as: 'h3', size: 'xl', weight: 'bold', leading: 'tight' }, 'Typography Primitive'),
        Text({ as: 'p', size: 'sm', color: 'secondary', wrap: 'pretty' }, 'This component handles all typography routing without writing custom CSS classes. It delegates rendering to the exact HTML tag requested.')
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
        return div(
          { class: [design.layout.flex, design.layout.itemsCenter, design.layout.justifyCenter, design.spacing.gap6], style: { padding: '60px 20px' } },
          Tooltip({ id: 'demo-tt-top', content: 'Top tooltip', position: 'top' },
            button({ class: [design.typography.size1, design.shape.radius1, design.bg.bgAction, design.fg.fgAction], style: { padding: '0.5rem 1rem' } }, 'Top')
          ),
          Tooltip({ id: 'demo-tt-bottom', content: 'Bottom tooltip', position: 'bottom' },
            button({ class: [design.typography.size1, design.shape.radius1, design.bg.bgAction, design.fg.fgAction], style: { padding: '0.5rem 1rem' } }, 'Bottom')
          ),
          Tooltip({ id: 'demo-tt-left', content: 'Left tooltip', position: 'left' },
            button({ class: [design.typography.size1, design.shape.radius1, design.bg.bgAction, design.fg.fgAction], style: { padding: '0.5rem 1rem' } }, 'Left')
          ),
          Tooltip({ id: 'demo-tt-right', content: 'Right tooltip', position: 'right' },
            button({ class: [design.typography.size1, design.shape.radius1, design.bg.bgAction, design.fg.fgAction], style: { padding: '0.5rem 1rem' } }, 'Right')
          )
        );
      },
      function CustomConfigurations(state) {
        return div(
          { class: [design.layout.flex, design.layout.itemsCenter, design.spacing.gap6], style: { padding: '40px 20px' } },
          Tooltip({
            id: 'demo-tt-instant',
            content: 'I appear instantly!',
            delay: 0,
            offset: 16
          },
            button({ class: [design.typography.size1, design.shape.radius1, design.bg.bgAction, design.fg.fgAction], style: { padding: '0.5rem 1rem' } }, 'Instant & Offset')
          ),
          Tooltip({
            id: 'demo-tt-thick',
            content: 'Lots of breathing room',
            padding: '1rem 1.5rem',
            position: 'bottom'
          },
            button({ class: [design.typography.size1, design.shape.radius1, design.bg.bgAction, design.fg.fgAction], style: { padding: '0.5rem 1rem' } }, 'Custom Padding')
          )
        );
      },
      function EdgeCases(state) {
        return div(
          { class: [design.layout.flex, design.layout.itemsCenter, design.spacing.gap6], style: { padding: '40px 20px' } },
          Tooltip({
            id: 'demo-tt-rtl',
            content: 'عربى (RTL)',
            dir: 'rtl',
            position: 'left'
          },
            button({ class: [design.typography.size1, design.shape.radius1, design.bg.bgAction, design.fg.fgAction], style: { padding: '0.5rem 1rem' } }, 'RTL Auto-Flip (Left to Right)')
          ),
          Tooltip({
            id: 'demo-tt-disabled',
            content: 'You will never see this',
            disabled: true
          },
            button({ class: [design.typography.size1, design.shape.radius1, design.bg.bgMuted, design.fg.fgMuted], style: { padding: '0.5rem 1rem', cursor: 'not-allowed' }, disabled: true }, 'Disabled Tooltip')
          )
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
      /**
       * Variation 1: Item-Aligned (Shadcn style)
       */
      function DropdownItemAligned(state) {
        if (state.alignedValue === undefined) state.alignedValue = 'giant';

        return div(
          {
            style: { padding: '2rem', minHeight: '280px', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }
          },
          Label('Item-Aligned (Shadcn-style)'),
          Dropdown(
            {
              name: 'framework_aligned',
              value: state.alignedValue,
              onValueChange: (value) => { state.alignedValue = value; },
              style: { width: '240px' }
            },
            Dropdown.Label('Frameworks'),
            Dropdown.Item({ value: 'giant' }, Dropdown.ItemText('Giant')),
            Dropdown.Item({ value: 'react' }, Dropdown.ItemText('React')),
            Dropdown.Item({ value: 'vue' }, Dropdown.ItemText('Vue')),
            Dropdown.Item({ value: 'svelte' }, Dropdown.ItemText('Svelte')),
            Dropdown.Separator(),
            Dropdown.Group(
              Dropdown.Label('Meta'),
              Dropdown.Item({ value: 'vanilla' }, Dropdown.ItemText('Vanilla JS'))
            )
          )
        );
      },

      /**
       * Variation 2: Traditional (Always below trigger)
       */
      function DropdownTraditional(state) {
        if (state.traditionalValue === undefined) state.traditionalValue = 'apple';

        return div(
          {
            style: { padding: '2rem', minHeight: '280px', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }
          },
          Label('Traditional (Popper below trigger)'),
          Dropdown(
            {
              name: 'fruit_traditional',
              value: state.traditionalValue,
              position: 'popper', // Bypasses the alignment math!
              onValueChange: (value) => { state.traditionalValue = value; },
              style: { width: '240px' }
            },
            Dropdown.Label('Fruits'),
            Dropdown.Item({ value: 'apple' }, Dropdown.ItemText('Apple')),
            Dropdown.Item({ value: 'banana' }, Dropdown.ItemText('Banana')),
            Dropdown.Item({ value: 'orange' }, Dropdown.ItemText('Orange')),
            Dropdown.Item({ value: 'grape' }, Dropdown.ItemText('Grape'))
          )
        );
      },

      /**
       * Variation 3: Multi-Select
       */
      function DropdownMultiSelect(state) {
        if (state.multiValue === undefined) state.multiValue = ['giant', 'svelte'];

        return div(
          {
            style: { padding: '2rem', minHeight: '280px', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }
          },
          Label(`Multi-Select: ${state.multiValue.join(', ') || 'None'}`),
          Dropdown(
            {
              name: 'framework_multi',
              multiple: true,
              value: state.multiValue,
              onValueChange: (value) => { state.multiValue = value; },
              style: { width: '240px' }
            },
            Dropdown.Label('Frameworks'),
            Dropdown.Item({ value: 'giant' }, Dropdown.ItemText('Giant')),
            Dropdown.Item({ value: 'react' }, Dropdown.ItemText('React')),
            Dropdown.Item({ value: 'vue' }, Dropdown.ItemText('Vue')),
            Dropdown.Item({ value: 'svelte' }, Dropdown.ItemText('Svelte'))
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
    imports: "{ Menu, MenuTrigger, MenuContent, MenuItem, MenuSeparator, MenuShortcut, MenuSub, MenuSubTrigger, MenuSubContent, MenuCheckboxItem, MenuRadioGroup, MenuRadioItem } from './menu/menu.js'",
    exports: [Menu, MenuTrigger, MenuContent, MenuItem, MenuSeparator, MenuShortcut, MenuSub, MenuSubTrigger, MenuSubContent, MenuCheckboxItem, MenuRadioGroup, MenuRadioItem],
    render: function MenuExample(state) {
      if (state.editMenuOpen === undefined) state.editMenuOpen = true;
      if (state.showRuler === undefined) state.showRuler = true;
      if (state.activeProfile === undefined) state.activeProfile = 'work';

      return div({ style: { padding: '2rem', minHeight: '450px', display: 'flex', justifyContent: 'center' } },
        Menu({ style: { zIndex: 'var(--layout-z-overlay)' } },

          MenuTrigger({
            class: [design.layout.inlineFlex, design.layout.itemsCenter, design.shape.radius1, design.shape.border1, design.bg.surface],
            style: { padding: '0.5rem 1rem', cursor: 'pointer', border: '1px solid var(--color-border-muted)' },
            onclick: () => { state.editMenuOpen = !state.editMenuOpen; }
          }, 'Edit'),

          state.editMenuOpen ? MenuContent(
            MenuItem({ id: 'menu-undo' }, 'Undo', MenuShortcut('⌘Z')),
            MenuItem({ id: 'menu-redo' }, 'Redo', MenuShortcut('⇧⌘Z')),

            MenuSeparator(),

            MenuSub({ defaultOpen: false },
              MenuSubTrigger('Find'),
              MenuSubContent(
                MenuItem('Search the web'),
                MenuSeparator(),
                MenuItem('Find...'),
                MenuItem('Find Next'),
                MenuItem('Find Previous')
              )
            ),

            MenuSeparator(),

            MenuItem({ id: 'menu-cut' }, 'Cut'),
            MenuItem({ id: 'menu-copy' }, 'Copy'),
            MenuItem({ id: 'menu-paste' }, 'Paste'),

            MenuSeparator(),

            MenuCheckboxItem({
              id: 'menu-ruler',
              checked: state.showRuler,
              onclick: () => { state.showRuler = !state.showRuler; }
            }, 'Show Ruler'),

            MenuSeparator(),

            MenuRadioGroup(
              MenuRadioItem({
                id: 'menu-profile-work',
                checked: state.activeProfile === 'work',
                onclick: () => { state.activeProfile = 'work'; }
              }, 'Work Profile'),
              MenuRadioItem({
                id: 'menu-profile-personal',
                checked: state.activeProfile === 'personal',
                onclick: () => { state.activeProfile = 'personal'; }
              }, 'Personal Profile')
            )
          ) : null
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
      return div(
        { class: [design.layout.stack, design.size.wFull] },
        div(
          { class: design.layout.cluster },
          Badge('Default'),
          Badge({ variant: 'secondary' }, 'Secondary'),
          Badge({ variant: 'outline' }, 'Outline'),
          Badge({ variant: 'destructive' }, 'Destructive')
        )
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
      /**
       * Variation 1: Sizes
       */
      function SpinnerSizes(state) {
        return div(
          { class: [design.layout.stack, design.spacing.gap4] },
          Label('Standard Sizes'),
          div(
            { class: [design.layout.flex, design.layout.itemsCenter, design.spacing.gap6] },
            Spinner({ size: 'sm' }),
            Spinner({ size: 'md' }),
            Spinner({ size: 'lg' }),
            Spinner({ size: 'xl' })
          )
        );
      },

      /**
       * Variation 2: Declarative Control (Inside a Button)
       */
      function SpinnerDeclarative(state) {
        if (state.isLoading === undefined) state.isLoading = false;

        return div(
          { class: [design.layout.stack, design.spacing.gap4] },
          Label('Declarative State Control'),
          div(
            { class: [design.layout.flex, design.layout.itemsCenter, design.spacing.gap4] },
            Button({
              variant: 'outline',
              disabled: state.isLoading,
              loading: state.isLoading,
              onclick: () => {
                state.isLoading = true;
                // Auto-reset after 2 seconds to simulate a network request
                setTimeout(() => { state.isLoading = false; }, 2000);
              }
            },
              // The spinner safely unmounts when isLoading is false
              state.isLoading ? Spinner({ size: 'sm', spinning: true }) : null,
              state.isLoading ? 'Please wait' : 'Start Loading'
            )
          )
        );
      },

      /**
       * Variation 3: Imperative API (Inside a Badge)
       */
      function SpinnerImperative(state) {
        return div(
          { class: [design.layout.stack, design.spacing.gap4] },
          Label('Imperative API (.timeout)'),
          div(
            { class: [design.layout.flex, design.layout.itemsCenter, design.spacing.gap4] },
            Button({
              variant: 'secondary',
              onclick: () => {
                // Fetch the element by ID and call the component method
                const spinnerEl = document.getElementById('demo-api-spinner');
                if (spinnerEl && spinnerEl.timeout) {
                  spinnerEl.timeout(2000); // Spin for 2 seconds then stop
                }
              }
            }, 'Trigger 2s Timeout'),

            // Rendered alongside text inside the Badge component
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
      // Initialize default state
      if (state.radioValue === undefined) state.radioValue = 'comfortable';

      return div(
        { class: [design.layout.stack, design.interaction.selectNone], style: { width: '350px' } },
        div(
          { class: [design.layout.stack, design.spacing.gap4] },
          // Status output
          div(
            { class: [design.typography.size1, design.typography.weightMedium, design.fg.fgMuted] },
            `Selected Density: ${state.radioValue}`
          ),

          // The Radio Component
          Radio({
            value: state.radioValue,
            onValueChange: (val) => {
              state.radioValue = val;
            }
          },
            // The items handle their own flex-layout, spacing, and label clicks now!
            RadioItem({ value: 'default' }, 'Default'),
            RadioItem({ value: 'comfortable' }, 'Comfortable'),
            RadioItem({ value: 'compact' }, 'Compact'),
            RadioItem({ value: 'custom', disabled: true }, 'Custom (Disabled)')
          )
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
      return div({ style: { maxWidth: '32rem' } },
        Tabs({ defaultValue: 'overview' },

          TabsList(
            TabsTrigger({ value: 'overview' }, 'Overview'),
            TabsTrigger({ value: 'analytics' }, 'Analytics'),
            TabsTrigger({ value: 'reports' }, 'Reports'),
            TabsTrigger({ value: 'settings' }, 'Settings')
          ),

          TabsContent({ value: 'overview', style: { marginTop: '0.5rem' } },
            Card(
              CardHeader(CardTitle('Overview')),
              CardContent({ style: { display: 'flex', flexDirection: 'column', gap: '1rem' } },
                p({
                  class: [design.typography.size1, design.fg.fgMuted],
                  style: { margin: 0, lineHeight: '1.5' }
                }, 'View your key metrics and recent project activity. Track progress across all your active projects.'),
                p({
                  class: [design.typography.size1, design.fg.fgMuted],
                  style: { margin: 0 }
                }, 'You have 12 active projects and 3 pending tasks.')
              )
            )
          ),

          TabsContent({ value: 'analytics', style: { marginTop: '0.5rem' } },
            Card(
              CardHeader(CardTitle('Analytics')),
              CardContent({ style: { display: 'flex', flexDirection: 'column', gap: '1rem' } },
                p({
                  class: [design.typography.size1, design.fg.fgMuted],
                  style: { margin: 0, lineHeight: '1.5' }
                }, 'Analyze your traffic and engagement over the last 30 days. Drill down into specific user cohorts.'),
                p({
                  class: [design.typography.size1, design.fg.fgMuted],
                  style: { margin: 0 }
                }, 'Total visits: 14,203 (+12% from last month).')
              )
            )
          ),

          TabsContent({ value: 'reports', style: { marginTop: '0.5rem' } },
            Card(
              CardHeader(CardTitle('Reports')),
              CardContent({ style: { display: 'flex', flexDirection: 'column', gap: '1rem' } },
                p({
                  class: [design.typography.size1, design.fg.fgMuted],
                  style: { margin: 0, lineHeight: '1.5' }
                }, 'Download and view automated weekly performance reports. Configure your email delivery preferences.'),
                p({
                  class: [design.typography.size1, design.fg.fgMuted],
                  style: { margin: 0 }
                }, 'Your next scheduled report will be generated on Monday at 9:00 AM.')
              )
            )
          ),

          TabsContent({ value: 'settings', style: { marginTop: '0.5rem' } },
            Card(
              CardHeader(CardTitle('Settings')),
              CardContent({ style: { display: 'flex', flexDirection: 'column', gap: '1rem' } },
                p({
                  class: [design.typography.size1, design.fg.fgMuted],
                  style: { margin: 0, lineHeight: '1.5' }
                }, 'Manage your account preferences, billing information, and API keys. Enable two-factor authentication.'),
                p({
                  class: [design.typography.size1, design.fg.fgMuted],
                  style: { margin: 0 }
                }, 'Warning: Changing your primary region will restart your instances.')
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

      // Helper function to throw toasts to specific corners
      const triggerToast = (pos, type, msg) => {
        const opts = { position: pos }; // The zone handles routing automatically

        if (type === 'promise') {
          const myPromise = new Promise((resolve) => setTimeout(resolve, 2000));
          toast.promise(myPromise, { ...opts, loading: 'Processing...', success: msg, error: 'Error' });
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
          class: [design.layout.flex, design.layout.itemsCenter, design.layout.justifyCenter, design.size.wFull],
          style: { minHeight: '400px', position: 'relative', overflow: 'hidden', borderRadius: 'var(--shape-radius-3)', border: '1px dashed var(--color-border-hover)' }
        },

        div({ class: [design.layout.cluster, design.layout.justifyCenter, design.spacing.gap4], style: { maxWidth: '500px' } },
          Button({ variant: 'outline', onclick: () => triggerToast('top-left', 'default', 'Event has been created') }, 'Top Left'),
          Button({ variant: 'outline', onclick: () => triggerToast('top-center', 'promise', 'Successfully processed!') }, 'Top Center'),
          Button({ variant: 'outline', onclick: () => triggerToast('top-right', 'success', 'Settings saved') }, 'Top Right'),

          Button({ variant: 'outline', onclick: () => triggerToast('bottom-left', 'error', 'Failed to connect') }, 'Bottom Left'),
          Button({ variant: 'outline', onclick: () => triggerToast('bottom-center', 'default', 'Profile updated') }, 'Bottom Center'),
          Button({ variant: 'outline', onclick: () => triggerToast('bottom-right', 'success', 'Action completed') }, 'Bottom Right')
        ),

        // The Toaster is now a full-container invisible overlay that delegates layout zones
        Toaster({ id: 'demo-toaster', fixed: false, style: { zIndex: 100 } })
      );
    }
  }),

  documentComponent({
    id: 'Slider',
    title: 'Slider',
    description: 'An interactive input for selecting a value or range of values from a continuous or discrete set.',
    filepath: './slider/slider.js',
    imports: "import { Slider } from './slider/slider.js'", // Fixed the import path
    a11y: "role=\"slider\", aria-valuenow",
    state: "Controlled Component",
    exports: [Slider],
    render: [
      /**
       * Variation 1: Basic / Continuous
       */
      function SliderBasic(state) {
        // The component returns an array even for single values, so we store/use the array.
        if (state.basicValue === undefined) state.basicValue = [50];

        return div(
          { class: [design.layout.stack, design.interaction.selectNone, design.spacing.gap4], style: { maxWidth: '400px', width: '100%' } },
          Label(`Volume: ${state.basicValue[0]}`),
          Slider({
            value: state.basicValue,
            min: 0,
            max: 100,
            onValueChange: (val) => {
              state.basicValue = val;
            }
          })
        );
      },

      /**
       * Variation 2: Multi-thumb Range Slider
       */
      function SliderRange(state) {
        if (state.rangeValue === undefined) state.rangeValue = [25, 75];

        return div(
          { class: [design.layout.stack, design.interaction.selectNone, design.spacing.gap4], style: { maxWidth: '400px', width: '100%' } },
          div(
            { class: [design.layout.flex, design.layout.justifyBetween] },
            Label('Price Range'),
            span({ class: design.typography.weightMedium }, `$${state.rangeValue[0]} - $${state.rangeValue[1]}`)
          ),
          Slider({
            value: state.rangeValue,
            min: 0,
            max: 100,
            onValueChange: (val) => {
              state.rangeValue = val;
            }
          })
        );
      },

      /**
       * Variation 3: Stepped (Discrete) Slider
       */
      function SliderStepped(state) {
        if (state.stepValue === undefined) state.stepValue = [30];

        return div(
          { class: [design.layout.stack, design.interaction.selectNone, design.spacing.gap4], style: { maxWidth: '400px', width: '100%' } },
          Label(`Discrete Step (10s): ${state.stepValue[0]}`),
          Slider({
            value: state.stepValue,
            min: 0,
            max: 100,
            step: 10,
            onValueChange: (val) => {
              state.stepValue = val;
            }
          })
        );
      },

      /**
       * Variation 4: Vertical Orientation
       */
      function SliderVertical(state) {
        if (state.vertValue === undefined) state.vertValue = [60];

        return div(
          { class: [design.layout.stack, design.interaction.selectNone, design.spacing.gap4] },
          Label(`Vertical Slider: ${state.vertValue[0]}`),
          div(
            { style: { height: '150px' } }, // Needs an explicit height container
            Slider({
              value: state.vertValue,
              min: 0,
              max: 100,
              orientation: 'vertical',
              onValueChange: (val) => {
                state.vertValue = val;
              }
            })
          )
        );
      },

      /**
       * Variation 5: Disabled
       */
      function SliderDisabled(state) {
        return div(
          { class: [design.layout.stack, design.interaction.selectNone, design.spacing.gap4], style: { maxWidth: '400px', width: '100%' } },
          Label('Disabled State'),
          Slider({
            value: [50],
            min: 0,
            max: 100,
            disabled: true
          })
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
      /**
       * Variation 1: Interactive / Determinate
       */
      function ProgressInteractive(state) {
        if (state.progressValue === undefined) state.progressValue = 33;

        return div(
          { class: [design.layout.stack, design.interaction.selectNone, design.spacing.gap4], style: { maxWidth: '400px', width: '100%' } },
          // FIXED: Added design.spacing.gap4 to space out the label and button
          div(
            { class: [design.layout.flex, design.layout.itemsCenter, design.layout.justifyBetween, design.spacing.gap4] },
            Label(`Downloading data (${state.progressValue}%)`),
            Button({
              variant: 'outline',
              size: 'sm',
              onclick: () => {
                state.progressValue = state.progressValue >= 100 ? 0 : Math.min(100, state.progressValue + 15);
              }
            }, state.progressValue >= 100 ? 'Reset' : 'Increase')
          ),
          Progress({ value: state.progressValue, max: 100 })
        );
      },

      /**
       * Variation 2: Indeterminate
       */
      function ProgressIndeterminate(state) {
        return div(
          { class: [design.layout.stack, design.interaction.selectNone, design.spacing.gap4], style: { maxWidth: '400px', width: '100%' } },
          Label('Connecting to server (Indeterminate)'),
          Progress({ value: null })
        );
      },

      /**
       * Variation 3: Complete & Custom Styling
       */
      function ProgressComplete(state) {
        return div(
          { class: [design.layout.stack, design.interaction.selectNone, design.spacing.gap4], style: { maxWidth: '400px', width: '100%' } },
          Label('Installation Complete'),
          Progress({
            value: 100,
            max: 100,
            // FIXED: Using a valid background color token from the dictionary
            indicatorClass: design.bg.successBg
          })
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
          state.isLoading = true;
          state.columns = [
            { key: 'title', label: 'Title' },
            { key: 'score', label: 'Points' },
            { key: 'by', label: 'Author' },
            { key: 'descendants', label: 'Comments' }
          ];
          state.sortKey = 'score';
          state.sortDir = 'desc';
          state.draggedCol = null;
          state.scrollTop = 0;

          fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
            .then(res => res.json())
            .then(ids => {
              const topIds = ids.slice(0, 100);
              return Promise.all(topIds.map(id =>
                fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
              ));
            })
            .then(stories => {
              state.stories = stories.filter(Boolean);
              state.isLoading = false;
            })
            .catch(() => {
              state.stories = [];
              state.isLoading = false;
            });
        }

        if (state.isLoading) {
          return div(
            { class: [design.layout.flex, design.layout.itemsCenter, design.layout.justifyCenter, design.size.wFull], style: { height: '400px' } },
            span({ class: [design.fg.fgMuted, design.typography.size2] }, 'Fetching top stories from Hacker News...')
          );
        }

        const handleSort = (key) => {
          if (state.sortKey === key) {
            state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            state.sortKey = key;
            state.sortDir = 'desc';
          }
        };

        const sortedData = [...(state.stories || [])].sort((a, b) => {
          const valA = a[state.sortKey] ?? '';
          const valB = b[state.sortKey] ?? '';

          if (typeof valA === 'number' && typeof valB === 'number') {
            return state.sortDir === 'asc' ? valA - valB : valB - valA;
          }
          return state.sortDir === 'asc'
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        });

        const rowHeight = 45;
        const viewportHeight = 400;
        const buffer = 5;
        const totalRows = sortedData.length;

        const startIndex = Math.max(0, Math.floor(state.scrollTop / rowHeight) - buffer);
        const endIndex = Math.min(totalRows, startIndex + Math.ceil(viewportHeight / rowHeight) + (buffer * 2));

        const visibleData = sortedData.slice(startIndex, endIndex);
        const paddingTop = startIndex * rowHeight;
        const paddingBottom = (totalRows - endIndex) * rowHeight;

        const onDragStart = (col) => { state.draggedCol = col; };
        const onDrop = (targetCol) => {
          if (!state.draggedCol || state.draggedCol.key === targetCol.key) return;
          const newCols = [...state.columns];
          newCols.splice(newCols.findIndex(c => c.key === state.draggedCol.key), 1);
          newCols.splice(newCols.findIndex(c => c.key === targetCol.key), 0, state.draggedCol);
          state.columns = newCols;
          state.draggedCol = null;
        };

        const renderCellContent = (colKey, row) => {
          if (colKey === 'title') {
            return a({
              href: row.url || `https://news.ycombinator.com/item?id=${row.id}`,
              target: '_blank',
              class: [design.typography.weightMedium],
              style: { color: 'var(--color-primary-3)', textDecoration: 'none' }
            }, row.title);
          }
          return row[colKey] || '0';
        };

        return div(
          { class: [design.layout.stack, design.size.wFull] },

          VTable(
            {
              style: { height: `${viewportHeight}px` },
              onscroll: (e) => { state.scrollTop = e.target.scrollTop; }
            },

            VTable.Caption(`Top ${totalRows} Hacker News Stories`),

            VTable.Header(
              VTable.Row(
                ...state.columns.map(col =>
                  VTable.Head(
                    {
                      sortable: true,
                      sortDirection: state.sortKey === col.key ? state.sortDir : null,
                      onclick: () => handleSort(col.key),
                      draggable: true,
                      ondragstart: () => onDragStart(col),
                      ondragover: (e) => e.preventDefault(),
                      ondrop: () => onDrop(col),
                    },
                    col.label
                  )
                )
              )
            ),

            VTable.Body(
              paddingTop > 0 ? tr({ style: { height: `${paddingTop}px` } }, td({ colSpan: state.columns.length, style: { padding: 0, border: 0 } })) : null,

              ...visibleData.map((row, index) =>
                VTable.Row(
                  {
                    key: row.id,
                    class: [(startIndex + index) % 2 === 1 ? design.bg.bgSubtle : '']
                  },
                  ...state.columns.map(col =>
                    VTable.Cell(
                      {
                        class: [
                          design.typography.overflowTruncate
                        ],
                        style: { maxWidth: col.key === 'title' ? '300px' : 'auto' }
                      },
                      renderCellContent(col.key, row)
                    )
                  )
                )
              ),

              paddingBottom > 0 ? tr({ style: { height: `${paddingBottom}px` } }, td({ colSpan: state.columns.length, style: { padding: 0, border: 0 } })) : null
            )
          )
        );
      },

      function VTableHugeExample(state) {
        // 1. Generate 50,000 Rows
        if (!state.invoices) {
          state.invoices = Array.from({ length: 50000 }).map((_, i) => ({
            invoice: `INV${(i + 1).toString().padStart(5, '0')}`,
            status: i % 3 === 0 ? 'Pending' : i % 5 === 0 ? 'Unpaid' : 'Paid',
            method: i % 2 === 0 ? 'Credit Card' : 'PayPal',
            amount: `$${(Math.random() * 1000).toFixed(2)}`
          }));
          state.columns = [
            { key: 'invoice', label: 'Invoice' },
            { key: 'status', label: 'Status' },
            { key: 'method', label: 'Method' },
            { key: 'amount', label: 'Amount' }
          ];
          state.sortKey = 'invoice';
          state.sortDir = 'asc';
          state.draggedCol = null;
          state.scrollTop = 0;
        }

        // 2. Sorting Logic
        const handleSort = (key) => {
          if (state.sortKey === key) {
            state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            state.sortKey = key;
            state.sortDir = 'asc';
          }
        };

        const sortedData = [...state.invoices].sort((a, b) => {
          const valA = String(a[state.sortKey]).replace('$', '');
          const valB = String(b[state.sortKey]).replace('$', '');
          const numA = parseFloat(valA);
          const numB = parseFloat(valB);
          if (!isNaN(numA) && !isNaN(numB)) return state.sortDir === 'asc' ? numA - numB : numB - numA;
          return state.sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        });

        // 3. Virtualization Math
        const rowHeight = 45;
        const viewportHeight = 400;
        const buffer = 5;
        const totalRows = sortedData.length;

        const startIndex = Math.max(0, Math.floor(state.scrollTop / rowHeight) - buffer);
        const endIndex = Math.min(totalRows, startIndex + Math.ceil(viewportHeight / rowHeight) + (buffer * 2));

        const visibleData = sortedData.slice(startIndex, endIndex);
        const paddingTop = startIndex * rowHeight;
        const paddingBottom = (totalRows - endIndex) * rowHeight;

        // 4. Drag & Drop Handlers
        const onDragStart = (col) => { state.draggedCol = col; };
        const onDrop = (targetCol) => {
          if (!state.draggedCol || state.draggedCol.key === targetCol.key) return;
          const newCols = [...state.columns];
          newCols.splice(newCols.findIndex(c => c.key === state.draggedCol.key), 1);
          newCols.splice(newCols.findIndex(c => c.key === targetCol.key), 0, state.draggedCol);
          state.columns = newCols;
          state.draggedCol = null;
        };

        return div(
          { class: [design.layout.stack, design.size.wFull] },

          VTable(
            {
              style: { height: `${viewportHeight}px` },
              onscroll: (e) => { state.scrollTop = e.target.scrollTop; }
            },

            VTable.Caption('A virtualized list of 50,000 invoices.'),

            VTable.Header(
              VTable.Row(
                ...state.columns.map(col =>
                  VTable.Head(
                    {
                      sortable: true,
                      sortDirection: state.sortKey === col.key ? state.sortDir : null,
                      onclick: () => handleSort(col.key),
                      draggable: true,
                      ondragstart: () => onDragStart(col),
                      ondragover: (e) => e.preventDefault(),
                      ondrop: () => onDrop(col),
                    },
                    col.label
                  )
                )
              )
            ),

            VTable.Body(
              paddingTop > 0 ? tr({ style: { height: `${paddingTop}px` } }, td({ colSpan: state.columns.length, style: { padding: 0, border: 0 } })) : null,

              ...visibleData.map((row) =>
                VTable.Row(
                  { class: [row.id % 2 === 1 ? design.bg.bgSubtle : ''] },
                  ...state.columns.map(col =>
                    VTable.Cell(
                      row[col.key]
                    )
                  )
                )
              ),

              paddingBottom > 0 ? tr({ style: { height: `${paddingBottom}px` } }, td({ colSpan: state.columns.length, style: { padding: 0, border: 0 } })) : null
            )
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
      return div(
        { class: [design.layout.inlineFlex, design.spacing.gap2] },
        Avatar(AvatarFallback('JD')),
        Avatar(AvatarFallback('AB')),
        Avatar(AvatarFallback('CD'))
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
    exports: [
      Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle,
      DialogDescription, DialogAction, DialogCancel
    ],
    render: function DialogExample(state) {
      return div(
        div(
          { class: design.layout.cluster },

          Button({
            onclick: async () => {
              const el = document.getElementById('demo-dialog');
              const result = await el.open();
              console.log('Dialog closed with result:', result);
            }
          }, 'Open Dialog'),
        ),

        Dialog({ id: 'demo-dialog' },
          DialogContent(
            DialogHeader(
              DialogTitle('Are you absolutely sure?'),
              DialogDescription('This action cannot be undone. This will permanently delete your data.')
            ),
            DialogFooter(
              DialogCancel(
                Button({ variant: 'outline' }, 'Cancel')
              ),
              DialogAction({ value: 'confirm-delete' },
                Button({ variant: 'destructive' }, 'Continue')
              )
            )
          )
        )
      );
    }
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
      return div(
        { class: [design.layout.stack, design.spacing.gap4], style: { maxWidth: '300px' } },
        div({ class: [design.fg.muted, design.typography.size1] }, 'Content above'),
        Separator(),
        div({ class: [design.fg.muted, design.typography.size1] }, 'Content below')
      );
    }
  })
];


