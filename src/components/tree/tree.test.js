import { component, createRoot, html, signal } from '../../giant.js';
import { Tree } from './tree.js';

const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

let clicks = 0;
let disabledClicks = 0;

const TreeTestApp = component.TreeTestApp(() => {
  const open = signal.open(false);
  const selected = signal.selected('');

  return Tree({ id: 'tree' },
    Tree.Item({ id: 'tree-src', hasChildren: true, expanded: open.value, selected: selected.value === 'src', onToggle: () => { open.value = !open.value; }, onclick: () => { clicks++; selected.value = 'src'; } }, Tree.Label('src')),
    Tree.Branch({ id: 'tree-branch', expanded: open.value },
      Tree.Item({ id: 'tree-file', depth: 1 }, Tree.Label('index.js'))
    ),
    Tree.Item({ id: 'tree-disabled', disabled: true, onclick: () => { disabledClicks++; } }, Tree.Label('locked'))
  );
}, 'tree-test-app');

export async function testTree(mountPoint, assert) {
  const appNode = await createRoot(TreeTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  const root = document.querySelector('#tree [role="tree"]');
  const item = () => document.getElementById('tree-src');
  const branch = () => document.getElementById('tree-branch');

  assert(root && root.querySelectorAll('[role="treeitem"]').length === 3, 'Render: role="tree" containing role="treeitem" rows');
  assert(item().getAttribute('aria-expanded') === 'false' && branch().getAttribute('role') === 'group' && branch().hidden, 'Render: collapsed item has aria-expanded="false" and its group is hidden');
  assert(!document.getElementById('tree-file').hasAttribute('aria-expanded'), 'Render: leaf items have no aria-expanded');
  assert(document.getElementById('tree-file').style.paddingInlineStart.includes('1 * var(--space-medium)'), 'Style: depth indents the row');

  item().querySelector('[data-tree-caret]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();
  assert(item().getAttribute('aria-expanded') === 'true' && !branch().hidden && clicks === 0, 'Caret: clicking the caret calls onToggle, not onclick');

  item().querySelector('span').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();
  assert(clicks === 1 && item().getAttribute('aria-selected') === 'true' && item().getAttribute('style-emphasis') === 'solid', 'Click: clicking the row calls onclick; selected rows are solid');

  document.getElementById('tree-disabled').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();
  assert(disabledClicks === 0 && document.getElementById('tree-disabled').getAttribute('aria-disabled') === 'true', 'Disabled: onclick is not called and aria-disabled is set');
}
