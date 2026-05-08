import { component, createRoot, html } from '../../giant.js';
import { Alert } from './alert.js';

const { div, section, h2 } = html;

// Small delay to let microtasks and layout paints clear
const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

// --- TEST UI SETUP ---
const AlertTestApp = component.AlertTestApp(() => {
  return div({ class: 'alert-test-wrapper', style: { display: 'flex', flexDirection: 'column', gap: '20px' } },

    // 1. Basic / Default
    section({ class: 'test-section' },
      h2('Basic Alert'),
      Alert({
        id: 'basic-alert',
        title: 'Heads up!',
        description: 'This is a basic info alert.'
      })
    ),

    // 2. Variants & Accessibility
    section({ class: 'test-section' },
      h2('Destructive Variant'),
      Alert({
        id: 'destructive-alert',
        variant: 'destructive',
        title: 'Error',
        description: 'Something went terribly wrong.'
      })
    ),

    // 3. Dismissible
    section({ class: 'test-section' },
      h2('Dismissible Alert'),
      Alert({
        id: 'dismissible-alert',
        dismissible: true,
        title: 'Closable',
        description: 'You can dismiss this.'
      })
    ),

    // 4. Programmatic API
    section({ class: 'test-section' },
      h2('API Controlled Alert'),
      Alert({
        id: 'api-alert',
        title: 'Initial Title',
        description: 'Initial Description'
      })
    )
  );
}, 'alert-test-app');


// --- TEST RUNNER EXPORT ---
export async function testAlert(mountPoint, assert) {
  const appNode = await createRoot(AlertTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // ==========================================
  // --- DEFAULT RENDER TESTS ---
  // ==========================================
  const basicAlert = document.getElementById('basic-alert');
  const basicInner = basicAlert.firstElementChild;

  assert(
    basicInner && basicInner.style.display !== 'none',
    'Default: Alert is visible on initial mount'
  );

  assert(
    basicAlert.textContent.includes('Heads up!') && basicAlert.textContent.includes('basic info alert'),
    'Default: Renders the title and description correctly'
  );

  // ==========================================
  // --- VARIANT & ARIA TESTS ---
  // ==========================================
  const destructiveAlert = document.getElementById('destructive-alert');
  const destructiveInner = destructiveAlert.firstElementChild;

  assert(
    destructiveInner.getAttribute('aria-live') === 'assertive',
    'Accessibility: Destructive variant automatically sets aria-live="assertive"'
  );

  // ==========================================
  // --- DISMISSIBLE TESTS ---
  // ==========================================
  const dismissibleAlert = document.getElementById('dismissible-alert');
  const closeButton = dismissibleAlert.querySelector('button');

  assert(
    closeButton !== null,
    'Dismissible: Renders a close button when dismissible is true'
  );

  closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();

  const dismissibleInner = dismissibleAlert.firstElementChild;
  assert(
    dismissibleInner.style.display === 'none' && dismissibleInner.getAttribute('aria-hidden') === 'true',
    'Dismissible: Clicking the close button hides the alert and sets aria-hidden="true"'
  );

  // ==========================================
  // --- PROGRAMMATIC API TESTS ---
  // ==========================================
  const apiAlert = document.getElementById('api-alert');

  // Test hide()
  apiAlert.hide();
  await nextTick();
  assert(
    apiAlert.firstElementChild.style.display === 'none',
    'API: hide() programmatically hides the alert'
  );

  // Test show()
  apiAlert.show();
  await nextTick();
  assert(
    apiAlert.firstElementChild.style.display !== 'none',
    'API: show() programmatically restores visibility'
  );

  // Test toggle()
  apiAlert.toggle();
  await nextTick();
  assert(apiAlert.firstElementChild.style.display === 'none', 'API: toggle() works (hide pass)');

  apiAlert.toggle();
  await nextTick();
  assert(apiAlert.firstElementChild.style.display !== 'none', 'API: toggle() works (show pass)');

  // Test update()
  apiAlert.update({ title: 'Updated Title', variant: 'success' });
  await nextTick();
  assert(
    apiAlert.textContent.includes('Updated Title'),
    'API: update() successfully patches text content'
  );
  assert(
    apiAlert.firstElementChild.getAttribute('aria-live') === 'polite',
    'API: update() successfully patches the variant attributes'
  );

  // Test destroy()
  apiAlert.destroy();
  await nextTick();

  // The component host wrapper remains, but it renders an empty text node
  assert(
    apiAlert.innerHTML === '' || apiAlert.textContent === '',
    'API: destroy() completely empties the alert node in the DOM'
  );
}
