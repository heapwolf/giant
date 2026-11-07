import { component, createRoot } from '../../giant.js';
import { Toaster, toast } from './toast.js';

const wait = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms));

const ToastTestApp = component.ToastTestApp(() => Toaster({ id: 'test-toaster', fixed: false }), 'toast-test-app');

export async function testToast(mountPoint, assert) {
  const appNode = await createRoot(ToastTestApp);
  mountPoint.appendChild(appNode);
  await wait();

  const zone = (pos) => appNode.querySelector(`#toast-zone-${pos}`);

  const id = toast('Hello', { position: 'top-left' });
  await wait();
  assert(zone('top-left').textContent.includes('Hello'), 'toast(): renders into its position zone');

  toast('Updated', { id, position: 'top-left' });
  await wait();
  assert(
    zone('top-left').querySelectorAll('[data-toast-item]').length === 1 && zone('top-left').textContent.includes('Updated'),
    'toast(): reusing an id replaces the toast instead of adding one'
  );

  // a loading toast never times out; once settled it gets the success duration
  let resolve;
  toast.promise(new Promise(r => { resolve = r; }), { loading: 'Saving', success: 'Saved', duration: 100, position: 'bottom-left' });
  await wait();
  assert(zone('bottom-left').textContent.includes('Saving'), 'toast.promise(): shows the loading message');

  resolve();
  await wait();
  assert(zone('bottom-left').textContent.includes('Saved'), 'toast.promise(): switches to the success message');

  await wait(600);
  assert(!zone('bottom-left').textContent.includes('Saved'), 'toast.promise(): the settled toast auto-dismisses');

  toast.dismiss();
  await wait(500);
  assert(appNode.querySelectorAll('[data-toast-item]').length === 0, 'toast.dismiss(): with no id dismisses every toast');
}
