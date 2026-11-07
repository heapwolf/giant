import { component, createRoot, html, signal } from '../../giant.js';
import { Button } from './button.js';

const { div, section, h2 } = html;

const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

// --- TEST UI SETUP ---
const ButtonTestApp = component.ButtonTestApp(() => {
  // Leverage signals for local component state
  const clicks = signal.clicks(0);
  const disabledClicks = signal.disabledClicks(0);

  return div({ class: 'button-test-wrapper', style: { display: 'flex', flexDirection: 'column', gap: '20px' } },

    // 1. Default & Clickable
    section({ class: 'test-section' },
      h2('Interactive Button'),
      Button({
        id: 'btn-standard',
        onclick: () => clicks.value++
      }, `Clicks: ${clicks.value}`)
    ),

    // 2. Disabled
    section({ class: 'test-section' },
      h2('Disabled Button'),
      Button({
        id: 'btn-disabled',
        disabled: true,
        onclick: () => disabledClicks.value++
      }, 'Disabled')
    ),

    // 3. Loading
    section({ class: 'test-section' },
      h2('Loading Button'),
      Button({
        id: 'btn-loading',
        loading: true
      }, 'Loading')
    ),

    // 4. Variants & sizes
    section({ class: 'test-section' },
      h2('Attention / Small'),
      Button({ id: 'btn-attention', variant: 'attention' }, 'Attention'),
      Button({ id: 'btn-sm', size: 'sm' }, 'Small')
    )
  );
}, 'button-test-app');

// --- TEST RUNNER EXPORT ---
export async function testButton(mountPoint, assert) {
  const appNode = await createRoot(ButtonTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // Helper to safely grab the native <button> tag regardless of architecture
  const getBtn = (id) => {
    const el = document.getElementById(id);
    return el.tagName === 'BUTTON' ? el : el.querySelector('button');
  };

  // ==========================================
  // --- DEFAULT RENDER & CLICK TESTS ---
  // ==========================================
  const standardHost = document.getElementById('btn-standard');
  const standardBtn = getBtn('btn-standard');

  assert(
    standardBtn && standardBtn.tagName === 'BUTTON' && standardBtn.getAttribute('type') === 'button',
    'Base: Renders a native button element with type="button" by default'
  );

  standardBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();

  assert(
    standardHost.textContent.includes('Clicks: 1'),
    'Interaction: Fires onclick handler and updates reactive state'
  );

  // ==========================================
  // --- DESIGN ATTRIBUTE TESTS ---
  // ==========================================
  // Hover/press/focus visuals are pure CSS (style-emphasis in giant.css),
  // so the component only has to emit the right attributes.
  assert(
    standardBtn.getAttribute('style-tone') === 'neutral' && standardBtn.getAttribute('style-emphasis') === 'solid',
    'Design: primary variant maps to neutral tone at solid emphasis'
  );
  assert(
    standardBtn.getAttribute('style-pad-block') === 'small' && standardBtn.getAttribute('style-pad-inline') === 'small',
    'Design: md size maps to small block / small inline padding'
  );
  const attentionBtn = getBtn('btn-attention');
  assert(
    attentionBtn.getAttribute('style-tone') === 'success' && attentionBtn.getAttribute('style-emphasis') === 'solid',
    'Design: attention variant maps to success tone at solid emphasis'
  );
  const smBtn = getBtn('btn-sm');
  assert(
    smBtn.getAttribute('style-case') === 'upper' && smBtn.getAttribute('style-tracking') === 'wide',
    'Design: sm size is uppercase with wide tracking'
  );
  assert(
    !standardBtn.getAttribute('style'),
    'Design: renders no inline style'
  );

  // ==========================================
  // --- DISABLED STATE TESTS ---
  // ==========================================
  const disabledBtn = getBtn('btn-disabled');

  assert(
    disabledBtn.disabled === true,
    'Disabled: Applies native disabled attribute'
  );

  // Attempt to click and trigger physics
  disabledBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();

  // Because signals bind directly to `el.state` under the hood in giant.js,
  // checking appNode.state here works perfectly!
  assert(
    appNode.state.disabledClicks === 0,
    'Disabled: Blocks onclick handler execution'
  );

  // ==========================================
  // --- LOADING STATE TESTS ---
  // ==========================================
  const loadingBtn = getBtn('btn-loading');

  assert(
    loadingBtn.disabled === true,
    'Loading: Implicitly applies native disabled attribute'
  );

  assert(
    loadingBtn.getAttribute('aria-busy') === 'true',
    'Loading: Applies aria-busy'
  );
}
