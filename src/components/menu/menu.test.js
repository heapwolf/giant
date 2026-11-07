import { component, createRoot, html } from '../../giant.js';
import { Menu } from './menu.js';

const { div } = html;
const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

// Shared state for capturing event callbacks
let activeAction = null;

const MenuTestApp = component.MenuTestApp(() => {
  return div({ style: { padding: '50px' } },
    Menu({ id: 'test-menu' },
      Menu.Trigger({ id: 'test-trigger' }, 'Options'),
      Menu.Content({ id: 'test-content' },
        Menu.Item({
          id: 'item-standard',
          onclick: () => activeAction = 'standard-clicked'
        }, 'Standard Item'),

        Menu.Item({
          id: 'item-disabled',
          disabled: true,
          onclick: () => activeAction = 'disabled-clicked'
        }, 'Disabled Item'),

        Menu.CheckboxItem({ id: 'item-checkbox-on', checked: true }, 'Checked Option'),
        Menu.CheckboxItem({ id: 'item-checkbox-off', checked: false }, 'Unchecked Option'),

        Menu.Sub({ id: 'test-submenu-wrapper' },
          Menu.SubTrigger({ id: 'test-sub-trigger' }, 'More Options'),
          Menu.SubContent({ id: 'test-sub-content' },
            Menu.Item({}, 'Nested Item')
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

  const menu = document.getElementById('test-menu');
  const trigger = document.getElementById('test-trigger');
  const key = (el, k) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const click = (el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));

  // ==========================================
  // --- OPEN STATE ---
  // ==========================================
  assert(
    document.getElementById('test-content') === null && menu.getAttribute('data-state') === 'closed' && menu.getOpen() === false,
    'State: Content is not mounted while the menu is closed'
  );

  assert(
    trigger.getAttribute('aria-haspopup') === 'menu' && trigger.getAttribute('type') === 'button',
    'Trigger: renders a type="button" with aria-haspopup="menu"'
  );

  click(trigger);
  await nextTick();
  assert(
    document.getElementById('test-content') !== null && menu.getAttribute('data-state') === 'open',
    'State: Clicking the trigger opens the menu'
  );

  click(document.body);
  await nextTick();
  assert(document.getElementById('test-content') === null, 'State: Clicking outside closes the menu');

  menu.open();
  await nextTick();
  assert(menu.getOpen() === true && document.getElementById('test-content') !== null, 'API: open() mounts the content');

  key(trigger, 'Escape');
  await nextTick();
  assert(menu.getOpen() === false && document.activeElement === trigger, 'Keyboard: Escape closes the menu and refocuses the trigger');

  key(trigger, 'ArrowDown');
  await nextTick();
  const first = document.getElementById('item-standard');
  assert(
    menu.getOpen() === true && document.activeElement === first && first.hasAttribute('data-highlighted'),
    'Keyboard: ArrowDown on the trigger opens the menu and highlights the first item'
  );

  key(first, 'ArrowDown');
  assert(
    document.activeElement === document.getElementById('item-checkbox-on') && !first.hasAttribute('data-highlighted'),
    'Keyboard: ArrowDown skips disabled items and moves the highlight'
  );

  key(first, 'ArrowUp');
  assert(
    document.activeElement === document.getElementById('test-sub-trigger'),
    'Keyboard: ArrowUp wraps to the last item of the same panel (not into the hidden submenu)'
  );

  // ==========================================
  // --- DOM NODE LOOKUPS (menu is open from here on) ---
  // ==========================================
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

  // Disabled Click
  click(itemDisabled);
  await nextTick();
  assert(
    activeAction === null && menu.getOpen() === true,
    'Events: onclick handler is strictly blocked on disabled menu items, and the menu stays open'
  );

  // Checkbox items keep the menu open (closeOnSelect defaults to false)
  click(itemCheckOff);
  await nextTick();
  assert(menu.getOpen() === true, 'Events: Clicking a checkbox item keeps the menu open');

  assert(
    itemStandard.getAttribute('tabindex') === '-1' && !itemDisabled.hasAttribute('tabindex'),
    'A11y: enabled items are focusable (tabindex=-1), disabled items are not'
  );

  // ==========================================
  // --- DESIGN SYSTEM ATTRIBUTE TESTS ---
  // ==========================================
  // Hover/press/disabled states come from giant.css via role + style-emphasis,
  // so items carry attributes instead of mutating inline styles.
  assert(
    itemStandard.getAttribute('role') === 'menuitem' &&
    itemStandard.getAttribute('style-emphasis') === 'ghost' &&
    itemStandard.getAttribute('style-layout') === 'row',
    'Styles: menu items render role="menuitem" with style-emphasis="ghost" (hover tint from giant.css)'
  );

  assert(
    itemCheckOn.getAttribute('role') === 'menuitemcheckbox' &&
    itemCheckOn.getAttribute('aria-checked') === 'true' &&
    itemCheckOff.getAttribute('aria-checked') === 'false',
    'Styles: checkbox items expose role="menuitemcheckbox" and aria-checked'
  );

  const content = document.getElementById('test-content');
  assert(
    content.getAttribute('style-surface') === 'overlay' &&
    content.getAttribute('style-layer') === 'overlay',
    'Styles: MenuContent renders as an overlay surface'
  );

  itemStandard.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
  assert(
    itemStandard.style.backgroundColor === '',
    'Styles: pointerover no longer writes inline background colours'
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
    subContent.style.display === '' &&
    subTrigger.hasAttribute('data-highlighted'),
    'Submenu: Hovering wrapper reveals nested content and highlights the trigger item'
  );

  submenuWrapper.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }));
  assert(
    subContent.style.display === 'none' &&
    !subTrigger.hasAttribute('data-highlighted'),
    'Submenu: Leaving wrapper conceals nested content and resets the trigger item'
  );

  // Standard Click (closes the menu, so it runs last)
  click(itemStandard);
  await nextTick();
  assert(
    activeAction === 'standard-clicked' && menu.getOpen() === false,
    'Events: onclick fires on standard menu items and selecting closes the menu'
  );
}
