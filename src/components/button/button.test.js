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
    )
  );
}, 'button-test-app');

// --- DOM EVENT HELPERS ---
const dispatchPointer = (el, type) => {
  el.dispatchEvent(new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0, // Left click
    pointerType: 'mouse'
  }));
};

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
  // --- PHYSICS & POINTER TESTS ---
  // ==========================================

  // 1. Hover State
  dispatchPointer(standardBtn, 'pointerover');
  await nextTick();
  assert(
    standardBtn.style.boxShadow.includes('0 0 0 4px'),
    'Physics: Applies hover halo box-shadow on pointerover'
  );

  // 2. Active (Pressed) State
  dispatchPointer(standardBtn, 'pointerdown');
  await nextTick();
  assert(
    standardBtn.style.transform === 'scale(0.96)',
    'Physics: Compresses button to scale(0.96) on pointerdown'
  );

  // 3. Release
  dispatchPointer(standardBtn, 'pointerup');
  await nextTick();
  assert(
    standardBtn.style.transform === 'scale(1)',
    'Physics: Rebounds button to scale(1) on pointerup'
  );

  // 4. Pointer Out
  dispatchPointer(standardBtn, 'pointerout');
  await nextTick();
  assert(
    !standardBtn.style.boxShadow.includes('0 0 0 4px'),
    'Physics: Removes hover halo box-shadow on pointerout'
  );

  // ==========================================
  // --- DISABLED STATE TESTS ---
  // ==========================================
  const disabledBtn = getBtn('btn-disabled');

  assert(
    disabledBtn.disabled === true && disabledBtn.getAttribute('aria-disabled') === 'true',
    'Disabled: Applies native disabled attribute and aria-disabled'
  );

  // Attempt to click and trigger physics
  disabledBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  dispatchPointer(disabledBtn, 'pointerdown');
  await nextTick();

  // Because signals bind directly to `el.state` under the hood in giant.js,
  // checking appNode.state here works perfectly!
  assert(
    appNode.state.disabledClicks === 0,
    'Disabled: Blocks onclick handler execution'
  );

  assert(
    disabledBtn.style.transform === 'scale(1)',
    'Disabled: Blocks pointer physics (does not compress)'
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
    loadingBtn.getAttribute('aria-busy') === 'true' && loadingBtn.getAttribute('data-loading') === 'true',
    'Loading: Applies aria-busy and data-loading attributes'
  );
}
