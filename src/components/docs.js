import { component, html } from '../../giant.js';
import { CodeView } from './code/code.js';

const { div, p, span, em, code, nav, table, thead, tr, th, tbody, td, h2, h3, ul, li } = html;

// Sections are stacks; the helpers reset margins and let the gap set the rhythm.
const DocSection = (...children) => div({ 'style-layout': 'stack', 'style-gap': 'medium' }, ...children);
const DocH2 = (text) => h2({ 'style-margin': 'none', 'style-pad-block': 'small' }, text);
const DocH3 = (text) => h3({ 'style-margin': 'none', 'style-pad-block': 'xsmall' }, text);
const DocP = (...children) => p({ 'style-margin': 'none', 'style-leading': 'normal', 'style-tone': 'muted' }, ...children);
const DocUl = (...children) => ul({ 'style-layout': 'stack', 'style-gap': 'small', 'style-margin': 'none', 'style-pad-inline': 'large', 'style-tone': 'muted' }, ...children);
const DocStrong = (text) => span({ 'style-weight': 'bold', 'style-tone': 'neutral' }, text);
const DocInlineCode = (text) => code({ 'style-surface': 'muted', 'style-pad-inline': 'xsmall', 'style-radius': 'small', 'style-font': 'mono', 'style-text': 'small', 'style-tone': 'accent' }, text);
const DocNote = (...children) => div({ 'style-tone': 'accent', 'style-emphasis': 'soft', 'style-radius': 'medium', 'style-pad': 'medium' }, p({ 'style-margin': 'none' }, ...children));
const DocCodeBlock = (codeString) => CodeView({ tabs: [{ label: 'Snippet', code: codeString }] });

// rows: arrays of cells (first cell is the row label), or a string for a group heading
const DocTable = (headers, rows) => table({ 'style-width': 'full', 'style-text': 'small' },
  thead(tr({ 'style-text-align': 'start', 'style-divider': 'bottom' }, ...headers.map((h) => th({ 'style-pad': 'small' }, h)))),
  tbody({ 'style-tone': 'muted' }, ...rows.map((row) => typeof row === 'string'
    ? tr({ 'style-surface': 'muted', 'style-divider': 'bottom' },
        td({ colspan: headers.length, 'style-pad': 'small', 'style-weight': 'bold', 'style-tone': 'neutral', 'style-text': 'xsmall', 'style-case': 'upper', 'style-tracking': 'wide' }, row))
    : tr({ 'style-divider': 'bottom' }, ...row.map((cell, i) => i
        ? td({ 'style-pad': 'small' }, cell)
        : td({ 'style-pad': 'small', 'style-weight': 'bold', 'style-tone': 'neutral' }, cell)))
  ))
);

