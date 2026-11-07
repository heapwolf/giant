import { createRoot, component, signal } from '../../giant.js';
import { COMPONENTS, introspectComponent } from './registry.js';
import { Badge } from './badge/badge.js';
import { Documentation } from './docs.js';
import { CodeView } from './code/code.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs/tabs.js';

component.enableGlobals();

const EYEBROW = { 'style-weight': 'bold', 'style-case': 'upper', 'style-text': 'xsmall', 'style-tracking': 'wide' };
const CODE_CHIP = { 'style-font': 'mono', 'style-text': 'xsmall', 'style-surface': 'muted', 'style-radius': 'small', 'style-pad-block': 'xsmall', 'style-pad-inline': 'small' };
const STACK = (gap) => ({ 'style-layout': 'stack', 'style-gap': gap });

const PageHeader = (title, lede) => div(
  STACK('small'),
  h2({ 'style-weight': 'bold', 'style-leading': 'tight', 'style-text': 'xxlarge', 'style-margin': 'none' }, title),
  p({ 'style-tone': 'muted', 'style-text': 'large', 'style-leading': 'normal', 'style-margin': 'none' }, lede)
);

const ApiRow = ({ name, type, defaultValue, isOptional, args, description, isMethod }) => div(
  { ...STACK('small'), 'style-pad-block': 'large', 'style-divider': 'bottom' },
  div(
    { 'style-layout': 'cluster', 'style-gap': 'medium' },
    span({ 'style-font': 'mono', 'style-weight': 'bold', 'style-text': 'small' }, name + (isMethod ? `(${args || ''})` : '')),
    type && code({ ...CODE_CHIP, 'style-tone': 'accent' }, type),
    defaultValue && span({ 'style-font': 'mono', 'style-text': 'xsmall', 'style-tone': 'muted' }, `Default: ${defaultValue}`),
    isOptional && !defaultValue && em({ 'style-text': 'xsmall', 'style-tone': 'muted' }, 'Optional')
  ),
  description && p({ 'style-tone': 'muted', 'style-margin': 'none', 'style-text': 'small' }, description)
);

const ApiList = (label, entries, isMethod) => entries && div(
  STACK('small'),
  span({ ...EYEBROW, 'style-tone': 'muted' }, label),
  div({ 'style-divider': 'top' }, ...entries.map(e => ApiRow({ ...e, isMethod })))
);

const MetaRow = (label, value) => {
  if (!value || value === 'N/A' || (Array.isArray(value) && !value.length)) return null;
  return div(
    { 'style-layout': 'row', 'style-justify': 'between', 'style-align': 'baseline', 'style-gap': 'large', 'style-pad-block': 'medium', 'style-divider': 'top' },
    span({ ...EYEBROW, 'style-text': 'small', 'style-tone': 'muted', 'style-wrap': 'nowrap' }, label),
    div(
      { ...STACK('small'), 'style-align': 'end', 'style-text-align': 'end' },
      ...(Array.isArray(value)
        ? value.map(v => code(CODE_CHIP, v))
        : [span({ 'style-font': 'mono', 'style-text': 'xsmall' }, value)])
    )
  );
};

