import { component, createRoot, html } from '../../giant.js';
import { Input, InputGroup, InputLeftAddon, InputRightAddon } from './input.js';

const { div, section, h2, span } = html;

const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

let lastInput = null;

// --- TEST UI SETUP ---
const InputTestApp = component.InputTestApp(() => {
  return div({ class: 'input-test-wrapper', 'style-layout': 'stack', 'style-gap': 'large' },

    // 1. Basic / Default
    section({ class: 'test-section' },
      h2('Basic Input'),
      Input({ id: 'input-basic', placeholder: 'Enter text...' })
    ),

    // 2. States & Props
    section({ class: 'test-section' },
      h2('States & Variants'),
      Input({ id: 'input-disabled', disabled: true, value: 'Locked' }),
      Input({ id: 'input-invalid', invalid: true, value: 'Wrong data' }),
      Input({ id: 'input-ghost', variant: 'ghost', value: 'Ghost input' })
    ),

    // 3. Programmatic API
    section({ class: 'test-section' },
      h2('API Controlled Input'),
      Input({ id: 'input-api', value: 'Initial API Value', oninput: (e, v) => { lastInput = [e.type, v]; } })
    ),

    // 4. Input Group
    section({ class: 'test-section' },
      h2('Input Group with Addons'),
      InputGroup({ id: 'input-group' },
        InputLeftAddon({}, span('https://')),
        Input({ id: 'input-grouped', variant: 'ghost' }),
        InputRightAddon({}, span('.com'))
      )
    )
  );
}, 'input-test-app');


// --- TEST RUNNER EXPORT ---
export async function testInput(mountPoint, assert) {
  const appNode = await createRoot(InputTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // ==========================================
  // --- DEFAULT RENDER TESTS ---
  // ==========================================
  const basicHost = document.getElementById('input-basic');
  const basicInner = basicHost.querySelector('input'); // the native <input>, inside the error tooltip wrapper

  assert(
    basicInner !== null && basicInner.tagName === 'INPUT',
    'Initialization: Component correctly renders a native input element'
  );

  assert(
    basicInner.type === 'text' && basicInner.value === '',
    'Initialization: Defaults to type="text" and an empty value string'
  );

  assert(
    basicInner.getAttribute('style-emphasis') === 'field' && basicInner.getAttribute('style-border') === 'thin',
    'Style: Applies default variant field attributes correctly'
  );

  // ==========================================
  // --- STATE & PROP TESTS ---
  // ==========================================
  const disabledHost = document.getElementById('input-disabled');
  const invalidHost = document.getElementById('input-invalid');
  const ghostHost = document.getElementById('input-ghost');

  assert(
    disabledHost.querySelector('input').disabled === true &&
    disabledHost.querySelector('input').getAttribute('aria-disabled') === 'true',
    'Props: disabled prop locks the input and applies aria-disabled'
  );

  assert(
    invalidHost.querySelector('input').getAttribute('aria-invalid') === 'true' &&
    invalidHost.querySelector('input').getAttribute('style-tone') === 'danger',
    'Props: invalid prop sets aria-invalid and applies danger border CSS'
  );

  assert(
    ghostHost.querySelector('input').getAttribute('style-emphasis') === 'ghost' &&
    !ghostHost.querySelector('input').hasAttribute('style-border'),
    'Props: ghost variant removes default backgrounds and borders'
  );

  // ==========================================
  // --- PROGRAMMATIC API TESTS ---
  // ==========================================
  const apiHost = document.getElementById('input-api');
  const apiInner = apiHost.querySelector('input');

  assert(
    apiHost.getValue() === 'Initial API Value',
    'API: getValue() accurately reads the initial state'
  );

  // Test setValue()
  apiHost.setValue('Updated API Value');
  await nextTick();

  assert(
    apiHost.getValue() === 'Updated API Value' && apiInner.value === 'Updated API Value',
    'API: setValue() successfully updates both internal state and DOM value'
  );

  // Test clear()
  apiHost.clear();
  await nextTick();

  assert(
    apiHost.getValue() === '' && apiInner.value === '',
    'API: clear() successfully empties the input state and DOM'
  );

  // Test setInvalid()
  apiHost.setInvalid(true);
  await nextTick();

  assert(
    apiInner.getAttribute('aria-invalid') === 'true' && apiInner.getAttribute('style-tone') === 'danger',
    'API: setInvalid() triggers a DOM re-render with danger styles'
  );

  // ==========================================
  // --- NATIVE EVENT / REACTIVITY TESTS ---
  // ==========================================

  // Simulate a user typing into the input
  apiInner.value = 'User typed this';
  apiInner.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();

  assert(
    apiHost.getValue() === 'User typed this',
    'Events: Native DOM input events properly sync back to the component\'s internal signal'
  );

  assert(
    lastInput && lastInput[0] === 'input' && lastInput[1] === 'User typed this',
    'Events: oninput receives (event, value)'
  );

  // Test setError(): danger tooltip under the input, linked via aria-errormessage
  apiHost.setError('Required field');
  await nextTick();

  const errorNode = document.getElementById('input-api-error');
  const apiInput = apiHost.querySelector('input');
  assert(
    errorNode && errorNode.textContent === 'Required field' &&
    apiInput.getAttribute('aria-errormessage') === 'input-api-error' &&
    apiInput.getAttribute('aria-invalid') === 'true',
    'API: setError() shows the message and links it with aria-errormessage'
  );

  apiInput.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();

  assert(
    !document.getElementById('input-api-error') &&
    apiHost.querySelector('input').getAttribute('aria-invalid') === 'false',
    'Events: typing clears the error'
  );

  // Trigger an external prop re-render
  apiHost.render({ value: 'Prop override' });
  await nextTick();

  assert(
    apiHost.getValue() === 'Prop override' && apiInner.value === 'Prop override',
    'Props: Calling render() with a new value seamlessly overwrites the internal state'
  );

  // ==========================================
  // --- INPUT GROUP & ADDON TESTS ---
  // ==========================================
  const groupHost = document.getElementById('input-group');
  const groupInner = groupHost.firstElementChild; // The wrapper div
  const groupedInput = document.getElementById('input-grouped');

  assert(
    groupInner !== null && groupInner.getAttribute('style-layout') === 'row',
    'InputGroup: Renders a flex container for the structural addons'
  );

  assert(
    groupInner.textContent.includes('https://') && groupInner.textContent.includes('.com'),
    'InputGroup: Left and Right Addons successfully render alongside the input'
  );

  assert(
    groupedInput !== null && groupedInput.querySelector('input').tagName === 'INPUT',
    'InputGroup: Successfully embeds the core Input component'
  );
}