const OverviewSection = () => DocSection(
  DocH2('Overview'),
  DocP('A <800 LoC, zero-dependency JavaScript UI micro-library for building DOM-native components without compilers, bundlers, or framework-specific tooling. It provides:'),

  DocH2('Philosophy'),
  DocP('Modern frontend architectures often rely on complex build pipelines and heavy runtime abstractions. GIANT takes an alternative approach by enforcing:'),
  DocUl(
    li('minimal indirection between component logic and the DOM'),
    li('transparent memory management tied to native browser lifecycles'),
    li('a vendored, copy-paste deployment model to eliminate supply-chain dependency churn')
  ),

  DocH2('Architecture'),
  DocP(DocStrong('Mental Model: '), 'GIANT does not maintain a persistent UI tree. Components produce ephemeral VNodes that describe updates, and the runtime patches the existing DOM directly—including during hydration.'),

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
    li('Mutations are synchronous.'),
    li('State updates are batched via ', DocInlineCode('queueMicrotask()'), ', coalescing multiple mutations into a single render pass.'),
    li('Event handlers execute against the live DOM context, bypassing render-snapshot stale closures.')
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
    li('Node evaluation is tag-based.'),
    li('Text and attribute assignments occur only upon strict inequality.'),
    li('Existing DOM nodes are preserved and recycled.')
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
    li('No synthetic event wrappers.'),
    li('Event delegation is configured globally per event type at runtime.')
  ),

  DocH3('Event Delegation Model'),

  DocP('GIANT uses a constant-time event delegation system. For each event type (e.g. ', DocInlineCode('click'), ', ', DocInlineCode('input'), '), exactly one global listener is attached to ', DocInlineCode('document'), '.'),

  DocP('Component-specific handlers are stored directly on DOM nodes. When a node is removed from the document, the browser garbage collector reclaims both the node and its associated handlers automatically.'),

  DocUl(
    li('No per-component event listeners are registered.'),
    li('No global handler registry grows over time.'),
    li('Memory usage is bounded by the number of unique event types used in the application.'),
    li('There is no manual cleanup step required for event listeners.')
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
    li('Reusing existing DOM nodes when structure matches'),
    li('Attaching component state directly to DOM instances'),
    li('Registering delegated event handlers without re-rendering the tree')
  ),
  DocNote('GIANT\'s hydration strategy assumes server and client output are structurally equivalent. It intentionally does not provide React-style mismatch recovery, streaming hydration, partial hydration, or replayed event queues.'),

  DocH3('5. Style Attributes'),
  DocP('Styling is expressed as plain ', DocInlineCode('style-*'), ' attributes. Each attribute is one design decision (layout, gap, tone, emphasis, ...) and owns a fixed set of CSS properties, so an element can only ever have one value per decision. The allowed values are generated from giant.css, exported as ', DocInlineCode('styles'), ', and typed in giant.d.ts; unknown values log a warning during development.'),
  DocCodeBlock(`import { html } from 'giant';
const { div, p } = html;

div({ 'style-layout': 'row', 'style-gap': 'small', 'style-pad': 'medium' },
  p({ 'style-weight': 'bold', 'style-tone': 'muted' }, 'Semantic, typed styling!')
);`),

  DocH3('Memory Management'),
  DocP('A global ', DocInlineCode('MutationObserver'), ' monitors the document tree. When a component node is detached:'),
  DocUl(
    li('A ', DocInlineCode('destroyed'), ' event is dispatched to the node.'),
    li('The state reference is cleared from the internal registry.')
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
  DocP(DocStrong('Security Boundary: '), 'GIANT provides safe rendering primitives, not a full security layer.'),
  DocP('GIANT escapes text output and rejects several common dangerous attribute and value patterns (such as inline event handlers, unsafe URLs, and certain CSS injection vectors) to reduce the risk of accidental injection during normal application development.'),
  DocP('However, GIANT is not an HTML sanitizer and must not be treated as one. It does not attempt to fully neutralize adversarial input or guarantee protection against all XSS vectors.'),
  DocP('In enterprise systems, sanitization of untrusted or rich User-Generated Content (UGC) is a dedicated security concern that should be handled explicitly at the application boundary.'),
  DocUl(
    li('Use a vetted sanitizer such as ', DocInlineCode('DOMPurify'), ' for untrusted HTML content.'),
    li('Apply server-side validation and content policies where applicable.'),
    li('Enforce browser-level protections such as Content Security Policy (CSP).'),
    li('Treat all external or user-provided markup as untrusted input.')
  ),
  DocNote('No frontend rendering library should be blindly trusted as the sole defense for adversarial content. GIANT focuses on predictable DOM updates and safe defaults for developer-authored UI, while leaving comprehensive sanitization and security policy enforcement to dedicated tools and application architecture.'),

  DocH2('Comparison to React'),
  DocP('GIANT and React address UI development under different constraints.'),
  DocTable(['Area', 'React', 'GIANT'], [
    ['Rendering Model', 'Persistent VDOM + Fiber', 'Ephemeral VNodes + Direct Patching'],
    ['State Management', 'Hooks / Render Snapshots', 'Proxy / Mutable DOM Context'],
    ['Component Identity', 'Tree position + keys', 'Explicit ID assignment'],
    ['Tooling Dependency', 'Compilation highly recommended', 'Native execution'],
    ['Hydration Model', 'Fiber-based, supports mismatch recovery and streaming', 'Direct DOM reconciliation, assumes structural match']
  ]),

  DocH2('Benchmarks'),
  DocP('These benchmarks compare React 18 UMD production builds against GIANT in the browser. Measurements isolate JavaScript execution time to evaluate framework overhead independent of layout and paint costs.'),

  DocTable(['Test', 'GIANT JS (Median)', 'React 18 JS (Median)', 'Outcome'], [
    '50 Todos',
    ['initial render', '< 1.00ms', '2.00ms', 'GIANT wins'],
    ['toggle all', '< 1.00ms', '1.00ms', 'GIANT wins'],
    ['append 1', '< 1.00ms', '< 1.00ms', 'Dead Tie'],
    ['remove last', '< 1.00ms', '1.00ms', 'GIANT wins'],
    ['reverse', '1.00ms', '2.00ms', 'GIANT wins'],
    '500 Todos',
    ['initial render', '3.00ms', '9.00ms', 'GIANT wins'],
    ['toggle all', '2.00ms', '6.00ms', 'GIANT wins'],
    ['append 1', '1.00ms', '2.00ms', 'GIANT wins'],
    ['remove last', '1.00ms', '3.00ms', 'GIANT wins'],
    ['reverse', '5.00ms', '14.00ms', 'GIANT wins'],
    '10,000 Todos (Stress Test)',
    ['initial render', '39.50ms', '179.00ms', 'GIANT wins'],
    ['toggle all', '21.00ms', '36.00ms', 'GIANT wins'],
    ['append 1', '20.00ms', '10.00ms', 'React wins'],
    ['remove last', '15.50ms', '29.00ms', 'GIANT wins'],
    ['reverse', '61.50ms', '200.50ms', 'GIANT wins'],
    'Edge Cases',
    ['Batched 1,000 state writes', '< 1.00ms', '< 1.00ms', 'Dead Tie (Perfect Microtask Coalescing)']
  ]),

  DocNote('The benchmark suite utilizes a ', DocInlineCode('PerformanceObserver'), ' and ', DocInlineCode('requestAnimationFrame'), ' scheduling across 25 iterations (preceded by 5 JIT warmup phases). Outliers are excluded using Median Absolute Deviation (MAD). Memory profiling is executed separately to isolate algorithmic efficiency.'),
  DocNote('Both libraries were tested out-of-the-box without manual application-level optimizations. The benchmark harness is available at ./todomvc/perf/*.js.'),
  DocNote(DocStrong('Structural Generation: '), 'GIANT exhibits lower execution latency when instantiating new UI structures (Initial Render) or performing mass reordering (Reverse). Bypassing the memory allocation of a persistent Virtual DOM tree in favor of localized VNodes yields measurable execution improvements.'),
  DocNote(DocStrong('Surgical Updates: '), 'React demonstrates lower latency on highly targeted leaf updates (Append 1). React’s persistent Fiber tree allows for optimized heuristic traversal. GIANT mitigates this disparity through attribute caching and localized patching, keeping the performance delta within single-digit milliseconds.'),

  p({
    'style-tone': 'neutral', 'style-leading': 'loose', 'style-margin': 'none', 'style-pad': 'large',
    'style-border': 'thick', 'style-radius': 'medium', 'style-weight': 'medium'
  }, 'GIANT is NOT a toy. In DOM-heavy workloads, GIANT demonstrates lower JavaScript execution overhead in structural rendering and list operations. These results reflect its direct-DOM architecture, which avoids persistent virtual trees and synthetic event systems in favor of localized patching and native browser primitives.'),



  DocH2('Positioning'),
  DocP('GIANT is a minimal, auditable, DOM-first UI runtime for teams that prioritize predictability over abstraction.'),

  DocH2('Summary'),
  DocP('GIANT isolates UI architecture to four primitives: functions, state objects, native DOM nodes, and native events. It eliminates compilers, persistent virtual trees, and synthetic abstractions, resulting in a predictable execution model with high debuggability.'),

  DocH2('License'),
  DocP('MIT')
);