const ComponentViewer = component.ComponentViewer(() => {
  const activeTab = signal.activeTab(COMPONENTS[0]?.id || 'Overview');
  const activeVariantIndex = signal.activeVariantIndex(0);
  const codeCache = signal.codeCache({});
  const demoState = signal.demoState({});

  // demos read and write `state.x`; writes go through the signal so the preview re-renders
  const stateProxy = new Proxy({}, {
    get: (_, prop) => demoState.value[prop],
    set: (_, prop, value) => {
      demoState.value = { ...demoState.value, [prop]: value };
      return true;
    }
  });

  const data = COMPONENTS.find(c => c.id === activeTab.value) || COMPONENTS[0];
  const variants = [data.render].flat();
  if (activeVariantIndex.value >= variants.length) activeVariantIndex.value = 0;
  data._activeVariantIndex = activeVariantIndex.value; // read by the registry's code formatter

  const cacheCode = (code) => { codeCache.value = { ...codeCache.value, [activeTab.value]: code }; };
  if (data.filepath && !codeCache.value[activeTab.value]) {
    cacheCode('// Fetching source code...');
    fetch(data.filepath)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); })
      .then(text => cacheCode(text.replace(/from\s+['"].*?\/([^/]+)\.js['"]/g, "from './$1.js'")))
      .catch(err => cacheCode(`// Error: ${err.message}`));
  }

  return main(
    { 'style-layout': 'row', 'style-align': 'start', 'style-gap': 'xxlarge' },

    div(
      { ...STACK('xsmall'), 'style-position': 'sticky', 'style-inset': 'top', 'style-overflow': 'auto', 'style-wrap': 'nowrap', 'style-max-height': 'screen' },
      ...COMPONENTS.map(item => {
        const isActive = activeTab.value === item.id;
        return a({
          href: `#${item.id}`,
          'style-emphasis': isActive ? 'soft' : 'ghost',
          'style-tone': isActive ? undefined : 'muted',
          'style-weight': isActive ? 'bold' : undefined,
          'style-case': 'upper', 'style-text': 'small', 'style-tracking': 'wide',
          'style-radius': 'small', 'style-pad-block': 'xsmall', 'style-pad-inline': 'small',
          'aria-current': isActive ? 'page' : undefined,
          onclick: (e) => {
            e.preventDefault();
            activeTab.value = item.id;
            activeVariantIndex.value = 0;
          }
        }, item.id);
      })
    ),

    div(
      { ...STACK('xxlarge'), 'style-width': 'full', 'style-max-width': 'xxlarge' },

      div(
        STACK('large'),
        PageHeader(data.title, data.description),
        variants.length > 1 ? div(
          { 'style-layout': 'cluster', 'style-gap': 'small' },
          ...variants.map((fn, i) => Badge({
            variant: activeVariantIndex.value === i ? 'default' : 'secondary',
            'style-interactive': 'clickable',
            onclick: () => { activeVariantIndex.value = i; }
          }, fn.name || `Variant ${i + 1}`))
        ) : null,
        div(
          { 'style-layout': 'grid', 'style-gap': 'large' },
          div(STACK('medium'), MetaRow('Imports', data.imports), MetaRow('State Mngmt', data.state)),
          div(STACK('medium'), MetaRow('Accessibility', data.a11y))
        )
      ),

      div(
        STACK('small'),
        span(EYEBROW, 'Preview'),
        div(
          {
            'style-layout': 'center', 'style-surface': 'raised', 'style-border': 'thin', 'style-radius': 'medium', 'style-pad': 'xxlarge',
            // TODO(style): no min-height attribute
            style: { minBlockSize: '350px' }
          },
          variants[activeVariantIndex.value](stateProxy)
        )
      ),

      div(
        STACK('small'),
        span(EYEBROW, 'Source Code'),
        CodeView({
          exampleCode: data.code,
          componentCode: codeCache.value[activeTab.value] || '// Loading component source...',
          filename: data.filepath ? data.filepath.split('/').pop() : 'component.js'
        })
      ),

      data.exports?.length > 0 && div(
        STACK('large'),
        h3({
          'style-case': 'upper', 'style-weight': 'bold', 'style-text': 'large', 'style-margin': 'none', 'style-pad-block': 'small',
          // TODO(style): style-divider is 1px at the tone's border alpha; no heavy (2px, full-ink) rule
          style: { borderBottom: '2px solid var(--fg)' }
        }, 'API Reference'),
        div(
          STACK('xxlarge'),
          ...data.exports.map(comp => {
            const { props, methods } = introspectComponent(comp);
            if (!props && !methods) return null;
            return div(
              STACK('large'),
              span({ 'style-weight': 'bold', 'style-case': 'upper' }, comp.name || comp.rawFn?.name || 'Component'),
              ApiList('Properties', props, false),
              ApiList('Methods', methods, true)
            );
          })
        )
      )
    )
  );
});

// Files shown on the "Use" tab, grouped by sub-tab: [label, url]
const SOURCES = {
  'Source': [['giant.js', '../../giant.js'], ['giant.css', '../../giant.css']],
  'SSR && SSG': [['Node.js (server.js)', './server.js'], ['Rust (lib.rs)', './../lib.rs']],
};

export const SourceViewer = component(async function SourceViewer() {
  const activeTab = signal.activeTab('Source');
  const files = signal.files(null);

  if (!files.value) {
    const load = async ([label, url]) => {
      try {
        const code = await (await fetch(url)).text();
        // flatten '../../giant.js' style imports so server.js works when copy-pasted
        return [label, url.endsWith('server.js') ? code.replace(/(['"])(?:\.\.\/)+/g, '$1./') : code];
      } catch (e) {
        return [label, `// Error: ${e.message}`];
      }
    };
    files.value = Object.fromEntries(await Promise.all(Object.values(SOURCES).flat().map(load)));
  }

  return div(
    { ...STACK('large'), 'style-margin': 'inline-auto', 'style-width': 'full', 'style-max-width': 'xxlarge' },
    PageHeader('Source Files', 'Just copy and paste these files into your project. There are no packages to install.'),
    div(
      { 'style-layout': 'row', 'style-gap': 'small', 'style-pad-block': 'xsmall', 'style-divider': 'bottom' },
      ...Object.keys(SOURCES).map(label => {
        const isActive = activeTab.value === label;
        return button({
          onClick: () => { activeTab.value = label; },
          'style-emphasis': isActive ? 'soft' : 'ghost',
          'style-tone': isActive ? undefined : 'muted',
          'style-weight': 'medium', 'style-radius': 'small', 'style-pad-block': 'small', 'style-pad-inline': 'large',
          'aria-pressed': String(isActive)
        }, label);
      })
    ),
    CodeView({ tabs: SOURCES[activeTab.value].map(([label]) => ({ label, code: files.value[label] })) })
  );
});

// Parallax: the hero text shrinks and fades as the page scrolls over it
const startParallax = () => {
  let target = window.scrollY;
  let current = target;
  let hero;
  window.addEventListener('scroll', () => { target = window.scrollY; }, { passive: true });
  const frame = () => {
    current += (target - current) * 0.8;
    hero ||= document.getElementById('hero-text-container');
    if (hero) {
      const progress = Math.min(current / 600, 1);
      hero.style.transform = `scale(${1 - progress * 0.06})`;
      hero.style.opacity = Math.max(1 - progress * 1.5, 0);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};

export const ComponentsApp = component.ComponentsApp(() => {
  const started = signal.parallaxStarted(false);
  if (!started.value && !globalThis.isServer) {
    startParallax();
    started.value = true;
  }

  const trigger = (value, label) => TabsTrigger({ value }, label);

  return div(
    // clip (not hidden) so the sticky sidebar keeps working
    { 'style-font': 'sans', 'style-position': 'relative', 'style-overflow': 'clip' },

    div(
      {
        'style-position': 'fixed', 'style-inset': 'top', 'style-layer': 'base', 'style-width': 'full',
        'style-layout': 'center', 'style-surface': 'base',
        // TODO(style): viewport-relative banner height has no attribute
        style: { blockSize: '32vw' }
      },
      div(
        { id: 'hero-text-container', ...STACK('medium'), 'style-align': 'center' },
        h1({
          'style-weight': 'bold', 'style-tracking': 'tight', 'style-leading': 'tight', 'style-margin': 'none',
          'style-interactive': 'static', 'style-text-align': 'center',
          // TODO(style): no display/hero text size (style-text tops out at xxlarge = 2rem)
          style: { fontSize: '18vw' }
        }, 'GIANT.JS'),
        h2({
          'style-tone': 'muted', 'style-weight': 'regular', 'style-tracking': 'wide', 'style-margin': 'none',
          // TODO(style): viewport-relative text size has no attribute
          style: { fontSize: '1.5vw' }
        }, 'THE WEB DEVELOPMENT LIBRARY FOR MODERN ENTERPRISE TEAMS')
      )
    ),

    Tabs(
      { defaultValue: 'components' },
      div(
        {
          'style-position': 'relative', 'style-layer': 'raised', ...STACK('xxlarge'), 'style-surface': 'base',
          'style-height': 'screen', 'style-pad-block': 'large', 'style-pad-inline': 'xlarge', 'style-divider': 'top',
          // TODO(style): no margin scale; the viewport-relative top margin reveals the fixed banner
          style: { margin: 'var(--space-xxlarge)', marginTop: '32vw' }
        },
        header(
          {
            'style-layout': 'row', 'style-case': 'upper', 'style-weight': 'bold',
            'style-text': 'small', 'style-tracking': 'wide', 'style-pad-block': 'medium', 'style-divider': 'bottom'
          },
          // equal-growing ends keep the tabs centred
          div({ 'style-flex': 'grow' }, 'GIANT UI'),
          TabsList(
            { 'style-gap': 'xxlarge', 'style-pad': 'none', 'style-surface': undefined },
            trigger('components', 'COMPONENTS'),
            trigger('documentation', 'DOCUMENTATION'),
            trigger('source', 'USE')
          ),
          div({ 'style-flex': 'grow', 'style-text-align': 'end', 'style-tone': 'muted' }, 'V2.0.0')
        ),
        TabsContent({ value: 'components' }, ComponentViewer({ id: 'viewer' })),
        TabsContent({ value: 'documentation' }, Documentation({ id: 'docs' })),
        TabsContent({ value: 'source' }, SourceViewer({ id: 'source' }))
      )
    )
  );
});

if (globalThis.window) {
  createRoot(ComponentsApp);
}
