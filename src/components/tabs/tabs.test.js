import { component, createRoot, html, signal } from '../../giant.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs.js';

const { div } = html;
const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

export async function testTabs(mountPoint, assert) {
  let controlledSignal;

  const TabsTestApp = component.TabsTestApp(() => {
    controlledSignal = signal.activeControlledTab('a');

    return div(
      { style: { display: 'flex', flexDirection: 'column', gap: '40px' } },

      // 1. Uncontrolled Tabs (Testing internal state, interaction, API)
      Tabs(
        { id: 'tabs-uncontrolled', defaultValue: 'tab1' },
        TabsList(
          {},
          TabsTrigger({ id: 'trig-1', value: 'tab1' }, 'Tab 1'),
          TabsTrigger({ id: 'trig-2', value: 'tab2', disabled: true }, 'Tab 2'),
          TabsTrigger({ id: 'trig-3', value: 'tab3' }, 'Tab 3')
        ),
        TabsContent({ id: 'cont-1', value: 'tab1' }, 'Content 1'),
        TabsContent({ id: 'cont-2', value: 'tab2' }, 'Content 2'),
        TabsContent({ id: 'cont-3', value: 'tab3' }, 'Content 3')
      ),

      // 2. Controlled Tabs (Testing external signal reactivity)
      Tabs(
        {
          id: 'tabs-controlled',
          value: controlledSignal.value,
          onValueChange: (v) => { controlledSignal.value = v; }
        },
        TabsList(
          {},
          TabsTrigger({ id: 'ctrl-trig-a', value: 'a' }, 'Tab A'),
          TabsTrigger({ id: 'ctrl-trig-b', value: 'b' }, 'Tab B')
        ),
        TabsContent({ id: 'ctrl-cont-a', value: 'a' }, 'Content A'),
        TabsContent({ id: 'ctrl-cont-b', value: 'b' }, 'Content B')
      )
    );
  });

  const appNode = await createRoot(TabsTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // ==========================================
  // --- DOM NODE LOOKUPS ---
  // ==========================================
  // Grab the host wrappers for API testing
  const uncontrolledHost = document.getElementById('tabs-uncontrolled');

  // Grab the inner elements for state/style assertions
  const trig1 = document.getElementById('trig-1').firstElementChild;
  const trig2 = document.getElementById('trig-2').firstElementChild;
  const trig3 = document.getElementById('trig-3').firstElementChild;

  const cont1 = document.getElementById('cont-1').firstElementChild;
  const cont3 = document.getElementById('cont-3').firstElementChild;

  const ctrlTrigA = document.getElementById('ctrl-trig-a').firstElementChild;
  const ctrlTrigB = document.getElementById('ctrl-trig-b').firstElementChild;
  const ctrlContA = document.getElementById('ctrl-cont-a').firstElementChild;
  const ctrlContB = document.getElementById('ctrl-cont-b').firstElementChild;

  // ==========================================
  // --- INITIALIZATION TESTS ---
  // ==========================================
  assert(
    trig1.getAttribute('data-state') === 'active' &&
    trig1.getAttribute('aria-selected') === 'true',
    'Initialization: defaultValue correctly sets the initial active trigger'
  );

  assert(
    cont1.style.display === '' && cont3.style.display === 'none',
    'Initialization: defaultValue correctly reveals the active content and hides the others'
  );

  // ==========================================
  // --- INTERACTION & LOGIC TESTS ---
  // ==========================================
  trig3.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();

  assert(
    trig3.getAttribute('data-state') === 'active' &&
    cont3.style.display === '',
    'Interaction: Clicking a non-disabled trigger updates the active tab state'
  );

  assert(
    trig1.getAttribute('data-state') === 'inactive' &&
    cont1.style.display === 'none',
    'Interaction: Clicking a new trigger correctly deactivates the previously active tab'
  );

  // Disabled interaction test
  trig2.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();

  assert(
    trig3.getAttribute('data-state') === 'active',
    'Logic: Clicking a disabled trigger is ignored and does not alter the active state'
  );

  // ==========================================
  // --- IMPERATIVE API TESTS ---
  // ==========================================
  assert(
    uncontrolledHost.getTab() === 'tab3',
    'API: .getTab() accurately returns the current active value'
  );

  uncontrolledHost.setTab('tab1');
  await nextTick();
  assert(
    trig1.getAttribute('data-state') === 'active',
    'API: .setTab(val) imperatively overrides the active state'
  );

  uncontrolledHost.nextTab();
  await nextTick();
  assert(
    trig2.getAttribute('data-state') === 'active',
    'API: .nextTab() sequentially advances to the next chronological tab value'
  );

  uncontrolledHost.prevTab();
  await nextTick();
  assert(
    trig1.getAttribute('data-state') === 'active',
    'API: .prevTab() sequentially reverses to the previous chronological tab value'
  );

  // ==========================================
  // --- CONTROLLED REACTIVITY TESTS ---
  // ==========================================
  assert(
    ctrlTrigA.getAttribute('data-state') === 'active',
    'Reactivity (Init): Controlled tabs correctly mount using the external signal value'
  );

  // Test external update overriding component
  controlledSignal.value = 'b';
  await nextTick();
  assert(
    ctrlTrigB.getAttribute('data-state') === 'active' &&
    ctrlContB.style.display === '',
    'Reactivity (External Update): Mutating the bound signal immediately updates the tab DOM state'
  );

  // Test component interaction updating external signal
  ctrlTrigA.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();
  assert(
    controlledSignal.value === 'a',
    'Reactivity (Internal Interaction): Clicking a controlled tab fires onValueChange to sync the external signal'
  );
}
