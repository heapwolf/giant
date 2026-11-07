import { component, createRoot, html, signal } from '../../giant.js';
import { SplitLayout } from './split.js';

const { div } = html;

const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

let collapse;

const SplitTestApp = component.SplitTestApp(() => {
  collapse = signal.collapsed(false);

  return div({ style: { position: 'relative', width: '800px', height: '200px' } },
    SplitLayout({ id: 'split-test', initialSplit: 300, min: 200, max: 500, isCollapsed: collapse }, div('Left'), div('Right'))
  );
}, 'split-test-app');

export async function testSplit(mountPoint, assert) {
  localStorage.removeItem('split-test');
  const appNode = await createRoot(SplitTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  const host = document.getElementById('split-test');
  const container = host.firstElementChild;
  const [left, handle, right] = container.children;

  assert(left.textContent === 'Left' && right.textContent === 'Right', 'Render: children[0] and children[1] go into the two panes');
  assert(left.style.flex.includes('300px'), 'Render: the first pane starts at initialSplit');
  assert(handle.getAttribute('role') === 'separator' && handle.getAttribute('aria-orientation') === 'vertical', 'A11y: the handle is a vertical separator');

  const x0 = container.getBoundingClientRect().left;
  const pointer = (type, x) => handle.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, clientX: x0 + x, clientY: 10 }));
  // synthetic pointers can't be captured
  handle.setPointerCapture = handle.releasePointerCapture = () => {};
  pointer('pointerdown', 300);
  await nextTick();
  assert(handle.getAttribute('style-emphasis') === 'soft', 'Drag: the handle highlights while dragging');

  pointer('pointermove', 400);
  await nextTick();
  assert(container.children[0].style.flex.includes('400px'), 'Drag: moving resizes the first pane');

  pointer('pointermove', 900);
  await nextTick();
  assert(container.children[0].style.flex.includes('500px'), 'Drag: the size is clamped to max');

  pointer('pointerup', 900);
  await nextTick();
  assert(localStorage.getItem('split-test') === '500' && handle.getAttribute('style-emphasis') === 'ghost', 'Drag: releasing saves the size under the id');

  collapse.value = true;
  await nextTick();
  assert(container.children[0].style.flex.startsWith('1 0') && container.children[1].hasAttribute('inert'), 'Collapse: the first pane takes the space and the handle is inert');

  localStorage.removeItem('split-test');
}
