import { component, createRoot, html } from '../../giant.js';
import {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuCheckboxItem,
  MenuSub,
  MenuSubTrigger,
  MenuSubContent
} from './menu.js';

const { div } = html;
const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

// Shared state for capturing event callbacks
let activeAction = null;

const MenuTestApp = component.MenuTestApp(() => {
  return div({ style: { padding: '50px' } },
    Menu({ id: 'test-menu' },
      MenuTrigger({ id: 'test-trigger' }, 'Options'),
      MenuContent({ id: 'test-content' },
        MenuItem({
          id: 'item-standard',
          onclick: () => activeAction = 'standard-clicked'
        }, 'Standard Item'),

        MenuItem({
          id: 'item-disabled',
          disabled: true,
          onclick: () => activeAction = 'disabled-clicked'
        }, 'Disabled Item'),

        MenuCheckboxItem({ id: 'item-checkbox-on', checked: true }, 'Checked Option'),
        MenuCheckboxItem({ id: 'item-checkbox-off', checked: false }, 'Unchecked Option'),

        MenuSub({ id: 'test-submenu-wrapper' },
          MenuSubTrigger({ id: 'test-sub-trigger' }, 'More Options'),
          MenuSubContent({ id: 'test-sub-content' },
            MenuItem({}, 'Nested Item')
          )
        )
      )
    )
  );
});

export async function testMenu(mountPoint, assert) {
  const appNode = await createRoot(MenuTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // ==========================================
  // --- DOM NODE LOOKUPS ---
  // ==========================================
  // REMOVED: .firstElementChild. Because these components use the `pure` helper
  // instead of the `component()` stateful wrapper, the IDs are applied directly
  // to the actionable <div> tags.
  const itemStandard = document.getElementById('item-standard');
  const itemDisabled = document.getElementById('item-disabled');
  const itemCheckOn = document.getElementById('item-checkbox-on');
  const itemCheckOff = document.getElementById('item-checkbox-off');

  const submenuWrapper = document.getElementById('test-submenu-wrapper');
  const subTrigger = document.getElementById('test-sub-trigger');
  const subContent = document.getElementById('test-sub-content');

  // ==========================================
  // --- INITIALIZATION & RENDER TESTS ---
  // ==========================================
  assert(
    itemDisabled.getAttribute('aria-disabled') === 'true',
    'Init: Disabled items properly set aria-disabled="true"'
  );

  assert(
    itemCheckOn.querySelector('svg') !== null,
    'Init: MenuCheckboxItem renders an SVG checkmark when checked=true'
  );

  assert(
    itemCheckOff.querySelector('svg') === null,
    'Init: MenuCheckboxItem omits the SVG when checked=false'
  );

  // ==========================================
  // --- EVENT & INTERACTION TESTS ---
  // ==========================================

  // Reset tracker
  activeAction = null;

  // Standard Click
  itemStandard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert(
    activeAction === 'standard-clicked',
    'Events: onclick handler fires successfully on standard menu items'
  );

  // Disabled Click
  activeAction = null;
  itemDisabled.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  assert(
    activeAction === null,
    'Events: onclick handler is strictly blocked on disabled menu items'
  );

  // ==========================================
  // --- PHYSICS ENGINE TESTS ---
  // ==========================================

  // Hover In
  itemStandard.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
  assert(
    itemStandard.style.backgroundColor === 'var(--color-bg-hover)',
    'Physics: pointerover seamlessly applies hover background color'
  );

  // Hover Out
  itemStandard.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }));
  // FIXED: Assert for an empty string instead of 'transparent' because the component
  // cleans up by entirely stripping the inline style.
  assert(
    itemStandard.style.backgroundColor === '',
    'Physics: pointerout removes the inline background color'
  );

  // Active Press Down
  itemStandard.dispatchEvent(new PointerEvent('pointerdown', {
    bubbles: true,
    button: 0,
    pointerType: 'mouse'
  }));
  assert(
    itemStandard.style.transform === 'scale(0.98)',
    'Physics: pointerdown compresses the element via CSS scale'
  );

  // Active Press Release
  itemStandard.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  // FIXED: Assert for an empty string instead of 'scale(1)'
  assert(
    itemStandard.style.transform === '',
    'Physics: pointerup restores the element scale'
  );

  // Disabled Physics Safety
  itemDisabled.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
  assert(
    itemDisabled.style.backgroundColor === '',
    'Physics: visual interactions are safely disabled on inactive items'
  );

  // ==========================================
  // --- SUBMENU NESTING TESTS ---
  // ==========================================

  assert(
    subContent.style.display === 'none',
    'Submenu: Nested content panels are hidden by default'
  );

  submenuWrapper.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
  assert(
    subContent.style.display === 'flex' &&
    subTrigger.style.backgroundColor === 'var(--color-bg-hover)',
    'Submenu: Hovering wrapper reveals nested content and highlights the trigger item'
  );

  submenuWrapper.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }));
  // FIXED: Assert trigger resets to an empty string instead of 'transparent'
  assert(
    subContent.style.display === 'none' &&
    subTrigger.style.backgroundColor === '',
    'Submenu: Leaving wrapper conceals nested content and resets the trigger item'
  );
}
