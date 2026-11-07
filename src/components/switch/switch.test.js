import { component, createRoot, html, signal } from '../../giant.js';
import { Switch } from './switch.js';

const { div, span } = html;
const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

export async function testSwitch(mountPoint, assert) {
  let controlledSignal;
  let clickedState = null;

  const SwitchTestApp = component.SwitchTestApp(() => {
    controlledSignal = signal.checkedState(true);

    return div(
      { 'style-layout': 'stack', 'style-gap': 'large' },

      // 1. Uncontrolled Switch
      Switch({
        id: 'sw-uncontrolled',
        defaultChecked: false,
        onChange: (val) => { clickedState = val; }
      }),

      // 2. Disabled Switch
      Switch({ id: 'sw-disabled', disabled: true, defaultChecked: false }),

      // 3. Form Switch (Injects hidden input)
      Switch({ id: 'sw-form', defaultChecked: true, name: 'newsletter', value: 'subscribe' }),

      // 4. Controlled Switch
      Switch({
        id: 'sw-controlled',
        checked: controlledSignal.value,
        onChange: (v) => { controlledSignal.value = v; }
      }),

      // 5. Switch with Children (Label)
      Switch({ id: 'sw-children' }, span('Enable Feature'))
    );
  });

  const appNode = await createRoot(SwitchTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // ==========================================
  // --- DOM NODE LOOKUPS ---
  // ==========================================
  // Host wrappers
  const uncontrolledHost = document.getElementById('sw-uncontrolled');
  const disabledHost = document.getElementById('sw-disabled');
  const formHost = document.getElementById('sw-form');
  const controlledHost = document.getElementById('sw-controlled');
  const childrenHost = document.getElementById('sw-children');

  // Inner button elements
  const btnUncontrolled = uncontrolledHost.querySelector('button');
  const btnDisabled = disabledHost.querySelector('button');
  const btnControlled = controlledHost.querySelector('button');
  const thumbUncontrolled = btnUncontrolled.firstElementChild;

  // ==========================================
  // --- INITIALIZATION TESTS ---
  // ==========================================
  assert(
    btnUncontrolled.getAttribute('aria-checked') === 'false' &&
    btnUncontrolled.getAttribute('data-state') === 'unchecked',
    'Initialization: defaultChecked=false correctly sets ARIA and data attributes'
  );

  assert(
    btnDisabled.disabled === true && disabledHost.getAttribute('style-interactive') === 'static',
    'Initialization: disabled=true correctly disables the underlying button'
  );

  const hiddenInput = formHost.querySelector('input[type="checkbox"]');
  assert(
    hiddenInput !== null &&
    hiddenInput.name === 'newsletter' &&
    hiddenInput.value === 'subscribe' &&
    hiddenInput.checked === true,
    'Form Logic: Passing a "name" prop successfully injects a hidden, synced checkbox input'
  );

  // ==========================================
  // --- EVENT & INTERACTION TESTS ---
  // ==========================================
  clickedState = null;
  uncontrolledHost.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();

  assert(
    btnUncontrolled.getAttribute('aria-checked') === 'true' &&
    clickedState === true,
    'Interaction: Clicking the switch toggles its state and fires onChange'
  );

  let changeDetail = null;
  uncontrolledHost.addEventListener('change', (e) => { changeDetail = e.detail; }, { once: true });
  uncontrolledHost.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();
  assert(
    changeDetail?.checked === false && btnUncontrolled.getAttribute('aria-checked') === 'false',
    'Interaction: A user toggle dispatches a bubbling change event with detail.checked'
  );

  disabledHost.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();
  assert(
    btnDisabled.getAttribute('aria-checked') === 'false',
    'Interaction: Clicking a disabled switch is ignored'
  );

  // ==========================================
  // --- DESIGN ATTRIBUTE TESTS ---
  // ==========================================
  // Hover/press/focus visuals are pure CSS (style-emphasis on the track button).
  assert(
    btnUncontrolled.getAttribute('style-emphasis') === (btnUncontrolled.getAttribute('aria-checked') === 'true' ? 'solid' : 'soft'),
    'Design: track emphasis follows the checked state (solid when on, soft when off)'
  );
  assert(
    thumbUncontrolled.style.translate.startsWith('100%') === (btnUncontrolled.getAttribute('aria-checked') === 'true'),
    'Design: thumb position follows the checked state'
  );

  // ==========================================
  // --- IMPERATIVE API TESTS ---
  // ==========================================
  // Reset uncontrolled host
  uncontrolledHost.setChecked(false);
  await nextTick();
  assert(
    btnUncontrolled.getAttribute('aria-checked') === 'false',
    'API: .setChecked(val) imperatively forces the switch state'
  );

  // ==========================================
  // --- CONTROLLED REACTIVITY TESTS ---
  // ==========================================
  assert(
    btnControlled.getAttribute('aria-checked') === 'true',
    'Reactivity: Controlled switch initializes based on external signal value'
  );

  controlledSignal.value = false;
  await nextTick();
  assert(
    btnControlled.getAttribute('aria-checked') === 'false',
    'Reactivity: Mutating the external signal cleanly updates the DOM'
  );

  controlledHost.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();
  assert(
    controlledSignal.value === true,
    'Reactivity: Clicking a controlled switch updates the external signal via callbacks'
  );
}
