import { component, createRoot, createElement } from '../giant.js';

component.enableGlobals();

const nextMicrotask = () => Promise.resolve();

// --- FRAMEWORK UI SETUP ---
const Child = component(function Child({ id, label }) {
  this.state.count ??= 0;

  return button({
    class: 'child-btn',
    onClick: () => this.state.count++
  }, `${label}: ${this.state.count}`);
});

const Parent = component(function Parent() {
  return section({ class: 'parent' },
    h1('Parent Component'),
    Child({ id: 'child-a', label: 'Counter A' }),
    Child({ id: 'child-b', label: 'Counter B' })
  );
}, 'parent-app');

let slowResolve;
let fastResolve;

const AsyncRace = component(async function AsyncRace({ id }) {
  this.state.value ??= 'initial';

  const value = this.state.value;

  if (value === 'slow') {
    await new Promise(resolve => { slowResolve = resolve });
  }

  if (value === 'fast') {
    await new Promise(resolve => { fastResolve = resolve });
  }

  return `Async: ${value}`;
});

// --- ASYNC CANCELLATION UI SETUP ---
let capturedSignalA = null;
let capturedSignalB = null;
let abortFireCount = 0;

const AbortTestWidget = component(function AbortTestWidget({ phase }) {
  // Capture the signal injected by the framework
  const currentSignal = this.signal;

  // Listen for the native abort event to prove it fires
  currentSignal.addEventListener('abort', () => abortFireCount++);

  if (phase === 1) capturedSignalA = currentSignal;
  if (phase === 2) capturedSignalB = currentSignal;

  return div({ class: 'abort-widget' }, `Phase: ${phase}`);
}, 'abort-test-widget');

// --- ERROR BOUNDARY UI SETUP ---
const BadSyncChild = component(function BadSyncChild({ shouldCrash }) {
  if (shouldCrash) {
    throw new Error("Simulated synchronous crash!");
  }
  return div({ class: 'good-state' }, "I am functioning normally.");
}, 'bad-sync-child');

const BadAsyncChild = component(async function BadAsyncChild() {
  await nextMicrotask();
  throw new Error("Simulated async crash!");
}, 'bad-async-child');

const ResilientParent = component(function ResilientParent() {
  this.state.crashSync ??= false;

  return section({ class: 'resilient-parent' },
    h1('Resilient Parent'),
    Child({ id: 'survivor-child', label: 'Survivor' }), // This should survive the siblings crashing
    BadSyncChild({ id: 'sync-crash-target', shouldCrash: this.state.crashSync }),
    BadAsyncChild({ id: 'async-crash-target' })
  );
}, 'resilient-app');

let resolveData;
let rejectData;

const AsyncUserWidget = component(async function* AsyncUserWidget({ id, forceFail }) {
  // 1. Yield the loading state immediately
  yield div({ class: 'loading-state' }, `Loading user ${id}...`);

  try {
    // 2. Wait for the test runner to resolve the data
    const data = await new Promise((resolve, reject) => {
      resolveData = resolve;
      rejectData = reject;
    });

    if (forceFail) throw new Error("500 Internal Server Error");

    // 3. Return the final resolved UI
    return div({ class: 'success-state' }, `User ${id}: ${data.name}`);
  } catch (err) {
    // 4. Native Error Boundary
    return div({ class: 'error-state' }, `Failed: ${err.message}`);
  }
}, 'async-user-widget');


// Mount the composed trees
createRoot(Parent);

// --- THE TEST RUNNER ---
const resultsDiv = document.getElementById('results') || document.body.appendChild(document.createElement('div'));
resultsDiv.id = 'results';

const pass = (msg) => resultsDiv.innerHTML += `<div style="color:green">✔ ${msg}</div>`;
const fail = (msg) => resultsDiv.innerHTML += `<div style="color:red">✘ ${msg}</div>`;
const assert = (condition, msg) => condition ? pass(msg) : fail(msg);
const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

