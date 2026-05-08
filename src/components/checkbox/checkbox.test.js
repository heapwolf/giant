import { component, createRoot, html, signal } from '../../giant.js';
import { Checkbox } from './checkbox.js';

const { div, section, h2, span } = html;

const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

// --- TEST UI SETUP ---
const CheckboxTestApp = component.CheckboxTestApp(() => {
  const lastChangeVal = signal.lastChangeVal('none');

  // Bulletproof callback normalizer
  const handleCheck = (val) => {
    let isChecked = val;
    if (val && typeof val === 'object') {
      // Extract from CustomEvent detail or native target.checked
      if (val.detail !== undefined) isChecked = val.detail;
      else if (val.target && val.target.checked !== undefined) isChecked = val.target.checked;
      else isChecked = true; // Fallback generic event
    }
    lastChangeVal.value = isChecked;
  };

  return div({ class: 'checkbox-test-wrapper', style: { display: 'flex', flexDirection: 'column', gap: '40px' } },

    section({ class: 'test-section' },
      h2('Standard Checkbox'),
      Checkbox({
        id: 'test-cb-standard',
        defaultChecked: false,
        onCheckedChange: handleCheck,
        onchange: handleCheck, // Fallback for native-style emitters
        onChange: handleCheck
      }, span('Standard Option')),

      div({ id: 'callback-output' }, String(lastChangeVal.value))
    ),

    section({ class: 'test-section' },
      h2('Pre-checked & API Checkbox'),
      Checkbox({
        id: 'test-cb-checked',
        checked: true
      }, span('Already Checked Option'))
    ),

    section({ class: 'test-section' },
      h2('Disabled Checkbox'),
      Checkbox({
        id: 'test-cb-disabled',
        disabled: true,
        defaultChecked: false
      }, span('Disabled Option'))
    )

  );
}, 'checkbox-test-app');

// --- TEST RUNNER EXPORT ---
export async function testCheckbox(mountPoint, assert) {
  const appNode = await createRoot(CheckboxTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  const cbStandardHost = document.getElementById('test-cb-standard');
  const cbCheckedHost = document.getElementById('test-cb-checked');
  const cbDisabledHost = document.getElementById('test-cb-disabled');

  const getRoot = (host) => host.querySelector('[data-checkbox-root]');
  const getOutput = () => document.getElementById('callback-output').textContent;

  // ==========================================
  // --- INITIALIZATION TESTS ---
  // ==========================================
  assert(
    getRoot(cbStandardHost).getAttribute('aria-checked') === 'false',
    'Initialization: Standard checkbox is unchecked by default'
  );

  assert(
    getRoot(cbCheckedHost).getAttribute('aria-checked') === 'true',
    'Initialization: Pre-checked checkbox respects the `checked` prop'
  );

  assert(
    typeof cbStandardHost.check === 'function' && typeof cbStandardHost.toggle === 'function',
    'API: Component exposes public methods (check, uncheck, toggle, getValue, etc.) on the host node'
  );

  // ==========================================
  // --- CLICK INTERACTION TESTS ---
  // ==========================================

  // 1. Click to check
  getRoot(cbStandardHost).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();

  assert(
    getRoot(cbStandardHost).getAttribute('aria-checked') === 'true',
    'Interaction: Clicking the checkbox root toggles the state to checked'
  );

  assert(
    getOutput() === 'true',
    'Events: Checking the box fires the onCheckedChange callback with true'
  );

  // 2. Click to uncheck
  getRoot(cbStandardHost).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();

  assert(
    getRoot(cbStandardHost).getAttribute('aria-checked') === 'false',
    'Interaction: Clicking the checkbox again toggles the state to unchecked'
  );

  // ==========================================
  // --- KEYBOARD INTERACTION TESTS ---
  // ==========================================

  getRoot(cbStandardHost).dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  await nextTick();

  assert(
    getRoot(cbStandardHost).getAttribute('aria-checked') === 'true',
    'Keyboard: Pressing "Space" on the checkbox toggles it to checked'
  );

  getRoot(cbStandardHost).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await nextTick();

  assert(
    getRoot(cbStandardHost).getAttribute('aria-checked') === 'false',
    'Keyboard: Pressing "Enter" on the checkbox toggles it to unchecked'
  );

  // ==========================================
  // --- PUBLIC API TESTS ---
  // ==========================================

  cbStandardHost.uncheck();
  await nextTick();
  assert(
    getRoot(cbStandardHost).getAttribute('aria-checked') === 'false',
    'API: Calling uncheck() forcefully unchecks the component'
  );

  cbStandardHost.check();
  await nextTick();
  assert(
    getRoot(cbStandardHost).getAttribute('aria-checked') === 'true',
    'API: Calling check() forcefully checks the component'
  );

  cbStandardHost.toggle();
  await nextTick();
  assert(
    getRoot(cbStandardHost).getAttribute('aria-checked') === 'false',
    'API: Calling toggle() correctly flips the checked state'
  );

  assert(
    cbStandardHost.getValue() === false,
    'API: Calling getValue() returns the current internal boolean state'
  );

  // ==========================================
  // --- DISABLED STATE TESTS ---
  // ==========================================

  getRoot(cbDisabledHost).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();

  assert(
    getRoot(cbDisabledHost).getAttribute('aria-checked') === 'false',
    'Disabled: Clicking a disabled checkbox does not toggle its state'
  );

  getRoot(cbDisabledHost).dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  await nextTick();

  assert(
    getRoot(cbDisabledHost).getAttribute('aria-checked') === 'false',
    'Disabled: Keyboard events on a disabled checkbox do not toggle its state'
  );

  assert(
    getRoot(cbDisabledHost).getAttribute('aria-disabled') === 'true',
    'Accessibility: Disabled checkbox applies aria-disabled="true"'
  );

  cbDisabledHost.enable();
  await nextTick();

  getRoot(cbDisabledHost).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();

  assert(
    getRoot(cbDisabledHost).getAttribute('aria-checked') === 'true',
    'API: Calling enable() restores interactivity to the checkbox'
  );
}
