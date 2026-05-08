import { createRoot, component, html, design, signal } from '../../giant.js';
import { COMPONENTS, introspectComponent } from './registry.js';
import { Button } from './button/button.js';
import { Badge } from './badge/badge.js';
import { Documentation } from './docs.js';
import { CodeView } from './code/code.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs/tabs.js';

component.enableGlobals();

// =========================================================
// UI HELPER: API REFERENCE ROW
// =========================================================
const ApiRow = ({ name, type, defaultValue, isOptional, args, description, isMethod }) => {
  return div(
    {
      class: [design.layout.flex],
      style: {
        flexDirection: 'column', gap: 'var(--layout-space-2)', padding: 'var(--layout-space-5) 0',
        borderBottom: 'var(--shape-border-width-1) solid var(--color-border-muted)'
      }
    },
    div(
      { class: [design.layout.flex, design.layout.itemsCenter], style: { gap: 'var(--layout-space-4)', flexWrap: 'wrap' } },
      span({
        class: [design.typography.fontMono, design.typography.weightBold],
        style: { fontSize: 'var(--typography-size-1)', color: 'var(--color-fg)' }
      }, name + (isMethod ? `(${args || ''})` : '')),
      type && code({
        class: [design.typography.fontMono, design.bg.bgMuted],
        style: {
          fontSize: '0.75rem', color: 'var(--color-accent-3)',
          padding: 'var(--layout-space-1) var(--layout-space-2)', borderRadius: 'var(--shape-radius-1)'
        }
      }, type),
      defaultValue && span({
        class: [design.typography.fontMono],
        style: { fontSize: '0.75rem', color: 'var(--color-fg-muted)' }
      }, `Default: ${defaultValue}`),
      isOptional && !defaultValue && span({
        style: { fontSize: '0.75rem', color: 'var(--color-fg-muted)', fontStyle: 'italic' }
      }, 'Optional')
    ),
    description && p({
      class: [design.fg.fgMuted],
      style: { margin: 0, fontSize: '0.9rem', lineHeight: 'var(--typography-line-normal)' }
    }, description)
  );
};

// =========================================================
// UI HELPER: DYNAMIC API DOCUMENTATION ROW
// =========================================================
const MetaRow = (label, value) => {
  if (!value || value === "N/A" || (Array.isArray(value) && value.length === 0)) return null;
  const isArray = Array.isArray(value);

  return div(
    {
      class: [design.layout.flex, design.layout.justifyBetween, design.layout.itemsStart],
      style: { borderTop: 'var(--shape-border-width-1) solid var(--color-border-muted)', padding: 'var(--layout-space-4) 0', marginTop: 'var(--layout-space-4)', gap: 'var(--layout-space-5)' }
    },
    span({
      class: [design.typography.weightBold, design.typography.transformUppercase],
      style: { color: 'var(--color-fg-muted)', fontSize: 'var(--typography-size-1)', letterSpacing: 'var(--typography-letter-wide)', whiteSpace: 'nowrap', flexShrink: 0 }
    }, label),
    div(
      { class: [design.layout.flex], style: { gap: 'var(--layout-space-2)', flexDirection: isArray ? 'column' : 'row', flexWrap: 'nowrap', justifyContent: 'flex-end', alignItems: 'flex-end', maxWidth: '75%', textAlign: 'right' } },
      isArray
        ? value.map((v, i) => code({ key: i, class: [design.typography.fontMono, design.bg.bgMuted], style: { fontSize: '0.75rem', color: 'var(--color-fg)', padding: 'var(--layout-space-1) var(--layout-space-2)', borderRadius: 'var(--shape-radius-1)' } }, v))
        : [span({ class: [design.typography.fontMono], style: { fontSize: '0.75rem', lineHeight: 'var(--typography-line-snug)' } }, value)]
    )
  );
};