const ReferenceSection = () => DocSection(
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

const LifecycleSection = () => DocSection(
  DocH2('Component Lifecycles'),
  DocP('Because GIANT attaches state to live DOM nodes and proxies mutations directly to microtasks, the DOM itself is the source of truth. There is no persistent virtual tree to sync, which eliminates the need for complex, synthetic lifecycles like ', DocInlineCode('useEffect'), ' or ', DocInlineCode('shouldComponentUpdate'), '.'),
  DocP('Instead, GIANT exposes three simple, native DOM events for lifecycle management:'),

  DocUl(
    li(DocStrong('onready: '), 'Fired once when the component is first attached to the DOM. Ideal for initializing third-party libraries, setting up WebSockets, or starting timers.'),
    li(DocStrong('onupdated: '), 'Fired after a microtask render patch completes. Ideal for syncing new state with imperative third-party plugins.'),
    li(DocStrong('ondestroyed: '), 'Fired when the component is completely detached from the DOM tree. Use this to clean up manual subscriptions or intervals to prevent memory leaks.')
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
    DocStrong('You do not need to clean up standard DOM events. '),
    'GIANT handles event delegation with an O(1) memory model. It registers exactly ', em('one'), ' global listener per event type (e.g., one listener for ', DocInlineCode('click'), ', one for ', DocInlineCode('input'), ') on the ', DocInlineCode('document'), '.'
  ),
  DocP('When you write ', DocInlineCode('onclick: () => {...}'), ', GIANT stores that callback directly on the DOM node. When the node is removed from the tree, the browser\'s garbage collector automatically destroys the node and your callback along with it. There are no dangling global listeners or memory leaks.')
);

const ErrorHandlingSection = () => DocSection(
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
    DocStrong('Generators and Async: '),
    'You can still use standard ', DocInlineCode('try/catch'), ' blocks inside async components to render fallback UI (like a "Failed to load" message). The global error boundary only catches unhandled exceptions that escape your component logic.'
  )
);

