import { component, createRoot, html } from '../../giant.js';
import { Dropdown } from './dropdown.js'; // Clean, single import!

const { div, section, h2 } = html;
const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

// --- TEST UI SETUP ---
const DropdownTestApp = component.DropdownTestApp(() => {
  return div({ class: 'dropdown-test-wrapper', style: { display: 'flex', flexDirection: 'column', gap: '40px' } },

    section({ class: 'test-section' },
      h2('Single Selection'),
      Dropdown({ id: 'dd-single', placeholder: 'Choose fruit...' },
        Dropdown.Group({},
          Dropdown.Label({}, 'Fruits'),
          Dropdown.Separator({}),
          Dropdown.Item({ value: 'apple' }, 'Apple'),
          Dropdown.Item({ value: 'banana' }, 'Banana'),
          Dropdown.Item({ value: 'cherry', disabled: true }, 'Cherry')
        )
      )
    ),

    section({ class: 'test-section' },
      h2('Multiple Selection'),
      Dropdown({ id: 'dd-multiple', multiple: true, defaultValue: ['react'] },
        Dropdown.Item({ value: 'react' }, 'React'),
        Dropdown.Item({ value: 'giant' }, 'Giant.js'),
        Dropdown.Item({ value: 'vue' }, 'Vue')
      )
    ),

    section({ class: 'test-section' },
      h2('API Controlled'),
      Dropdown({ id: 'dd-api' },
        Dropdown.Item({ value: 'one' }, 'Option 1'),
        Dropdown.Item({ value: 'two' }, 'Option 2')
      )
    )

  );
}, 'dropdown-test-app');


// --- TEST RUNNER EXPORT ---
export async function testDropdown(mountPoint, assert) {
  const appNode = await createRoot(DropdownTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // ==========================================
  // --- SINGLE SELECTION TESTS ---
  // ==========================================
  const singleHost = document.getElementById('dd-single');
  const singleTrigger = document.getElementById('dd-single-trigger');

  assert(
    singleTrigger.textContent.includes('Choose fruit...'),
    'Initialization: Displays placeholder when no value is selected'
  );

  // Open the dropdown via API
  singleHost.open();
  await nextTick();

  const singleContent = document.getElementById('dd-single-content');
  assert(
    singleContent !== null,
    'Interaction: Calling open() accurately mounts the dropdown content to the DOM'
  );

  // Click an option
  const bananaOption = singleContent.querySelector('[data-value="banana"]');
  bananaOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();

  assert(
    singleHost.getValue() === 'banana',
    'Interaction: Clicking an option accurately sets the internal value'
  );

  assert(
    singleTrigger.textContent.includes('Banana'),
    'Render: The trigger dynamically updates to show the selected text'
  );

  assert(
    document.getElementById('dd-single-content') === null,
    'Interaction: Single-mode dropdowns automatically close upon selection'
  );

  // ==========================================
  // --- MULTIPLE SELECTION TESTS ---
  // ==========================================
  const multiHost = document.getElementById('dd-multiple');
  const multiTrigger = document.getElementById('dd-multiple-trigger');

  assert(
    multiHost.getValue().length === 1 && multiHost.getValue().includes('react'),
    'Initialization: Multiple dropdowns correctly parse array defaultValues'
  );

  assert(
    multiTrigger.textContent.includes('React'),
    'Render: Trigger displays the name of the pre-selected multiple value'
  );

  multiHost.open();
  await nextTick();

  const giantOption = document.getElementById('dd-multiple-content').querySelector('[data-value="giant"]');
  giantOption.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();

  assert(
    multiHost.getValue().includes('react') && multiHost.getValue().includes('giant'),
    'Interaction: Clicking appends new values without destroying previous selections in multiple mode'
  );

  assert(
    document.getElementById('dd-multiple-content') !== null,
    'Interaction: Multiple-mode dropdowns intentionally stay open after selection'
  );

  assert(
    multiTrigger.textContent.includes('React, Giant.js'),
    'Render: Trigger displays a comma-separated list of all selected options'
  );

  // ==========================================
  // --- PROGRAMMATIC API TESTS ---
  // ==========================================
  const apiHost = document.getElementById('dd-api');
  const apiTrigger = document.getElementById('dd-api-trigger');

  apiHost.setValue('two');
  await nextTick();

  assert(
    apiHost.getValue() === 'two' && apiTrigger.textContent.includes('Option 2'),
    'API: setValue() successfully overrides internal state and triggers a render'
  );

  apiHost.open();
  await nextTick();
  assert(document.getElementById('dd-api-content') !== null, 'API: open() works');

  apiHost.toggle();
  await nextTick();
  assert(document.getElementById('dd-api-content') === null, 'API: toggle() successfully closes an open dropdown');
}
