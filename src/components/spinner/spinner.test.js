import { component, createRoot, html, signal } from '../../giant.js';
import { Spinner } from './spinner.js';

const { div } = html;
const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

export async function testSpinner(mountPoint, assert) {
  // Signal for testing reactive prop updates
  let spinSignal;

  const SpinnerTestApp = component.SpinnerTestApp(() => {
    spinSignal = signal.isSpinningProp(true);

    return div(
      { style: { display: 'flex', gap: '10px' } },
      // Initialization & Sizing
      Spinner({ id: 'spin-default' }),
      Spinner({ id: 'spin-lg', size: 'lg' }),
      Spinner({ id: 'spin-custom', size: '100px' }),

      // Prop Logic
      Spinner({ id: 'spin-hidden', spinning: false }),
      Spinner({ id: 'spin-reactive', spinning: spinSignal.value }),

      // Imperative API
      Spinner({ id: 'spin-api' })
    );
  });

  const appNode = await createRoot(SpinnerTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // ==========================================
  // --- DOM NODE LOOKUPS ---
  // ==========================================
  // These lookups target the Giant.js wrapper elements (<ui-spinner>)
  const defaultHost = document.getElementById('spin-default');
  const lgHost = document.getElementById('spin-lg');
  const customHost = document.getElementById('spin-custom');
  const hiddenHost = document.getElementById('spin-hidden');
  const reactiveHost = document.getElementById('spin-reactive');
  const apiHost = document.getElementById('spin-api');

  // ==========================================
  // --- INITIALIZATION & SIZING TESTS ---
  // ==========================================
  assert(
    defaultHost.querySelector('svg').getAttribute('width') === '24px',
    'Initialization: Default spinner renders with "md" size (24px)'
  );

  assert(
    lgHost.querySelector('svg').getAttribute('width') === '32px',
    'Props: Named sizes (e.g., "lg") correctly map to mapped pixel values'
  );

  assert(
    customHost.querySelector('svg').getAttribute('width') === '100px',
    'Props: Custom string sizes pass through directly to width/height'
  );

  assert(
    hiddenHost.querySelector('svg') === null,
    'Props: spinning=false causes component to render null (no SVG injected)'
  );

  // ==========================================
  // --- REACTIVE PROP TESTS ---
  // ==========================================
  spinSignal.value = false;
  await nextTick();
  assert(
    reactiveHost.querySelector('svg') === null,
    'Reactivity: Dynamically updating the spinning prop to false hides the spinner'
  );

  spinSignal.value = true;
  await nextTick();
  assert(
    reactiveHost.querySelector('svg') !== null,
    'Reactivity: Dynamically updating the spinning prop to true reveals the spinner'
  );

  // ==========================================
  // --- IMPERATIVE API TESTS ---
  // ==========================================
  assert(
    apiHost.isSpinning === true,
    'API: .isSpinning getter accurately reflects the current state'
  );

  apiHost.stop();
  await nextTick();
  assert(
    apiHost.querySelector('svg') === null && apiHost.isSpinning === false,
    'API: .stop() method updates state and unmounts the SVG'
  );

  apiHost.start();
  await nextTick();
  assert(
    apiHost.querySelector('svg') !== null && apiHost.isSpinning === true,
    'API: .start() method updates state and remounts the SVG'
  );

  apiHost.toggle();
  await nextTick();
  assert(
    apiHost.querySelector('svg') === null && apiHost.isSpinning === false,
    'API: .toggle() method correctly flips the state'
  );
}