// =========================================================
// ISOLATED TAB 1: COMPONENT VIEWER
// =========================================================
const ComponentViewer = component.ComponentViewer(() => {
  const activeTab = signal.activeTab(COMPONENTS[0]?.id || 'Overview');
  const activeVariantIndex = signal.activeVariantIndex(0);
  const codeCache = signal.codeCache({});
  const demoState = signal.demoState({});

  const stateProxy = new Proxy({}, {
    get: (_, prop) => demoState.value[prop],
    set: (_, prop, value) => {
      demoState.value = { ...demoState.value, [prop]: value };
      return true;
    }
  });

  const activeComponentData = COMPONENTS.find(c => c.id === activeTab.value) || COMPONENTS[0];

  // Determine if the component has multiple variants
  const isArrayRender = Array.isArray(activeComponentData.render);
  const variants = isArrayRender ? activeComponentData.render : [activeComponentData.render];

  // Safety check in case the user navigates to a new component with fewer variants
  if (activeVariantIndex.value >= variants.length) {
    activeVariantIndex.value = 0;
  }

  // Set the active function
  const activeFn = variants[activeVariantIndex.value];
  activeComponentData._activeVariantIndex = activeVariantIndex.value;

  // Fetch current component source
  if (activeComponentData.filepath && !codeCache.value[activeTab.value]) {
    // Spread operator ensures the proxy detects the change and triggers a render
    codeCache.value = { ...codeCache.value, [activeTab.value]: '// Fetching source code...' };
    fetch(activeComponentData.filepath)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); })
      .then(text => {
        const flattenedText = text.replace(/from\s+['"].*?\/([^/]+)\.js['"]/g, "from './$1.js'");
        codeCache.value = { ...codeCache.value, [activeTab.value]: flattenedText };
      })
      .catch(err => { codeCache.value = { ...codeCache.value, [activeTab.value]: `// Error: ${err.message}` }; });
  }

  return main(
    { style: { display: 'grid', gridTemplateColumns: '220px 1fr', gap: 'var(--layout-space-8)', alignItems: 'start' } },

    // --- LEFT SIDEBAR (VERTICAL INDEX) ---
    div(
      {
        class: [design.layout.flex],
        style: {
          position: 'sticky', top: 'var(--layout-space-6)', flexDirection: 'column',
          gap: 'var(--layout-space-1)', maxHeight: 'calc(100vh - var(--layout-space-8))', overflowY: 'auto',
          borderRight: 'var(--shape-border-width-1) solid var(--color-border-muted)', paddingRight: 'var(--layout-space-5)'
        }
      },
      ...COMPONENTS.map(item => {
        const isActive = activeTab.value === item.id;
        return a(
          {
            href: `#${item.id}`,
            class: [design.typography.transformUppercase],
            style: {
              fontSize: '0.85rem', letterSpacing: 'var(--typography-letter-wide)',
              padding: 'var(--layout-space-2) 0', textDecoration: 'none', color: isActive ? 'var(--color-fg)' : 'var(--color-fg-muted)',
              fontWeight: isActive ? 'var(--typography-weight-bold)' : 'var(--typography-weight-regular)',
              borderLeft: isActive ? 'var(--shape-border-width-2) solid var(--color-border-strong)' : 'var(--shape-border-width-2) solid transparent',
              paddingLeft: 'var(--layout-space-0)', marginLeft: '-2px', transition: 'all 0.1s'
            },
            onclick: (e) => {
              e.preventDefault();
              activeTab.value = item.id;
              activeVariantIndex.value = 0; // Reset variant index on tab switch
            }
          },
          item.id
        );
      })
    ),

    // --- RIGHT CONTENT AREA ---
    div(
      { class: [design.layout.flex], style: { flexDirection: 'column', gap: 'var(--layout-space-7)', maxWidth: '1024px', paddingBottom: '10rem' } },

      // TITLE & METADATA
      div({},
        h2({ class: [design.typography.weightBold, design.typography.lineTight], style: { fontSize: 'var(--typography-size-6)', margin: '0 0 var(--layout-space-2) 0' } }, activeComponentData.title),
        p({ class: [design.fg.fgMuted], style: { margin: '0 0 var(--layout-space-6) 0', fontSize: 'var(--typography-size-3)', maxWidth: '600px', lineHeight: 'var(--typography-line-normal)' } }, activeComponentData.description),

        // --- NEW: VARIANT NAVIGATION BADGES ---
        isArrayRender ? div(
          { class: [design.layout.cluster, design.spacing.gap2], style: { marginBottom: 'var(--layout-space-6)' } },
          ...variants.map((variantFn, i) =>
            Badge(
              {
                variant: activeVariantIndex.value === i ? 'default' : 'secondary',
                style: { cursor: 'pointer', userSelect: 'none' },
                onclick: () => { activeVariantIndex.value = i; }
              },
              variantFn.name || `Variant ${i + 1}`
            )
          )
        ) : null,

        div(
          { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0 var(--layout-space-7)' } },
          div(MetaRow('Imports', activeComponentData.imports), MetaRow('State Mngmt', activeComponentData.state)),
          div(MetaRow('Accessibility', activeComponentData.a11y))
        )
      ),

      // PREVIEW BLOCK
      div(
        { class: [design.layout.flex], style: { flexDirection: 'column', gap: 'var(--layout-space-3)' } },
        span({ class: [design.typography.weightBold, design.typography.transformUppercase], style: { fontSize: 'var(--typography-size-0)', letterSpacing: 'var(--typography-letter-wide)' } }, 'Preview'),
        div(
          {
            class: [design.layout.flex, design.layout.itemsCenter, design.layout.justifyCenter],
            style: {
              backgroundColor: 'var(--color-surface)', border: 'var(--shape-border-width-1) solid var(--color-border)',
              borderRadius: 'var(--shape-radius-3)', padding: '4rem', minHeight: '350px', boxShadow: 'var(--effect-shadow-1)'
            }
          },
          // Pass an empty object as a safe default if components were relying on the state object
          activeFn(stateProxy)
        )
      ),

      // CODE VIEWER BLOCK
      div(
        { class: [design.layout.flex], style: { flexDirection: 'column', gap: 'var(--layout-space-3)' } },
        span({ class: [design.typography.weightBold, design.typography.transformUppercase], style: { fontSize: 'var(--typography-size-0)', letterSpacing: 'var(--typography-letter-wide)' } }, 'Source Code'),
        CodeView({
          exampleCode: activeComponentData.code,
          componentCode: codeCache.value[activeTab.value] || '// Loading component source...',
          filename: activeComponentData.filepath ? activeComponentData.filepath.split('/').pop() : 'component.js',
          tab1Label: 'Example Code'
        })
      ),

      // API DOCUMENTATION
      activeComponentData.exports && activeComponentData.exports.length > 0 && div(
        { style: { marginTop: 'var(--layout-space-8)' } },
        h3({
          class: [design.typography.transformUppercase, design.typography.weightBold],
          style: { fontSize: 'var(--typography-size-4)', marginBottom: 'var(--layout-space-6)', borderBottom: 'var(--shape-border-width-2) solid var(--color-border-strong)', paddingBottom: 'var(--layout-space-2)' }
        }, 'API Reference'),
        div(
          { class: [design.layout.flex], style: { flexDirection: 'column', gap: 'var(--layout-space-8)' } },
          ...activeComponentData.exports.map(comp => {
            const { props, methods } = introspectComponent(comp);
            const compName = comp.name || (comp.rawFn && comp.rawFn.name) || 'Component';

            if (!props && !methods) return null;

            return div(
              { class: [design.layout.flex], style: { flexDirection: 'column' } },
              span({ class: [design.typography.weightBold, design.typography.transformUppercase], style: { fontSize: 'var(--typography-size-2)', marginBottom: 'var(--layout-space-4)', color: 'var(--color-fg)' } }, compName),
              props && div(
                { style: { marginBottom: 'var(--layout-space-6)' } },
                span({ class: [design.typography.weightBold, design.typography.transformUppercase], style: { fontSize: '0.75rem', color: 'var(--color-fg-muted)', letterSpacing: 'var(--typography-letter-wide)' } }, 'Properties'),
                div({ style: { borderTop: 'var(--shape-border-width-1) solid var(--color-border-muted)', marginTop: 'var(--layout-space-2)' } }, ...props.map(p => ApiRow({ ...p, isMethod: false })))
              ),
              methods && div(
                {},
                span({ class: [design.typography.weightBold, design.typography.transformUppercase], style: { fontSize: '0.75rem', color: 'var(--color-fg-muted)', letterSpacing: 'var(--typography-letter-wide)' } }, 'Methods'),
                div({ style: { borderTop: 'var(--shape-border-width-1) solid var(--color-border-muted)', marginTop: 'var(--layout-space-2)' } }, ...methods.map(m => ApiRow({ ...m, isMethod: true })))
              )
            );
          })
        )
      )
    )
  );
});

