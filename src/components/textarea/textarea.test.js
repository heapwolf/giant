import { component, createRoot, html, signal } from '../../giant.js';
import { Textarea } from './textarea.js';

const { div } = html;
const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

export async function testTextarea(mountPoint, assert) {
  let controlledSignal;
  let lastInputValue = '';

  const TextareaTestApp = component.TextareaTestApp(() => {
    controlledSignal = signal.textState('Initial text');

    return div(
      { style: { display: 'flex', flexDirection: 'column', gap: '20px' } },

      // 1. Default & Uncontrolled
      Textarea({
        id: 'ta-default',
        value: 'Default value',
        oninput: (val) => { lastInputValue = val; }
      }),

      // 2. States (Invalid, Disabled, Required)
      Textarea({ id: 'ta-invalid', invalid: true }),
      Textarea({ id: 'ta-disabled', disabled: true, value: 'Cannot edit me' }),
      Textarea({ id: 'ta-required', required: true }),

      // 3. Controlled Reactivity
      Textarea({
        id: 'ta-controlled',
        value: controlledSignal.value,
        oninput: (v) => { controlledSignal.value = v; }
      })
    );
  });

  const appNode = await createRoot(TextareaTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // ==========================================
  // --- DOM NODE LOOKUPS ---
  // ==========================================
  // Host wrappers (hold the imperative API)
  const defaultHost = document.getElementById('ta-default');
  const invalidHost = document.getElementById('ta-invalid');
  const disabledHost = document.getElementById('ta-disabled');
  const requiredHost = document.getElementById('ta-required');
  const controlledHost = document.getElementById('ta-controlled');

  // Inner textarea elements (hold the DOM attributes and fire events)
  const taDefault = defaultHost.firstElementChild;
  const taInvalid = invalidHost.firstElementChild;
  const taDisabled = disabledHost.firstElementChild;
  const taRequired = requiredHost.firstElementChild;
  const taControlled = controlledHost.firstElementChild;

  // ==========================================
  // --- INITIALIZATION & STATE TESTS ---
  // ==========================================
  assert(
    taDefault.value === 'Default value',
    'Initialization: Uncontrolled textarea mounts with the correct default value'
  );

  assert(
    taInvalid.getAttribute('aria-invalid') === 'true' &&
    taInvalid.classList.contains('color-danger-border'),
    'States: invalid=true correctly applies aria-invalid and the danger border styling'
  );

  assert(
    taDisabled.disabled === true &&
    taDisabled.getAttribute('aria-disabled') === 'true',
    'States: disabled=true explicitly disables the underlying textarea DOM node'
  );

  assert(
    taRequired.required === true &&
    taRequired.getAttribute('aria-required') === 'true',
    'States: required=true correctly applies standard HTML validation attributes'
  );

  // ==========================================
  // --- EVENT & INTERACTION TESTS ---
  // ==========================================
  lastInputValue = '';
  taDefault.value = 'User typed something';
  taDefault.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();

  assert(
    lastInputValue === 'User typed something',
    'Interaction: Typing in the textarea accurately fires the oninput callback with the new value'
  );

  // ==========================================
  // --- PHYSICS ENGINE TESTS ---
  // ==========================================
  // Hover
  taDefault.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
  await nextTick();
  assert(
    taDefault.style.boxShadow.includes('var(--color-bg-hover)'),
    'Physics: pointerover seamlessly applies a halo box-shadow'
  );

  // Focus (should suppress the hover halo)
  taDefault.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
  await nextTick();
  assert(
    taDefault.style.boxShadow === '',
    'Physics: focus correctly suppresses the custom hover halo to let the native focus ring shine'
  );

  taDefault.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
  taDefault.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }));

  // ==========================================
  // --- IMPERATIVE API TESTS ---
  // ==========================================
  assert(
    defaultHost.getValue() === 'User typed something',
    'API: .getValue() accurately retrieves the current internal signal value'
  );

  defaultHost.clear();
  await nextTick();
  assert(
    taDefault.value === '' && defaultHost.getValue() === '',
    'API: .clear() successfully empties the textarea DOM and state'
  );

  defaultHost.setValue('Forced value');
  await nextTick();
  assert(
    taDefault.value === 'Forced value',
    'API: .setValue(val) imperatively forces the internal state and updates the DOM'
  );

  // ==========================================
  // --- CONTROLLED REACTIVITY TESTS ---
  // ==========================================
  assert(
    taControlled.value === 'Initial text',
    'Reactivity: Controlled textarea initializes based on external signal value'
  );

  controlledSignal.value = 'Updated from outside';
  await nextTick();
  assert(
    taControlled.value === 'Updated from outside',
    'Reactivity: Mutating the external signal cleanly flows down to the DOM'
  );

  taControlled.value = 'Updated from inside';
  taControlled.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
  assert(
    controlledSignal.value === 'Updated from inside',
    'Reactivity: Typing in a controlled textarea propagates the new value back to the external signal'
  );
}
