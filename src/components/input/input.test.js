import { component, createRoot, html, design } from '../../giant.js';
import { Input, InputGroup, InputLeftAddon, InputRightAddon } from './input.js';

const { div, section, h2, span } = html;

const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

// --- TEST UI SETUP ---
const InputTestApp = component.InputTestApp(() => {
  return div({ class: 'input-test-wrapper', style: { display: 'flex', flexDirection: 'column', gap: '20px' } },

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
      Input({ id: 'input-api', value: 'Initial API Value' })
    ),

    // 4. Input Group
    section({ class: 'test-section' },
      h2('Input Group with Addons'),
      InputGroup({ id: 'input-group' },
        InputLeftAddon({}, span('https://')),
        Input({ id: 'input-grouped', class: 'border-0 rounded-none shadow-none focus-visible:ring-0', style: { minHeight: '100%' } }),
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
  const basicInner = basicHost.firstElementChild; // The actual native <input>

  assert(
    basicInner !== null && basicInner.tagName === 'INPUT',
    'Initialization: Component correctly renders a native input element'
  );

  assert(
    basicInner.type === 'text' && basicInner.value === '',
    'Initialization: Defaults to type="text" and an empty value string'
  );

  assert(
    basicInner.className.includes(design.bg.inputBg) && basicInner.className.includes(design.border.inputBorder),
    'Style: Applies default variant design tokens correctly'
  );

  // ==========================================
  // --- STATE & PROP TESTS ---
  // ==========================================
  const disabledHost = document.getElementById('input-disabled');
  const invalidHost = document.getElementById('input-invalid');
  const ghostHost = document.getElementById('input-ghost');

  assert(
    disabledHost.firstElementChild.disabled === true &&
    disabledHost.firstElementChild.getAttribute('aria-disabled') === 'true',
    'Props: disabled prop locks the input and applies aria-disabled'
  );

  assert(
    invalidHost.firstElementChild.getAttribute('aria-invalid') === 'true' &&
    invalidHost.firstElementChild.className.includes(design.border.dangerBorder),
    'Props: invalid prop sets aria-invalid and applies danger border CSS'
  );

  assert(
    !ghostHost.firstElementChild.className.includes(design.bg.inputBg) &&
    ghostHost.firstElementChild.className.includes('bg-transparent'),
    'Props: ghost variant removes default backgrounds and borders'
  );

  // ==========================================
  // --- PROGRAMMATIC API TESTS ---
  // ==========================================
  const apiHost = document.getElementById('input-api');
  const apiInner = apiHost.firstElementChild;

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
    apiInner.getAttribute('aria-invalid') === 'true' && apiInner.className.includes(design.border.dangerBorder),
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
    groupInner !== null && groupInner.className.includes(design.layout.flex),
    'InputGroup: Renders a flex container for the structural addons'
  );

  assert(
    groupInner.textContent.includes('https://') && groupInner.textContent.includes('.com'),
    'InputGroup: Left and Right Addons successfully render alongside the input'
  );

  assert(
    groupedInput !== null && groupedInput.firstElementChild.tagName === 'INPUT',
    'InputGroup: Successfully embeds the core Input component'
  );
}
