import { component, createRoot, html, signal } from '../../giant.js';
import { Slider } from './slider.js';

const { div } = html;
const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

export async function testSlider(mountPoint, assert) {
  // 1. Define the signal in the test scope so it's stable and accessible
  let testSignal;

  const SliderTestApp = component.SliderTestApp(() => {
    // Initialize the signal and store the reference
    testSignal = signal.testVal([20]);

    return Slider({
      id: 'test-slider',
      value: testSignal.value,
      min: 0,
      max: 100,
      onValueChange: (v) => { testSignal.value = v; }
    });
  });

  // 2. Mount the app
  const appNode = await createRoot(SliderTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  const host = document.getElementById('test-slider');

  // 3. Mock Dimensions
  host.getBoundingClientRect = () => ({
    width: 100, height: 20, left: 0, top: 0, right: 100, bottom: 20
  });

  const getThumbs = () => host.querySelectorAll('.slider-thumb-wrapper');

  // ==========================================
  // --- INITIALIZATION ---
  // ==========================================
  assert(
    getThumbs()[0].style.left === '20%',
    'Initialization: Thumb position correctly maps to initial value percentage'
  );

  // ==========================================
  // --- DRAG PHYSICS ---
  // ==========================================
  host.dispatchEvent(new PointerEvent('pointerdown', {
    clientX: 80, clientY: 10, button: 0, bubbles: true, pointerId: 1
  }));

  await nextTick();

  // Access the signal directly! No more appNode.state crawling.
  assert(
    testSignal.value[0] === 80,
    'Interaction: Pointer down updates value to matched coordinate'
  );

  const activeThumbInner = getThumbs()[0].firstElementChild;
  assert(
    activeThumbInner.style.transform === 'scale(0.85)',
    'Physics: Active thumb applies scale(0.85) "plunge" during drag'
  );

  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
  await nextTick();

  // ==========================================
  // --- MULTI-THUMB SORTING ---
  // ==========================================
  testSignal.value = [10, 50];
  await nextTick();

  host.dispatchEvent(new PointerEvent('pointerdown', {
    clientX: 10, clientY: 10, button: 0, bubbles: true, pointerId: 2
  }));

  window.dispatchEvent(new PointerEvent('pointermove', {
    clientX: 90, clientY: 10, bubbles: true, pointerId: 2
  }));

  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 2 }));

  await nextTick();

  assert(
    testSignal.value[0] === 50 && testSignal.value[1] === 90,
    'Logic: Thumbs correctly re-sort their array positions when crossing over'
  );
}