// =========================================================
// ISOLATED TAB 3: SOURCE VIEWER
// =========================================================
export const SourceViewer = component(async function SourceViewer() {
  // Top-level tab state
  const activeTab = signal.activeTab('Source');

  // File caches
  const giantJsCache = signal.giantJsCache();
  const giantCssCache = signal.giantCssCache();
  const serverJsCache = signal.serverJsCache();
  const rustCache = signal.rustCache(); // Now dynamic!

  // Utility to replace deep relative paths (e.g., '../../giant.js') with flat paths ('./giant.js')
  const normalizePaths = (code) => {
    return code.replace(/(['"])(?:\.\.\/)+/g, '$1./');
  };

  if (!this.state.loaded) {
    const baseUrl = globalThis.isServer ? 'http://localhost:3000' : '';

    try {
      // Fetch all four files directly from the live server/repo
      const [jsRes, cssRes, serverRes, rustRes] = await Promise.all([
        fetch(`../../giant.js`),
        fetch(`../../giant.css`),
        fetch(`./server.js`),
        fetch(`./../lib.rs`)
      ]);

      giantJsCache.value = await jsRes.text();
      giantCssCache.value = await cssRes.text();

      // Normalize the imports so it works out-of-the-box for copy/pasters
      const rawServerCode = await serverRes.text();
      serverJsCache.value = normalizePaths(rawServerCode);

      rustCache.value = await rustRes.text();

    } catch (e) {
      const errorMsg = `// Error: ${e.message}`;
      giantJsCache.value = errorMsg;
      giantCssCache.value = `/* Error: ${e.message} */`;
      serverJsCache.value = errorMsg;
      rustCache.value = errorMsg;
    }

    this.state.loaded = true;
  }

  // UI helper for the top-level tab buttons
  const TabButton = (label) => {
    const isActive = activeTab.value === label;
    return button({
      onClick: () => activeTab.value = label,
      class: [
        design.typography.size2,
        design.typography.weightMedium,
        isActive ? design.fg.fg : design.fg.fgMuted
      ],
      style: {
        padding: '0.75rem 1.5rem',
        background: 'none',
        border: 'none',
        borderBottom: isActive ? '2px solid var(--color-primary-3)' : '2px solid transparent',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        outline: 'none'
      }
    }, label);
  };

  // Determine which CodeView configuration to render
  let activeContent;
  if (activeTab.value === 'Source') {
    activeContent = CodeView({
      tabs: [
        { label: 'giant.js', code: giantJsCache.value || '// Fetching giant.js...' },
        { label: 'giant.css', code: giantCssCache.value || '/* Fetching giant.css... */' }
      ]
    });
  } else if (activeTab.value === 'SSR && SSG') {
    activeContent = CodeView({
      tabs: [
        { label: 'Node.js (server.js)', code: serverJsCache.value || '// Fetching server.js...' },
        { label: 'Rust (lib.rs)', code: rustCache.value || '// Fetching lib.rs...' }
      ]
    });
  }

  return div(
    { class: [design.layout.flex], style: { flexDirection: 'column', gap: 'var(--layout-space-6)', maxWidth: '1200px', margin: '0 auto', paddingBottom: '10rem' } },

    // Header
    div({},
      h2({ class: [design.typography.weightBold, design.typography.lineTight], style: { fontSize: 'var(--typography-size-6)', margin: '0 0 var(--layout-space-2) 0' } }, 'Source Files'),
      p({ class: [design.fg.fgMuted], style: { margin: '0 0 var(--layout-space-4) 0', fontSize: 'var(--typography-size-3)', lineHeight: 'var(--typography-line-normal)' } }, 'Just copy and paste these files into your project. There are no packages to install.')
    ),

    // Top-level Navigation Tabs
    div({ style: { display: 'flex', borderBottom: '1px solid var(--color-border-muted)' } },
      TabButton('Source'),
      TabButton('SSR && SSG')
    ),

    // Code Viewer Window
    activeContent
  );
});

// =========================================================
// MAIN APPLICATION ROOT
// =========================================================
export const ComponentsApp = component.ComponentsApp(() => {
  // Use Signals
  const initialized = signal.initialized(false);
  const entropy = signal.entropy([]);

  // 1. Initialize entropy vectors and our high-performance animation loop
  if (!initialized.value) {
    entropy.value = "GIANT.JS".split('').map(char => ({
      char,
      dx: (Math.random() - 0.5) * 1.5,
      dy: (Math.random() - 0.5) * 1.5,
      dr: (Math.random() - 0.5) * 1.2,
      ds: Math.random() * 0.015,
      do: (Math.random() * 0.002) + 0.0015,
    }));

    let targetScroll = typeof window !== 'undefined' ? window.scrollY : 0;
    let currentScroll = targetScroll;
    let heroTextContainer;

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', () => {
        targetScroll = window.scrollY;
      }, { passive: true });
    }

    // The 120fps render loop
    const renderLoop = () => {
      currentScroll += (targetScroll - currentScroll) * 0.8;

      if (!heroTextContainer) {
        heroTextContainer = document.getElementById('hero-text-container');
      }

      if (heroTextContainer) {
        const progress = Math.min(currentScroll / 600, 1);
        const scale = 1 - (progress * 0.06);
        const opacity = Math.max(1 - (progress * 1.5), 0);

        heroTextContainer.style.transform = `scale(${scale})`;
        heroTextContainer.style.opacity = opacity;
      }

      requestAnimationFrame(renderLoop);
    };

    requestAnimationFrame(renderLoop);
    initialized.value = true;
  }

  return div(
    { class: [design.typography.fontSans, design.layout.relative], style: { overflowX: 'hidden' } },

    // BACKGROUND PARALLAX BANNER
    div(
      {
        class: [design.layout.flex, design.layout.itemsCenter, design.layout.justifyCenter],
        style: { position: 'fixed', top: 0, left: 0, width: '100%', height: '32vw', backgroundColor: 'var(--color-inverse-fg)', flexDirection: 'column', zIndex: 0 }
      },
      div(
        {
          id: 'hero-text-container',
          class: [design.layout.flex, design.layout.itemsCenter],
          style: { flexDirection: 'column', willChange: 'transform, opacity' }
        },
        h1(
          {
            class: [design.typography.weightBold],
            style: {
              fontSize: '18vw',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              lineHeight: '0.9',
              margin: 0,
              color: 'var(--color-inverse-bg)',
              userSelect: 'none',
              textAlign: 'center'
            }
          },
          'GIANT.JS'
        ),
        h2({ style: { color: 'var(--color-inverse-bg)', fontSize: '1.5vw', letterSpacing: '0.2em', margin: 'var(--layout-space-4) 0 0 0', fontWeight: 'var(--typography-weight-thin)', opacity: '0.8' } }, 'THE WEB DEVELOPMENT LIBRARY FOR MODERN ENTERPRISE TEAMS')
      )
    ),

    // FOREGROUND CONTENT LAYER
    Tabs(
      { defaultValue: 'components', variant: 'unstyled' },
      div(
        {
          class: [design.layout.relative, design.layout.flex],
          style: { zIndex: 10, margin: '60px', marginTop: '32vw', backgroundColor: 'var(--color-bg)', color: 'var(--color-fg)', minHeight: '100vh', padding: '22px 5%', flexDirection: 'column', borderTop: 'var(--shape-border-width-2) solid var(--color-border)' }
        },
        header(
          { class: [design.layout.flex, design.layout.itemsCenter, design.typography.transformUppercase, design.typography.weightBold], style: { fontSize: 'var(--typography-size-1)', marginBottom: 'var(--layout-space-7)', letterSpacing: 'var(--typography-letter-wide)', borderBottom: 'var(--shape-border-width-1) solid var(--color-border)', paddingBottom: 'var(--layout-space-4)', justifyContent: 'space-between' } },
          div({ style: { flex: '1', textAlign: 'left' } }, 'GIANT UI'),
          TabsList(
            { class: [design.layout.flex], style: { gap: 'var(--layout-space-7)', justifyContent: 'center', background: 'transparent', padding: 0 } },
            TabsTrigger({ value: 'components', style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 } }, 'COMPONENTS'),
            TabsTrigger({ value: 'documentation', style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 } }, 'DOCUMENTATION'),
            TabsTrigger({ value: 'source', style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 } }, 'USE')
          ),
          div({ style: { flex: '1', textAlign: 'right', color: 'var(--color-fg-muted)' } }, 'V1.0.0')
        ),

        // Isolated Content Panels
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
