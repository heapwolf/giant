import { component, createRoot, html } from '../../giant.js';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion.js';

const { div, h2, section } = html;

// Need a small delay to let microtasks and layout paints clear
const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

// --- TEST UI SETUP ---
const AccordionTestApp = component.AccordionTestApp(() => {
  return div({ class: 'accordion-test-wrapper' },

    // 1. Single Mode Accordion (Default)
    section({ class: 'test-section' },
      h2('Single Mode & Collapsible'),
      Accordion({ id: 'single-accordion', type: 'single', collapsible: true },
        AccordionItem({ value: 'item-1', id: 'single-item-1' },
          AccordionTrigger({ id: 'single-trigger-1' }, 'Item 1'),
          AccordionContent({ id: 'single-content-1' }, 'Content 1')
        ),
        AccordionItem({ value: 'item-2', id: 'single-item-2' },
          AccordionTrigger({ id: 'single-trigger-2' }, 'Item 2'),
          AccordionContent({ id: 'single-content-2' }, 'Content 2')
        )
      )
    ),

    // 2. Multiple Mode Accordion
    section({ class: 'test-section' },
      h2('Multiple Mode'),
      Accordion({ id: 'multi-accordion', type: 'multiple' },
        AccordionItem({ value: 'multi-1', id: 'multi-item-1' },
          AccordionTrigger({ id: 'multi-trigger-1' }, 'Multi 1'),
          AccordionContent({ id: 'multi-content-1' }, 'Content 1')
        ),
        AccordionItem({ value: 'multi-2', id: 'multi-item-2' },
          AccordionTrigger({ id: 'multi-trigger-2' }, 'Multi 2'),
          AccordionContent({ id: 'multi-content-2' }, 'Content 2')
        )
      )
    ),

    // 3. Default Value Accordion
    section({ class: 'test-section' },
      h2('Default Value Initialization'),
      Accordion({ id: 'default-accordion', type: 'single', defaultValue: 'default-2' },
        AccordionItem({ value: 'default-1', id: 'default-item-1' },
          AccordionTrigger({}, 'Default 1'),
          AccordionContent({}, 'Content 1')
        ),
        AccordionItem({ value: 'default-2', id: 'default-item-2' },
          AccordionTrigger({}, 'Default 2'),
          AccordionContent({}, 'Content 2')
        )
      )
    )
  );
}, 'accordion-test-app');

// --- DOM HELPERS ---

// Helper to simulate a click on the INNER trigger button
const clickTrigger = (hostId) => {
  const host = document.getElementById(hostId);
  const triggerBtn = host.querySelector('[data-accordion-type="trigger"]');
  triggerBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
};

// Helper to check if the INNER item state is open
const isOpen = (hostId) => {
  const host = document.getElementById(hostId);
  const itemInner = host.querySelector('[data-accordion-type="item"]');
  const contentInner = host.querySelector('[data-accordion-type="content"]');

  return itemInner.getAttribute('data-state') === 'open' && contentInner.style.display !== 'none';
};

// --- TEST RUNNER EXPORT ---
export async function testAccordion(mountPoint, assert) {
  // 1. Mount the app into the provided test runner sandbox
  const appNode = await createRoot(AccordionTestApp);
  mountPoint.appendChild(appNode);

  // Wait for initial render to settle
  await nextTick();

  // ==========================================
  // --- SINGLE MODE TESTS ---
  // ==========================================
  assert(
    !isOpen('single-item-1') && !isOpen('single-item-2'),
    'Single Mode: All items are closed by default'
  );

  clickTrigger('single-trigger-1');
  await nextTick();

  assert(
    isOpen('single-item-1'),
    'Single Mode: Clicking a trigger opens its content'
  );

  clickTrigger('single-trigger-2');
  await nextTick();

  assert(
    !isOpen('single-item-1') && isOpen('single-item-2'),
    'Single Mode: Opening a second item closes the first item'
  );

  clickTrigger('single-trigger-2');
  await nextTick();

  assert(
    !isOpen('single-item-2'),
    'Single Mode (Collapsible): Clicking an open item closes it'
  );

  // ==========================================
  // --- MULTIPLE MODE TESTS ---
  // ==========================================
  clickTrigger('multi-trigger-1');
  await nextTick();

  clickTrigger('multi-trigger-2');
  await nextTick();

  assert(
    isOpen('multi-item-1') && isOpen('multi-item-2'),
    'Multiple Mode: Multiple items can be open simultaneously'
  );

  clickTrigger('multi-trigger-1');
  await nextTick();

  assert(
    !isOpen('multi-item-1') && isOpen('multi-item-2'),
    'Multiple Mode: Closing one item does not affect other open items'
  );

  // ==========================================
  // --- DEFAULT VALUE TESTS ---
  // ==========================================
  assert(
    isOpen('default-item-2') && !isOpen('default-item-1'),
    'Initialization: Accordion correctly respects the `defaultValue` prop on mount'
  );

  // ==========================================
  // --- CHEVRON ROTATION ---
  // ==========================================
  const chevronIcon = document.getElementById('default-item-2').querySelector('[data-accordion-type="chevron"]');
  assert(
    chevronIcon.style.transform === 'rotate(180deg)',
    'DOM Sync: Chevron icon rotates 180deg when the item is open'
  );
}