async function runTests() {
  await nextTick();

  try {
    const btnA = document.getElementById('child-a');
    const btnB = document.getElementById('child-b');

    assert(btnA && btnB, 'Both composed children mounted to the DOM');

    const innerBtnA = btnA.querySelector('.child-btn');

    // Simulate clicking Child A twice
    innerBtnA.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    innerBtnA.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();

    // Verify Child A updated
    assert(document.getElementById('child-a').textContent === 'Counter A: 2', 'Child A reactivity updated its own state correctly');

    // Verify Child B was completely unaffected
    assert(document.getElementById('child-b').textContent === 'Counter B: 0', 'Child B state remained perfectly isolated');

    // --- Async render race regression test ---
    const asyncEl = AsyncRace({ id: 'async-race' });
    document.body.appendChild(asyncEl);

    await nextTick();

    asyncEl.state.value = 'slow';
    await nextMicrotask();

    asyncEl.state.value = 'fast';
    await nextMicrotask();

    fastResolve();
    await nextTick();

    assert(
      asyncEl.textContent === 'Async: fast',
      'Async component committed the newer fast render'
    );

    slowResolve();
    await nextTick();

    assert(
      asyncEl.textContent === 'Async: fast',
      'Stale async render was ignored after resolving late'
    );

    // ==========================================
    // --- ERROR BOUNDARY TESTS ---
    // ==========================================

    // Temporarily suppress console.error so expected crashes don't pollute test output
    const originalConsoleError = console.error;
    console.error = () => {};

    const resilientEl = ResilientParent({ id: 'error-test-app' });
    document.body.appendChild(resilientEl);
    await nextTick();

    // 1. Verify Asynchronous Crash Containment
    const asyncCrashTarget = document.getElementById('async-crash-target');
    const asyncFallback = asyncCrashTarget.querySelector('[data-giant-error]');
    assert(asyncFallback !== null, 'Error Boundary caught asynchronous promise rejection and rendered fallback');

    // 2. Verify Synchronous Crash Containment (Triggered via state update)
    resilientEl.state.crashSync = true;
    await nextTick();

    const syncCrashTarget = document.getElementById('sync-crash-target');
    const syncFallback = syncCrashTarget.querySelector('[data-giant-error="bad-sync-child"]');
    assert(syncFallback !== null, 'Error Boundary caught synchronous render crash and rendered fallback');

    // 3. Verify Blast Radius Containment (Siblings remain fully interactive)
    const survivorBtn = document.getElementById('survivor-child').querySelector('.child-btn');
    survivorBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();

    assert(
      document.getElementById('survivor-child').textContent === 'Survivor: 1',
      'Error Boundary contained the blast radius; sibling components survived and remain interactive'
    );

    // Restore console.error
    console.error = originalConsoleError;

    // ==========================================
    // --- ASYNC GENERATOR TESTS ---
    // ==========================================

    // 1. Test Happy Path (Yield -> Await -> Return)
    const genApp = AsyncUserWidget({ id: '123', forceFail: false });
    document.body.appendChild(genApp);
    await nextTick();

    assert(
      genApp.textContent === 'Loading user 123...',
      'Generator synchronously yielded the initial loading skeleton'
    );

    resolveData({ name: 'Alice' });
    await nextTick();

    assert(
      genApp.textContent === 'User 123: Alice',
      'Generator correctly patched the final returned success state'
    );

    // 2. Test Native Generator Error Boundary (Yield -> Throw -> Catch)
    const genFailApp = AsyncUserWidget({ id: '999', forceFail: true });
    document.body.appendChild(genFailApp);
    await nextTick();

    assert(
      genFailApp.textContent === 'Loading user 999...',
      'Failing generator yielded the initial loading skeleton'
    );

    // Resolve the promise so the generator continues and hits the `throw`
    resolveData({});
    await nextTick();

    assert(
      genFailApp.textContent === 'Failed: 500 Internal Server Error',
      'Generator natively caught the error and rendered the fallback UI'
    );

    // 3. Test Stale Generator Abandonment (Race Condition Fix)
    // If state/props change while pending, the old generator must be abandoned.
    const raceApp = AsyncUserWidget({ id: 'stale-test', forceFail: false });
    document.body.appendChild(raceApp);
    await nextTick();

    // Grab the first resolver (Stale)
    const staleResolver = resolveData;

    // Trigger a re-render before the first one finishes
    raceApp.render({ id: 'fresh-test' });
    await nextTick();

    assert(
      raceApp.textContent === 'Loading user fresh-test...',
      'Generator restarted and yielded new loading state on prop change'
    );

    // Grab the new resolver (Fresh)
    const freshResolver = resolveData;

    // Resolve the STALE promise first (simulate late network response)
    staleResolver({ name: 'Stale Ghost' });
    await nextTick();

    assert(
      raceApp.textContent === 'Loading user fresh-test...',
      'Framework ignored the stale generator resolution'
    );

    // Resolve the FRESH promise
    freshResolver({ name: 'Fresh Bob' });
    await nextTick();

    assert(
      raceApp.textContent === 'User fresh-test: Fresh Bob',
      'Framework correctly committed the fresh generator resolution'
    );

    // ==========================================
    // --- ASYNC CANCELLATION (ABORTSIGNAL) TESTS ---
    // ==========================================

    const abortWidget = AbortTestWidget({ id: 'abort-test-1', phase: 1 });
    document.body.appendChild(abortWidget);
    await nextTick();

    // 1. Verify initial injection
    assert(
      capturedSignalA !== null && capturedSignalA.aborted === false,
      'Framework successfully injected a fresh, active AbortSignal into the component context'
    );

    // 2. Verify Re-render Cancellation
    // Triggering a new render should instantly abort the signal from Phase 1
    abortWidget.render({ phase: 2 });
    await nextTick();

    assert(
      capturedSignalA.aborted === true,
      'Framework automatically aborted the stale AbortSignal upon re-render'
    );
    assert(
      capturedSignalB !== null && capturedSignalB.aborted === false,
      'Framework generated a fresh AbortSignal for the new render pass'
    );

    // 3. Verify Unmount Cancellation
    // Removing the node from the DOM should trigger the MutationObserver and abort Phase 2
    abortWidget.remove();

    // Wait for the MutationObserver to fire and the queueMicrotask to clear
    await nextTick();
    await nextTick();

    assert(
      capturedSignalB.aborted === true,
      'Framework automatically aborted the active AbortSignal when component was removed from the DOM'
    );
    assert(
      abortFireCount === 2,
      'Native "abort" event listeners fired exactly twice with no leaks'
    );

    pass('ALL COMPOSITION, ISOLATION, AND ERROR BOUNDARY TESTS COMPLETED SUCCESSFULLY.');
  } catch (err) {
    fail(`Test suite crashed: ${err.message}`);
    console.error(err);
  }
}

runTests();
