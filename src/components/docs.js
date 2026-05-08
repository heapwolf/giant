// docs.js
import { component, design, html } from '../../giant.js'; // Adjust imports as necessary for your env
import { Button } from './button/button.js';
import { CodeView } from './code/code.js';

const { div, p, span, pre, code, button, svg, rect, path, polyline, nav, table, thead, tr, th, tbody, td, h2, h3, ul, li } = html;

// =========================================================
// DOCUMENTATION HELPERS
// =========================================================
const DocH2 = (text) => h2({ style: { marginTop: 'var(--layout-space-8, 2rem)', marginBottom: 'var(--layout-space-4, 1rem)' } }, text);
const DocH3 = (text) => h3({ style: { marginTop: 'var(--layout-space-6, 1.5rem)', marginBottom: 'var(--layout-space-3, 0.75rem)' } }, text);
const DocP = (...children) => p({ style: { lineHeight: '1.6', marginBottom: 'var(--layout-space-4, 1rem)', color: 'var(--color-fg-muted, #4b5563)' } }, ...children);
const DocUl = (...children) => ul({ style: { listStyleType: 'disc', paddingLeft: 'var(--layout-space-6, 1.5rem)', marginBottom: 'var(--layout-space-4, 1rem)', color: 'var(--color-fg-muted, #4b5563)' } }, ...children);
const DocLi = (...children) => li({ style: { marginBottom: 'var(--layout-space-2, 0.5rem)' } }, ...children);
const DocInlineCode = (text) => code({ style: { backgroundColor: 'var(--color-bg-subtle, #f3f4f6)', padding: '0.15em 0.3em', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.9em', color: 'var(--color-accent-2, #db2777)' } }, text);
const DocNote = (...children) => div({ style: { backgroundColor: 'var(--color-bg-muted)', borderLeft: '4px solid var(--color-accent-3)', padding: 'var(--layout-space-4, 1rem)', margin: 'var(--layout-space-4, 1rem) 0', color: 'var(--color-fg-muted, #4b5563)' } }, p({style: {margin: 0}}, ...children));

// Map DocCodeBlock directly to CodeView
const DocCodeBlock = (codeString) => CodeView({ tabs: [{ label: 'Snippet', code: codeString }] });

// =========================================================
// SECTIONS
// =========================================================
const OverviewSection = () => div({ style: { display: 'flex', flexDirection: 'column' } },
  DocH2('Overview'),
  DocP('A <800 LoC, zero-dependency JavaScript UI micro-library for building DOM-native components without compilers, bundlers, or framework-specific tooling. It provides:'),

  DocH2('Philosophy'),
  DocP('Modern frontend architectures often rely on complex build pipelines and heavy runtime abstractions. GIANT takes an alternative approach by enforcing:'),
  DocUl(
    DocLi('minimal indirection between component logic and the DOM'),
    DocLi('transparent memory management tied to native browser lifecycles'),
    DocLi('a vendored, copy-paste deployment model to eliminate supply-chain dependency churn')
  ),

  DocH2('Architecture'),
  DocP(span({ style: { fontWeight: 'bold' } }, 'Mental Model: '), 'GIANT does not maintain a persistent UI tree. Components produce ephemeral VNodes that describe updates, and the runtime patches the existing DOM directly—including during hydration.'),

  DocH3('Proxy-Based State'),
  DocP('Component state is attached directly to the DOM instance and wrapped in a JavaScript ', DocInlineCode('Proxy'), '.'),
  DocCodeBlock(`const Counter = component(function Counter() {
  // State is attached to the live DOM context and persists automatically
  this.state.count ??= 0;

  return button({
    onclick: () => this.state.count++
  }, \`Count: \${this.state.count}\`);
});`),
  DocUl(
    DocLi('Mutations are synchronous.'),
    DocLi('State updates are batched via ', DocInlineCode('queueMicrotask()'), ', coalescing multiple mutations into a single render pass.'),
    DocLi('Event handlers execute against the live DOM context, bypassing render-snapshot stale closures.')
  ),
  DocP('State identity is strictly deterministic:'),
  DocCodeBlock(`// Using an explicit ID ensures the state survives parent re-renders
Counter({ id: 'cart-count' })`),
  DocP('Components require explicit IDs to persist state across parent re-renders. Unkeyed components receive a generated local ID and will reset state if the parent reconstructs the node. This is a deliberate tradeoff: instead of inferring identity from tree position, GIANT requires persistent components to declare identity directly.'),
  DocP('The result is highly predictable state ownership. A component with the same ', DocInlineCode('id'), ' receives the same state object across parent re-renders, DOM reconciliation, and reconstruction of surrounding UI.'),
  DocP('Unkeyed or anonymous component instances are treated as local, disposable UI. They are useful for stateless rendering or transient structure, but persistent state should always be assigned an explicit ', DocInlineCode('id'), '.'),

  DocH3('Hybrid DOM Patching'),
  DocP('GIANT utilizes ephemeral VNodes as render descriptions rather than maintaining a persistent virtual DOM tree. The reconciler mutates the live DOM:'),
  DocUl(
    DocLi('Node evaluation is tag-based.'),
    DocLi('Text and attribute assignments occur only upon strict inequality.'),
    DocLi('Existing DOM nodes are preserved and recycled.')
  ),
  DocP('List operations rely on the ', DocInlineCode('key'), ' attribute for stable identity tracking:'),
  DocCodeBlock(`ul(
  items.map(item => li({ key: item.id }, item.label))
)`),

  DocH3('Native Event System'),
  DocP('Events are delegated directly to the browser\'s native APIs.'),
  DocCodeBlock(`button({
  onclick() {
    this.state.open = true
  }
}, 'Open')`),
  DocUl(
    DocLi('No synthetic event wrappers.'),
    DocLi('Event delegation is configured globally per event type at runtime.')
  ),

  DocH3('Event Delegation Model'),

  DocP('GIANT uses a constant-time event delegation system. For each event type (e.g. ', DocInlineCode('click'), ', ', DocInlineCode('input'), '), exactly one global listener is attached to ', DocInlineCode('document'), '.'),

  DocP('Component-specific handlers are stored directly on DOM nodes. When a node is removed from the document, the browser garbage collector reclaims both the node and its associated handlers automatically.'),

  DocUl(
    DocLi('No per-component event listeners are registered.'),
    DocLi('No global handler registry grows over time.'),
    DocLi('Memory usage is bounded by the number of unique event types used in the application.'),
    DocLi('There is no manual cleanup step required for event listeners.')
  ),

  DocP('This model is equivalent in complexity to modern frameworks that use delegated event systems, while remaining fully transparent and aligned with native browser behavior.'),



  DocH3('Server-Side Rendering & "Direct-Hydration"'),
  DocP('Components serialize to sanitized HTML strings. On the client, GIANT performs direct DOM reconciliation against existing server-rendered markup, attaching state and event listeners without reconstructing the UI tree.'),
  DocCodeBlock(`// Server: Generate a static HTML string
const htmlString = App({ id: 'app-root', data: serverData }).toString();

// Client: Hydrate the existing DOM directly
import { createRoot } from 'giant';
createRoot(App); // Automatically binds to existing elements in the tree`),
  DocP('"Direct-Hydration" in GIANT is defined as:'),
  DocUl(
    DocLi('Reusing existing DOM nodes when structure matches'),
    DocLi('Attaching component state directly to DOM instances'),
    DocLi('Registering delegated event handlers without re-rendering the tree')
  ),
  DocNote('GIANT\'s hydration strategy assumes server and client output are structurally equivalent. It intentionally does not provide React-style mismatch recovery, streaming hydration, partial hydration, or replayed event queues.'),

  DocH3('5. Runtime CSS Introspection'),
  DocP('GIANT can parse loaded stylesheets at runtime and expose utility classes as a JavaScript ', DocInlineCode('design'), ' object, ensuring JS-to-CSS alignment without a dedicated build step.'),
  DocCodeBlock(`import { design, html } from 'giant';
const { div, p } = html;

// Automatically maps .layout-flex to design.layout.flex
// and .bg-blue-500 to design.bg.blue500
div({ class: [design.layout.flex, design.spacing.p4] },
  p({ class: design.typography.bold }, 'Auto-discovered CSS tokens!')
);`),

  DocH3('Memory Management'),
  DocP('A global ', DocInlineCode('MutationObserver'), ' monitors the document tree. When a component node is detached:'),
  DocUl(
    DocLi('A ', DocInlineCode('destroyed'), ' event is dispatched to the node.'),
    DocLi('The state reference is cleared from the internal registry.')
  ),
  DocCodeBlock(`const PollingWidget = component(function() {
  return div({
    onready: (e) => {
      // Native lifecycle event fired when attached to the DOM
      this.state.timer = setInterval(() => this.render(), 1000);
    },
    ondestroyed: (e) => {
      // Native lifecycle event fired when completely detached
      clearInterval(this.state.timer);
    }
  }, 'Live Data');
});`),

  DocH2('Security'),
  DocP(span({ style: { fontWeight: 'bold' } }, 'Security Boundary: '), 'GIANT provides safe rendering primitives, not a full security layer.'),
  DocP('GIANT escapes text output and rejects several common dangerous attribute and value patterns (such as inline event handlers, unsafe URLs, and certain CSS injection vectors) to reduce the risk of accidental injection during normal application development.'),
  DocP('However, GIANT is not an HTML sanitizer and must not be treated as one. It does not attempt to fully neutralize adversarial input or guarantee protection against all XSS vectors.'),
  DocP('In enterprise systems, sanitization of untrusted or rich User-Generated Content (UGC) is a dedicated security concern that should be handled explicitly at the application boundary.'),
  DocUl(
    DocLi('Use a vetted sanitizer such as ', DocInlineCode('DOMPurify'), ' for untrusted HTML content.'),
    DocLi('Apply server-side validation and content policies where applicable.'),
    DocLi('Enforce browser-level protections such as Content Security Policy (CSP).'),
    DocLi('Treat all external or user-provided markup as untrusted input.')
  ),
  DocNote('No frontend rendering library should be blindly trusted as the sole defense for adversarial content. GIANT focuses on predictable DOM updates and safe defaults for developer-authored UI, while leaving comprehensive sanitization and security policy enforcement to dedicated tools and application architecture.'),

  DocH2('Comparison to React'),
  DocP('GIANT and React address UI development under different constraints.'),
  table(
    { style: { width: '100%', borderCollapse: 'collapse', marginTop: 'var(--layout-space-4)', marginBottom: 'var(--layout-space-6)', fontSize: '0.9rem' } },
    thead(
      tr({ style: { borderBottom: '2px solid var(--color-border)', textAlign: 'left', color: 'var(--color-fg)' } },
        th({ style: { padding: '0.75rem' } }, 'Area'),
        th({ style: { padding: '0.75rem' } }, 'React'),
        th({ style: { padding: '0.75rem' } }, 'GIANT')
      )
    ),
    tbody(
      { style: { color: 'var(--color-fg-muted)' } },
      tr({ style: { borderBottom: '1px solid var(--color-border-muted)' } },
        td({ style: { padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-fg)' } }, 'Rendering Model'),
        td({ style: { padding: '0.75rem' } }, 'Persistent VDOM + Fiber'),
        td({ style: { padding: '0.75rem' } }, 'Ephemeral VNodes + Direct Patching')
      ),
      tr({ style: { borderBottom: '1px solid var(--color-border-muted)' } },
        td({ style: { padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-fg)' } }, 'State Management'),
        td({ style: { padding: '0.75rem' } }, 'Hooks / Render Snapshots'),
        td({ style: { padding: '0.75rem' } }, 'Proxy / Mutable DOM Context')
      ),
      tr({ style: { borderBottom: '1px solid var(--color-border-muted)' } },
        td({ style: { padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-fg)' } }, 'Component Identity'),
        td({ style: { padding: '0.75rem' } }, 'Tree position + keys'),
        td({ style: { padding: '0.75rem' } }, 'Explicit ID assignment')
      ),
      tr({ style: { borderBottom: '1px solid var(--color-border-muted)' } },
        td({ style: { padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-fg)' } }, 'Tooling Dependency'),
        td({ style: { padding: '0.75rem' } }, 'Compilation highly recommended'),
        td({ style: { padding: '0.75rem' } }, 'Native execution')
      ),
      tr({ style: { borderBottom: '1px solid var(--color-border-muted)' } },
        td({ style: { padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-fg)' } }, 'Hydration Model'),
        td({ style: { padding: '0.75rem' } }, 'Fiber-based, supports mismatch recovery and streaming'),
        td({ style: { padding: '0.75rem' } }, 'Direct DOM reconciliation, assumes structural match')
      )
    )
  ),

  DocH2('Benchmarks'),
  DocP('These benchmarks compare React 18 UMD production builds against GIANT in the browser. Measurements isolate JavaScript execution time to evaluate framework overhead independent of layout and paint costs.'),

  table(
    { style: { width: '100%', borderCollapse: 'collapse', marginTop: 'var(--layout-space-4)', marginBottom: 'var(--layout-space-6)', fontSize: '0.9rem' } },
    thead(
      tr({ style: { borderBottom: '2px solid var(--color-border)', textAlign: 'left', color: 'var(--color-fg)' } },
        th({ style: { padding: 'var(--layout-space-3)' } }, 'Test'),
        th({ style: { padding: 'var(--layout-space-3)' } }, 'GIANT JS (Median)'),
        th({ style: { padding: 'var(--layout-space-3)' } }, 'React 18 JS (Median)'),
        th({ style: { padding: 'var(--layout-space-3)' } }, 'Outcome')
      )
    ),
    tbody(
      { style: { color: 'var(--color-fg-muted)' } },
      ...[
        { type: 'header', title: '50 Todos' },
        { name: 'initial render', giant: '< 1.00ms', react: '2.00ms', outcome: 'GIANT wins' },
        { name: 'toggle all', giant: '< 1.00ms', react: '1.00ms', outcome: 'GIANT wins' },
        { name: 'append 1', giant: '< 1.00ms', react: '< 1.00ms', outcome: 'Dead Tie' },
        { name: 'remove last', giant: '< 1.00ms', react: '1.00ms', outcome: 'GIANT wins' },
        { name: 'reverse', giant: '1.00ms', react: '2.00ms', outcome: 'GIANT wins' },

        { type: 'header', title: '500 Todos' },
        { name: 'initial render', giant: '3.00ms', react: '9.00ms', outcome: 'GIANT wins' },
        { name: 'toggle all', giant: '2.00ms', react: '6.00ms', outcome: 'GIANT wins' },
        { name: 'append 1', giant: '1.00ms', react: '2.00ms', outcome: 'GIANT wins' },
        { name: 'remove last', giant: '1.00ms', react: '3.00ms', outcome: 'GIANT wins' },
        { name: 'reverse', giant: '5.00ms', react: '14.00ms', outcome: 'GIANT wins' },

        { type: 'header', title: '10,000 Todos (Stress Test)' },
        { name: 'initial render', giant: '39.50ms', react: '179.00ms', outcome: 'GIANT wins' },
        { name: 'toggle all', giant: '21.00ms', react: '36.00ms', outcome: 'GIANT wins' },
        { name: 'append 1', giant: '20.00ms', react: '10.00ms', outcome: 'React wins' },
        { name: 'remove last', giant: '15.50ms', react: '29.00ms', outcome: 'GIANT wins' },
        { name: 'reverse', giant: '61.50ms', react: '200.50ms', outcome: 'GIANT wins' },

        { type: 'header', title: 'Edge Cases' },
        { name: 'Batched 1,000 state writes', giant: '< 1.00ms', react: '< 1.00ms', outcome: 'Dead Tie (Perfect Microtask Coalescing)' }
      ].map(row => {
        if (row.type === 'header') {
          return tr({ style: { backgroundColor: 'var(--color-bg-subtle)', borderBottom: '1px solid var(--color-border-muted)' } },
            td({ colspan: '4', style: { padding: '0.5rem 0.75rem', fontWeight: 'bold', color: 'var(--color-fg)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, row.title)
          );
        }
        return tr({ style: { borderBottom: '1px solid var(--color-border-muted)' } },
          td({ style: { padding: '0.75rem', color: 'var(--color-fg)' } }, row.name),
          td({ style: { padding: '0.75rem' } }, row.giant),
          td({ style: { padding: '0.75rem' } }, row.react),
          td({ style: { padding: '0.75rem' } }, row.outcome)
        );
      })
    )
  ),

  DocNote('The benchmark suite utilizes a ', DocInlineCode('PerformanceObserver'), ' and ', DocInlineCode('requestAnimationFrame'), ' scheduling across 25 iterations (preceded by 5 JIT warmup phases). Outliers are excluded using Median Absolute Deviation (MAD). Memory profiling is executed separately to isolate algorithmic efficiency.'),
  DocNote('Both libraries were tested out-of-the-box without manual application-level optimizations. The benchmark harness is available at ./todomvc/perf/*.js.'),
  DocNote(span({ style: { fontWeight: 'bold' } }, 'Structural Generation: '), 'GIANT exhibits lower execution latency when instantiating new UI structures (Initial Render) or performing mass reordering (Reverse). Bypassing the memory allocation of a persistent Virtual DOM tree in favor of localized VNodes yields measurable execution improvements.'),
  DocNote(span({ style: { fontWeight: 'bold' } }, 'Surgical Updates: '), 'React demonstrates lower latency on highly targeted leaf updates (Append 1). React’s persistent Fiber tree allows for optimized heuristic traversal. GIANT mitigates this disparity through attribute caching and localized patching, keeping the performance delta within single-digit milliseconds.'),

  p({
    style: { color: 'var(--color-fg)', lineHeight: '1.8', margin: '1.5rem 0', padding: '1.25rem', border: '2px solid var(--color-border-strong)', borderRadius: '8px', fontWeight: '500' }
  }, 'GIANT is NOT a toy. In DOM-heavy workloads, GIANT demonstrates lower JavaScript execution overhead in structural rendering and list operations. These results reflect its direct-DOM architecture, which avoids persistent virtual trees and synthetic event systems in favor of localized patching and native browser primitives.'),



  DocH2('Positioning'),
  DocP('GIANT is a minimal, auditable, DOM-first UI runtime for teams that prioritize predictability over abstraction.'),

  DocH2('Summary'),
  DocP('GIANT isolates UI architecture to four primitives: functions, state objects, native DOM nodes, and native events. It eliminates compilers, persistent virtual trees, and synthetic abstractions, resulting in a predictable execution model with high debuggability.'),

  DocH2('License'),
  DocP('MIT')
);

const ReferenceSection = () => div({ style: { display: 'flex', flexDirection: 'column' } },
  DocH2('Async Generators & Lifecycles'),
  DocP('GIANT natively supports multi-stage rendering and error boundaries using standard JavaScript ', DocInlineCode('async function*'), ' generators. This completely eliminates the need for external constructs like ', DocInlineCode('<Suspense>'), ', ', DocInlineCode('<ErrorBoundary>'), ', or explicit ', DocInlineCode('isLoading'), ' state variables.'),

  DocP('By yielding VNodes, you can paint intermediate loading states directly to the DOM. A standard ', DocInlineCode('try/catch'), ' block acts as a native, localized error boundary.'),

  DocCodeBlock(`const UserProfile = component(async function* ({ id }) {
  // 1. Immediate loading skeleton
  yield div("Loading...");

  try {
    // 2. Await data fetching
    const user = await fetch(\`/api/users/\${id}\`).then(r => r.json());

    // 3. Final resolved UI
    return div(h2(user.name), p(user.bio));
  } catch (err) {
    // 4. Native error boundary
    return div({ class: 'error' }, "Failed to load");
  }
});`),

  DocH3('Automatic Stale Render Abandonment'),
  DocP('If a component\'s props or state change while an asynchronous generator is still pending (e.g., waiting for a slow network request), GIANT detects the stale render sequence.'),
  DocP('It will immediately abandon the old generator and patch the DOM with the new render cycle. This prevents race conditions where late network responses accidentally overwrite newer UI.'),
  DocCodeBlock(`const SearchResults = component(async function* ({ query }) {
  yield div("Searching for: ", query, "...");

  // If the 'query' prop changes while this fetch is pending,
  // GIANT automatically abandons this specific generator instance.
  const results = await fetch(\`/api/search?q=\${query}\`).then(r => r.json());

  // This final yield will NOT patch the DOM if a newer render has started.
  return ul(
    results.map(item => li({ key: item.id }, item.title))
  );
});`),

  DocH3('Progressive UI States'),
  DocP('Because generators can yield multiple times, you can build complex, progressive loading pipelines natively. The execution perfectly maps to the visual lifecycle over time:'),

  DocCodeBlock(`const AIResponseWidget = component(async function* ({ prompt }) {
  yield div("Connecting to inference server...");
  await connectToServer();

  yield div("Processing parameters...");
  const data = await generateResponse(prompt);

  return div(h3("Result"), p(data.answer));
});`)
);

const LifecycleSection = () => div({ style: { display: 'flex', flexDirection: 'column' } },
  DocH2('Component Lifecycles'),
  DocP('Because GIANT attaches state to live DOM nodes and proxies mutations directly to microtasks, the DOM itself is the source of truth. There is no persistent virtual tree to sync, which eliminates the need for complex, synthetic lifecycles like ', DocInlineCode('useEffect'), ' or ', DocInlineCode('shouldComponentUpdate'), '.'),
  DocP('Instead, GIANT exposes three simple, native DOM events for lifecycle management:'),

  DocUl(
    DocLi(span({ style: { fontWeight: 'bold', color: 'var(--color-fg)' } }, 'onready: '), 'Fired once when the component is first attached to the DOM. Ideal for initializing third-party libraries, setting up WebSockets, or starting timers.'),
    DocLi(span({ style: { fontWeight: 'bold', color: 'var(--color-fg)' } }, 'onupdated: '), 'Fired after a microtask render patch completes. Ideal for syncing new state with imperative third-party plugins.'),
    DocLi(span({ style: { fontWeight: 'bold', color: 'var(--color-fg)' } }, 'ondestroyed: '), 'Fired when the component is completely detached from the DOM tree. Use this to clean up manual subscriptions or intervals to prevent memory leaks.')
  ),

  DocH3('Integration Example: Third-Party Libraries'),
  DocP('The most common use case for lifecycle events is wrapping imperative, stateful UI libraries (like charts or 3D canvases) inside a GIANT component:'),

  DocCodeBlock(`const UserChart = component(function({ data }) {
  return div({
    // 1. MOUNT: Initialize the third-party library
    onready: (e) => {
      // Attach the chart instance to our state so it persists
      this.state.chart = new Chart(e.target, data);
    },

    // 2. UPDATE: Sync DOM changes to the library
    onupdated: (e) => {
      // When GIANT re-renders this component, feed the new data to the chart
      this.state.chart.updateData(data);
    },

    // 3. UNMOUNT: Cleanup
    ondestroyed: (e) => {
      // Destroy the chart instance when the component leaves the DOM
      this.state.chart.destroy();
    }
  });
});`),

  DocH3('What about standard event listeners?'),
  DocNote(
    span({ style: { fontWeight: 'bold' } }, 'You do not need to clean up standard DOM events. '),
    'GIANT handles event delegation with an O(1) memory model. It registers exactly ', span({ style: { fontStyle: 'italic' } }, 'one'), ' global listener per event type (e.g., one listener for ', DocInlineCode('click'), ', one for ', DocInlineCode('input'), ') on the ', DocInlineCode('document'), '.'
  ),
  DocP('When you write ', DocInlineCode('onclick: () => {...}'), ', GIANT stores that callback directly on the DOM node. When the node is removed from the tree, the browser\'s garbage collector automatically destroys the node and your callback along with it. There are no dangling global listeners or memory leaks.')
);

const ErrorHandlingSection = () => div({ style: { display: 'flex', flexDirection: 'column' } },
  DocH2('Error Handling & Telemetry'),
  DocP('GIANT treats every component as an implicit Error Boundary. If a component throws an error during synchronous rendering, inside an async generator, or during a Promise resolution, the error is caught by the framework.'),
  DocP('Instead of crashing the entire application tree, GIANT safely abandons that component\'s render cycle and patches the DOM with a hidden ', DocInlineCode('<span data-giant-error="ComponentName">'), ' element to preserve layout stability.'),

  DocH3('Global Telemetry Hook'),
  DocP('For enterprise environments requiring observability (Datadog, Sentry, New Relic), GIANT exposes a single, global hook: ', DocInlineCode('component.onError'), '.'),
  DocP('By defining this function at the entry point of your application, you can pipe all component crashes directly into your logging pipeline without wrapping individual components in try/catch blocks.'),

  DocCodeBlock(`import { component, createRoot } from 'giant';
import { App } from './app.js';

// Pipe all framework errors to your telemetry service
component.onError = (error, info) => {
  Datadog.log('Component Crash', {
    componentName: info.component, // e.g., "ui-user-profile"
    instanceId: info.id,           // e.g., "user-123"
    stackTrace: error.stack
  });
};

createRoot(App);`),

  DocH3('Native DOM Error Events'),
  DocP('If ', DocInlineCode('component.onError'), ' is not defined, GIANT falls back to logging the error to the console and dispatching a native CustomEvent on the ', DocInlineCode('window'), ' object.'),
  DocP('You can listen for these globally:'),

  DocCodeBlock(`window.addEventListener('giant:error', (e) => {
  console.error('Captured crash in:', e.detail.component);
  console.error('Component ID:', e.detail.id);
  console.error('Trace:', e.detail.error);
});`),

  DocNote(
    span({ style: { fontWeight: 'bold' } }, 'Generators and Async: '),
    'You can still use standard ', DocInlineCode('try/catch'), ' blocks inside async components to render fallback UI (like a "Failed to load" message). The global error boundary only catches unhandled exceptions that escape your component logic.'
  )
);

const PracticalComparisonSection = () => div({ style: { display: 'flex', flexDirection: 'column' } },
  DocH2('Practical Enterprise Comparison'),

  DocP(
    'Framework evaluation is often distorted by popularity metrics. A more useful comparison is operational: how much does the system cost to understand, staff, debug, secure, upgrade, and maintain over time?'
  ),

  DocH3('React vs GIANT in Practical Terms'),

  table(
    { style: { width: '100%', borderCollapse: 'collapse', marginTop: 'var(--layout-space-4)', marginBottom: 'var(--layout-space-6)', fontSize: '0.9rem' } },
    thead(
      tr({ style: { borderBottom: '2px solid var(--color-border)', textAlign: 'left', color: 'var(--color-fg)' } },
        th({ style: { padding: '0.75rem' } }, 'Area'),
        th({ style: { padding: '0.75rem' } }, 'React'),
        th({ style: { padding: '0.75rem' } }, 'GIANT')
      )
    ),
    tbody(
      { style: { color: 'var(--color-fg-muted)' } },

      tr({ style: { borderBottom: '1px solid var(--color-border-muted)' } },
        td({ style: { padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-fg)' } }, 'Onboarding'),
        td({ style: { padding: '0.75rem' } }, 'Requires understanding framework rules, build system, and project conventions'),
        td({ style: { padding: '0.75rem' } }, 'Mostly plain JS, DOM, and local component state')
      ),

      tr({ style: { borderBottom: '1px solid var(--color-border-muted)' } },
        td({ style: { padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-fg)' } }, 'Daily Development'),
        td({ style: { padding: '0.75rem' } }, 'Work is shaped by hooks, render cycles, and framework constraints'),
        td({ style: { padding: '0.75rem' } }, 'Work is direct: update state, return UI, patch DOM')
      ),

      tr({ style: { borderBottom: '1px solid var(--color-border-muted)' } },
        td({ style: { padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-fg)' } }, 'Debugging'),
        td({ style: { padding: '0.75rem' } }, 'Issues may involve lifecycle, hydration, memoization, or tooling'),
        td({ style: { padding: '0.75rem' } }, 'Issues usually live in state, event handlers, or DOM output')
      ),

      tr({ style: { borderBottom: '1px solid var(--color-border-muted)' } },
        td({ style: { padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-fg)' } }, 'Build & Tooling'),
        td({ style: { padding: '0.75rem' } }, 'Build pipeline is required and part of the system complexity'),
        td({ style: { padding: '0.75rem' } }, 'No app-level build required; runs directly in the browser')
      ),

      tr({ style: { borderBottom: '1px solid var(--color-border-muted)' } },
        td({ style: { padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-fg)' } }, 'Dependencies'),
        td({ style: { padding: '0.75rem' } }, 'Multiple libraries for routing, state, forms, SSR, etc.'),
        td({ style: { padding: '0.75rem' } }, 'Minimal surface area; fewer moving parts, no supply chain risk.')
      ),

      tr({ style: { borderBottom: '1px solid var(--color-border-muted)' } },
        td({ style: { padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-fg)' } }, 'Churn'),
        td({ style: { padding: '0.75rem' } }, 'Ecosystem shifts can require periodic rewrites or migrations'),
        td({ style: { padding: '0.75rem' } }, 'Closer to stable platform primitives; lower rewrite pressure')
      ),

      tr({ style: { borderBottom: '1px solid var(--color-border-muted)' } },
        td({ style: { padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-fg)' } }, 'AI Compatibility'),
        td({ style: { padding: '0.75rem' } }, 'AI must reason about framework patterns, versions, and build setups'),
        td({ style: { padding: '0.75rem' } }, 'AI works on plain JS with a small, consistent runtime')
      ),

      tr({ style: { borderBottom: '1px solid var(--color-border-muted)' } },
        td({ style: { padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-fg)' } }, 'Security Surface'),
        td({ style: { padding: '0.75rem' } }, 'Large due to dependencies and build chain'),
        td({ style: { padding: '0.75rem' } }, 'Small, vendorable, easier to audit')
      ),

      tr({ style: { borderBottom: '1px solid var(--color-border-muted)' } },
        td({ style: { padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-fg)' } }, 'Ecosystem'),
        td({ style: { padding: '0.75rem' } }, 'Large ecosystem with ready-made solutions'),
        td({ style: { padding: '0.75rem' } }, 'Smaller ecosystem; may require building components yourself')
      ),

      tr(
        td({ style: { padding: '0.75rem', fontWeight: 'bold', color: 'var(--color-fg)' } }, 'Long-Term Cost'),
        td({ style: { padding: '0.75rem' } }, 'Higher due to tooling, churn, and complexity'),
        td({ style: { padding: '0.75rem' } }, 'Lower due to simplicity and stability')
      )
    )
  ),

  DocH3('Summary'),

  DocP(
    'React is strongest when the organization values ecosystem leverage, existing integrations, and conventional industry adoption. GIANT is strongest when the organization values low churn, small surface area, auditability, direct debugging, AI alignment, and long-term maintainability.'
  ),

  DocNote(
    span({ style: { fontWeight: 'bold' } }, 'Practical Rule: '),
    'Do not ask “how many people already know this framework?” Ask “how quickly can a competent engineer understand this system, safely change it, debug it, and maintain it for years?”'
  )
);

const PerformanceSection = () => div({ style: { display: 'flex', flexDirection: 'column' } },
  DocH2('Performance & Component Isolation'),
  DocP('While GIANT\'s DOM patching is exceptionally fast (often hitting the 33ms VSync floor for thousands of mutations), generating the ephemeral VNode tree still consumes JavaScript execution time. The most common performance trap is monolithic state, often called the "God Component" anti-pattern.'),

  DocH3('The "God Component" Trap'),
  DocP('If you place unrelated state variables at the very root of your application, every mutation forces GIANT to execute the component function and rebuild the VNodes for the entire application tree—even for UI that hasn\'t changed or is visually hidden.'),

  DocCodeBlock(`// ❌ ANTI-PATTERN: Monolithic State
const App = component(function() {
  this.state.activeTab ??= 'home';
  this.state.searchQuery ??= '';

  return div(
    Sidebar(), // Re-evaluates VNodes on every keystroke!
    this.state.activeTab === 'home' ? Home() : Settings(),
    HeavyDataGrid() // Re-evaluates VNodes on every keystroke!
  );
});`),

  DocH3('The Solution: Push State Down'),
  DocP('To keep your application lean, isolate state into the specific components that own that interaction. When a localized component\'s state mutates, GIANT only re-executes that specific component and patches its localized DOM branch.'),

  DocCodeBlock(`// ✅ BEST PRACTICE: Isolated State
const SearchBar = component(function() {
  this.state.query ??= '';

  return input({
    value: this.state.query,
    oninput: (e) => this.state.query = e.target.value
  });
});

const App = component(function() {
  // App is now stateless. It evaluates exactly once.
  return div(
    Sidebar(),
    SearchBar({ id: 'global-search' }), // Manages its own input state
    TabManager({ id: 'main-tabs' }),    // Manages its own active tab
    HeavyDataGrid({ id: 'data-grid' })  // Never re-renders unless its own data changes
  );
});`),

  DocNote(
    span({ style: { fontWeight: 'bold' } }, 'Rule of Thumb: '),
    'If typing into a text input makes your application drop frames, your state is too high up the tree. Push the state down into the form or input component itself.'
  ),

  DocH3('Understanding VNode Cost'),
  DocP('GIANT is designed to bypass the memory overhead of a persistent Virtual DOM, but it still has to generate the structural objects to figure out what changed. A component that returns 10 nodes takes microseconds. A component that returns 10,000 nodes takes milliseconds.'),
  DocP('By separating heavy UI elements (like code highlighters, massive tables, or complex SVG charts) into their own isolated components with an explicit ', DocInlineCode('id'), ', you protect them from being unnecessarily recalculated by parent updates.')
);

const AsyncCancellationSection = () => div({ style: { display: 'flex', flexDirection: 'column' } },
  DocH2('Async Cancellation (AbortSignal)'),
  DocP('Network race conditions are a notorious source of bugs in modern web apps. If a user triggers a data fetch, but then clicks away or changes the search parameters before the request completes, the stale network request usually continues running in the background, wasting bandwidth and potentially overwriting newer data when it finally resolves.'),

  DocP('GIANT solves this at the framework level. Every component render automatically generates an ', DocInlineCode('AbortController'), ' and exposes its ', DocInlineCode('signal'), ' directly on the component context (', DocInlineCode('this.signal'), ').'),

  DocH3('How to use it'),
  DocP('Simply pass ', DocInlineCode('this.signal'), ' to any ', DocInlineCode('fetch()'), ' call or abortable web API:'),

  DocCodeBlock(`const SearchResults = component(async function* ({ query }) {
  yield div("Searching...");

  try {
    // Pass the framework-managed signal to the fetch request
    const res = await fetch(\`/api/search?q=\${query}\`, {
      signal: this.signal
    });

    const data = await res.json();
    return div("Results: ", data.length);

  } catch (err) {
    // The browser throws a specific error when aborted
    if (err.name === 'AbortError') {
      console.log('Search cancelled by framework');
      return;
    }
    return div("Search failed");
  }
});`),

  DocH3('When does GIANT abort the signal?'),
  DocUl(
    DocLi(span({ style: { fontWeight: 'bold', color: 'var(--color-fg)' } }, 'On Re-render: '), 'If the component\'s props or state change, GIANT immediately aborts the previous render\'s signal before starting the new render pass. The stale network request dies instantly.'),
    DocLi(span({ style: { fontWeight: 'bold', color: 'var(--color-fg)' } }, 'On Unmount: '), 'If the component is removed from the DOM (e.g., the user navigates to a new page or closes a modal), GIANT detects the detachment and fires the abort signal, freeing up browser network threads.')
  ),

  DocNote(
    span({ style: { fontWeight: 'bold' } }, 'Zero Cleanup Required: '),
    'Because the AbortController is bound to GIANT\'s native DOM patching and MutationObserver lifecycle, you never have to write manual cleanup functions to handle stale closures.'
  )
);

// ==========================================
// THE MAIN DOCUMENTATION COMPONENT
// ==========================================
export const Documentation = component(function Documentation() {
  this.state.activeTab ??= 'overview';

  const NavItem = (id, label) => div({
    style: {
      padding: 'var(--layout-space-2, 0.5rem) var(--layout-space-3, 0.75rem)',
      cursor: 'pointer',
      fontWeight: 'bold',
      color: this.state.activeTab === id ? 'var(--color-fg, #111827)' : 'var(--color-fg-muted, #6b7280)',
      borderLeft: this.state.activeTab === id ? '3px solid var(--color-fg, #111827)' : '3px solid transparent',
      transition: 'all 0.2s ease'
    },
    onClick: () => this.state.activeTab = id
  }, label);

  return div({
    style: {
      display: 'flex',
      gap: 'var(--layout-space-8, 2rem)',
      maxWidth: '1000px',
      margin: '0 auto',
      paddingTop: 'var(--layout-space-4, 1rem)',
      alignItems: 'flex-start'
    }
  },
    // Sidebar Table of Contents
    nav({
      style: {
        position: 'sticky',
        top: 'var(--layout-space-6, 1.5rem)',
        minWidth: '200px',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--layout-space-2, 0.5rem)'
      }
    },
      div({ style: { fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-fg-muted, #6b7280)', marginBottom: 'var(--layout-space-2, 0.5rem)' } }, 'Contents'),
      NavItem('overview', 'Overview'),
      NavItem('lifecycles', 'Compomnent Lifecycle'),
      NavItem('async', 'Progressive Rendering'),
      NavItem('cancellation', 'Async Cancellation'),
      NavItem('performance', 'Component Isolation'),
      NavItem('adoption', 'Adoption Guide'),
      NavItem('errors', 'Error Handling')
    ),

    // Main Content Area
    div({
      style: {
        flex: 1,
        minWidth: 0,
        paddingBottom: '10rem'
      }
    },
      this.state.activeTab === 'overview' ? OverviewSection() :
      this.state.activeTab === 'lifecycles' ? LifecycleSection() :
      this.state.activeTab === 'async' ? ReferenceSection() :
      this.state.activeTab === 'cancellation' ? AsyncCancellationSection() :
      this.state.activeTab === 'performance' ? PerformanceSection() :
      this.state.activeTab === 'errors' ? ErrorHandlingSection() :
      this.state.activeTab === 'adoption' ? PracticalComparisonSection() :
      null
    )
  );
}, 'giant-docs');