const PracticalComparisonSection = () => DocSection(
  DocH2('Practical Enterprise Comparison'),

  DocP(
    'Framework evaluation is often distorted by popularity metrics. A more useful comparison is operational: how much does the system cost to understand, staff, debug, secure, upgrade, and maintain over time?'
  ),

  DocH3('React vs GIANT in Practical Terms'),

  DocTable(['Area', 'React', 'GIANT'], [
    ['Onboarding', 'Requires understanding framework rules, build system, and project conventions', 'Mostly plain JS, DOM, and local component state'],
    ['Daily Development', 'Work is shaped by hooks, render cycles, and framework constraints', 'Work is direct: update state, return UI, patch DOM'],
    ['Debugging', 'Issues may involve lifecycle, hydration, memoization, or tooling', 'Issues usually live in state, event handlers, or DOM output'],
    ['Build & Tooling', 'Build pipeline is required and part of the system complexity', 'No app-level build required; runs directly in the browser'],
    ['Dependencies', 'Multiple libraries for routing, state, forms, SSR, etc.', 'Minimal surface area; fewer moving parts, no supply chain risk.'],
    ['Churn', 'Ecosystem shifts can require periodic rewrites or migrations', 'Closer to stable platform primitives; lower rewrite pressure'],
    ['AI Compatibility', 'AI must reason about framework patterns, versions, and build setups', 'AI works on plain JS with a small, consistent runtime'],
    ['Security Surface', 'Large due to dependencies and build chain', 'Small, vendorable, easier to audit'],
    ['Ecosystem', 'Large ecosystem with ready-made solutions', 'Smaller ecosystem; may require building components yourself'],
    ['Long-Term Cost', 'Higher due to tooling, churn, and complexity', 'Lower due to simplicity and stability']
  ]),

  DocH3('Summary'),

  DocP(
    'React is strongest when the organization values ecosystem leverage, existing integrations, and conventional industry adoption. GIANT is strongest when the organization values low churn, small surface area, auditability, direct debugging, AI alignment, and long-term maintainability.'
  ),

  DocNote(
    DocStrong('Practical Rule: '),
    'Do not ask “how many people already know this framework?” Ask “how quickly can a competent engineer understand this system, safely change it, debug it, and maintain it for years?”'
  )
);

