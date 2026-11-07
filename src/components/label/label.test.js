import { component, createRoot, html } from '../../giant.js';
import { Label } from './label.js';

const { div, section, h2, input } = html;

const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

// --- TEST UI SETUP ---
const LabelTestApp = component.LabelTestApp(() => {
  return div({ class: 'label-test-wrapper', 'style-layout': 'stack', 'style-gap': 'large' },

    // 1. Basic Label
    section({ class: 'test-section' },
      h2('Basic Label'),
      Label({ id: 'label-basic', for: 'input-1' }, 'Username'),
      input({ id: 'input-1', type: 'text' })
    ),

    // 2. Required Label
    section({ class: 'test-section' },
      h2('Required Label'),
      Label({ id: 'label-required', required: true }, 'Email')
    ),

    // 3. Disabled Label
    section({ class: 'test-section' },
      h2('Disabled Label'),
      Label({ id: 'label-disabled', disabled: true }, 'Project Name')
    )
  );
}, 'label-test-app');


// --- TEST RUNNER EXPORT ---
export async function testLabel(mountPoint, assert) {
  const appNode = await createRoot(LabelTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // Select the actual native label element inside the component host
  const basicLabelHost = document.getElementById('label-basic');
  const basicLabel = basicLabelHost.querySelector('label') || basicLabelHost;

  assert(
    basicLabel.getAttribute('for') === 'input-1',
    'Binding: Correct applies the "for" attribute to link with form controls'
  );

  assert(
    basicLabel.textContent.includes('Username'),
    'Render: Correct renders text children'
  );

  // ==========================================
  // --- REQUIRED STATE TESTS ---
  // ==========================================
  const requiredLabel = document.getElementById('label-required');
  const asterisk = requiredLabel.querySelector('span');

  assert(
    requiredLabel.textContent.includes('*'),
    'Required: Renders the required indicator asterisk'
  );

  assert(
    asterisk && asterisk.getAttribute('aria-hidden') === 'true',
    'Accessibility: Required asterisk is hidden from screen readers via aria-hidden'
  );

  assert(
    asterisk && asterisk.getAttribute('style-tone') === 'danger',
    'Style: Required asterisk uses the danger tone'
  );

  // ==========================================
  // --- DISABLED STATE TESTS ---
  // ==========================================
  const disabledLabelHost = document.getElementById('label-disabled');
  const disabledLabel = disabledLabelHost.querySelector('label') || disabledLabelHost;

  assert(
    disabledLabel.getAttribute('data-disabled') === 'true',
    'State: Applies data-disabled="true" attribute for CSS targeting'
  );
}
