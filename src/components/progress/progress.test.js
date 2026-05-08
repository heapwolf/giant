import { component, createRoot, html } from '../../giant.js';
import { Progress } from './progress.js';

const { div, section, h2 } = html;
const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

const ProgressTestApp = component.ProgressTestApp(() => {
  return div({ style: { display: 'flex', flexDirection: 'column', gap: '20px' } },
    section({},
      h2('Determinate'),
      Progress({ id: 'progress-determinate', value: 33, max: 100 })
    ),
    section({},
      h2('Indeterminate'),
      Progress({ id: 'progress-indeterminate', value: null })
    )
  );
});

export async function testProgress(mountPoint, assert) {
  const appNode = await createRoot(ProgressTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // The custom elements (host the APIs)
  const detHost = document.getElementById('progress-determinate');
  const indetHost = document.getElementById('progress-indeterminate');

  // The outer wrapper divs (host the attributes/state)
  const detTrack = detHost.firstElementChild;
  const indetTrack = indetHost.firstElementChild;

  // The inner indicator divs (host the transform styles)
  const indicator = detTrack.firstElementChild;

  // ==========================================
  // --- INITIALIZATION TESTS ---
  // ==========================================
  assert(
    detTrack.getAttribute('aria-valuenow') === '33',
    'Determinate: Correct sets aria-valuenow from props'
  );

  assert(
    indetTrack.getAttribute('data-state') === 'indeterminate' && !indetTrack.hasAttribute('aria-valuenow'),
    'Indeterminate: Correct handles null values as indeterminate state'
  );

  // ==========================================
  // --- STYLE / TRANSFORM TESTS ---
  // ==========================================
  assert(
    indicator.style.transform.includes('translateX(-67%)'),
    'Style: Correct calculates transform percentage (33 - 100 = -67)'
  );

  // ==========================================
  // --- PROGRAMMATIC API TESTS ---
  // ==========================================

  // Test setValue
  detHost.setValue(100);
  await nextTick();

  assert(
    detTrack.getAttribute('data-state') === 'complete' &&
    indicator.style.transform.includes('translateX(0%)'), // Fixed CSSOM normalization!
    'API: setValue(100) updates state to complete and fills the bar'
  );

  // Test setMax
  detHost.setMax(200);
  detHost.setValue(50);
  await nextTick();

  assert(
    indicator.style.transform.includes('translateX(-75%)'),
    'API: setMax() correctly re-calculates the scale (50/200 = 25%, so -75% translation)'
  );

  // ==========================================
  // --- REACTIVITY TESTS ---
  // ==========================================
  detHost.render({ value: 10 });
  await nextTick();

  assert(
    detHost.getValue() === 10,
    'Reactivity: render() with new value prop syncs to internal state'
  );
}