const PerformanceSection = () => DocSection(
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
    DocStrong('Rule of Thumb: '),
    'If typing into a text input makes your application drop frames, your state is too high up the tree. Push the state down into the form or input component itself.'
  ),

  DocH3('Understanding VNode Cost'),
  DocP('GIANT is designed to bypass the memory overhead of a persistent Virtual DOM, but it still has to generate the structural objects to figure out what changed. A component that returns 10 nodes takes microseconds. A component that returns 10,000 nodes takes milliseconds.'),
  DocP('By separating heavy UI elements (like code highlighters, massive tables, or complex SVG charts) into their own isolated components with an explicit ', DocInlineCode('id'), ', you protect them from being unnecessarily recalculated by parent updates.')
);

const AsyncCancellationSection = () => DocSection(
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
    li(DocStrong('On Re-render: '), 'If the component\'s props or state change, GIANT immediately aborts the previous render\'s signal before starting the new render pass. The stale network request dies instantly.'),
    li(DocStrong('On Unmount: '), 'If the component is removed from the DOM (e.g., the user navigates to a new page or closes a modal), GIANT detects the detachment and fires the abort signal, freeing up browser network threads.')
  ),

  DocNote(
    DocStrong('Zero Cleanup Required: '),
    'Because the AbortController is bound to GIANT\'s native DOM patching and MutationObserver lifecycle, you never have to write manual cleanup functions to handle stale closures.'
  )
);

const SECTIONS = [
  ['overview', 'Overview', OverviewSection],
  ['lifecycles', 'Component Lifecycle', LifecycleSection],
  ['async', 'Progressive Rendering', ReferenceSection],
  ['cancellation', 'Async Cancellation', AsyncCancellationSection],
  ['performance', 'Component Isolation', PerformanceSection],
  ['adoption', 'Adoption Guide', PracticalComparisonSection],
  ['errors', 'Error Handling', ErrorHandlingSection]
];

export const Documentation = component(function Documentation() {
  this.state.activeTab ??= 'overview';
  const [, , Section] = SECTIONS.find(([id]) => id === this.state.activeTab) || SECTIONS[0];

  return div({ 'style-layout': 'row', 'style-align': 'start', 'style-gap': 'xlarge', 'style-margin': 'inline-auto', 'style-max-width': 'xxlarge', 'style-pad-block': 'medium' },
    nav({ 'style-position': 'sticky', 'style-inset': 'top', 'style-layout': 'stack', 'style-gap': 'small', 'style-flex': 'none', 'style-width': 'small' },
      div({ 'style-text': 'xsmall', 'style-case': 'upper', 'style-tracking': 'wide', 'style-tone': 'muted' }, 'Contents'),
      ...SECTIONS.map(([id, label]) => {
        const active = this.state.activeTab === id;
        return div({
          'style-pad': 'small', 'style-radius': 'small', 'style-weight': 'bold', 'style-interactive': 'clickable', 'style-motion': 'colors',
          'style-tone': active ? 'neutral' : 'muted',
          'style-surface': active ? 'muted' : undefined,
          'aria-current': active ? 'page' : undefined,
          onclick: () => { this.state.activeTab = id; }
        }, label);
      })
    ),
    div({ 'style-flex': 'grow', 'style-pad-block': 'xxlarge' }, Section())
  );
}, 'giant-docs');
