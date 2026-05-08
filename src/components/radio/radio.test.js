import { component, createRoot, html } from '../../giant.js';
import { Radio, RadioItem } from './radio.js';

const { div } = html;
const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

let activeValue = 'option-1';

const RadioTestApp = component.RadioTestApp(() => {
  return div({ style: { padding: '20px' } },
    Radio({
      id: 'test-radio-group',
      value: activeValue,
      onValueChange: (val) => activeValue = val,
      name: 'test-group'
    },
      RadioItem({ id: 'item-1', value: 'option-1' }, 'Option 1'),
      RadioItem({ id: 'item-2', value: 'option-2' }, 'Option 2'),
      RadioItem({ id: 'item-3', value: 'option-3', disabled: true }, 'Option 3')
    )
  );
});

export async function testRadio(mountPoint, assert) {
  const appNode = await createRoot(RadioTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // Lookups
  const groupTrack = document.getElementById('test-radio-group').firstElementChild;
  const itemWrapper2 = document.getElementById('item-2').firstElementChild;

  const input1 = document.getElementById('item-1').firstElementChild.querySelector('input');
  const input2 = document.getElementById('item-2').firstElementChild.querySelector('input');
  const input3 = document.getElementById('item-3').firstElementChild.querySelector('input');

  // ==========================================
  // --- INITIALIZATION TESTS ---
  // ==========================================
  assert(
    groupTrack.getAttribute('role') === 'radiogroup',
    'Init: Group wrapper correctly renders with role="radiogroup"'
  );

  assert(
    input1.checked === true && input2.checked === false,
    'Init: Correct item is initially checked based on the group value'
  );

  assert(
    input1.getAttribute('name') === 'test-group',
    'Init: Group seamlessly injects "name" attribute into the internal inputs'
  );

  assert(
    input3.disabled === true,
    'Init: Disabled state is properly applied to the native input'
  );

  // ==========================================
  // --- INTERACTION & REACTIVITY TESTS ---
  // ==========================================
  activeValue = 'option-1';

  // TEST 1: The Parent-Delegated Click
  // Because the invisible input covers the entire element, a click on the wrapper triggers the input natively
  input2.dispatchEvent(new Event('change', { bubbles: true }));
  await nextTick();
  assert(
    activeValue === 'option-2',
    'Events: Native invisible overlay input securely triggers change event'
  );

  // Re-Render
  appNode.render();
  await nextTick();
  assert(
    input1.checked === false && input2.checked === true,
    'Reactivity: Group correctly pushes updated "checked" states down to the inputs'
  );

  const dot2 = input2.parentElement.querySelector('[data-radio-target="dot"]');
  assert(
    dot2.style.transform === 'scale(1)' && dot2.style.opacity === '1',
    'Physics: Visual dot is automatically scaled and faded in when active'
  );

  // ==========================================
  // --- JS PHYSICS TESTS ---
  // ==========================================
  itemWrapper2.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse' }));
  const circle2 = input2.parentElement.querySelector('[data-radio-target="circle"]');
  assert(
    circle2.style.transform === 'scale(0.92)',
    'Physics: Pointer down triggers the tactile plunge effect via JS scale'
  );

  // ==========================================
  // --- DISABLED STATE TESTS ---
  // ==========================================
  input3.dispatchEvent(new Event('change', { bubbles: true }));
  await nextTick();
  assert(
    activeValue === 'option-2',
    'Events: Disabled items successfully block the onValueChange callback'
  );
}
