import { component, createRoot, html } from '../../giant.js';
import { Separator } from './separator.js';

const { div } = html;
const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

const SeparatorTestApp = component.SeparatorTestApp(() => {
  return div({ style: { display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' } },
    // 1. Standard horizontal decorative separator
    Separator({ id: 'sep-default' }),

    // 2. Vertical decorative separator
    div({ style: { height: '50px', display: 'flex' } },
      Separator({ id: 'sep-vertical', orientation: 'vertical' })
    ),

    // 3. Semantic (non-decorative) separator for screen readers
    Separator({ id: 'sep-semantic', decorative: false, orientation: 'horizontal' })
  );
});

export async function testSeparator(mountPoint, assert) {
  const appNode = await createRoot(SeparatorTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // Target the inner VDOM elements
  const sepDefault = document.getElementById('sep-default').firstElementChild;
  const sepVertical = document.getElementById('sep-vertical').firstElementChild;
  const sepSemantic = document.getElementById('sep-semantic').firstElementChild;

  // ==========================================
  // --- INITIALIZATION & LAYOUT TESTS ---
  // ==========================================

  assert(
    sepDefault.getAttribute('data-orientation') === 'horizontal' &&
    sepDefault.style.height === '1px',
    'Init: Renders horizontally by default, enforcing a 1px height constraint'
  );

  assert(
    sepVertical.getAttribute('data-orientation') === 'vertical' &&
    sepVertical.style.width === '1px',
    'Init: Renders vertically when explicitly set, enforcing a 1px width constraint'
  );

  // ==========================================
  // --- ACCESSIBILITY TESTS ---
  // ==========================================

  assert(
    sepDefault.getAttribute('role') === 'none' &&
    !sepDefault.hasAttribute('aria-orientation'),
    'A11y: Defaults to decorative=true, setting role="none" and omitting aria-orientation'
  );

  assert(
    sepSemantic.getAttribute('role') === 'separator' &&
    sepSemantic.getAttribute('aria-orientation') === 'horizontal',
    'A11y: Non-decorative mode correctly assigns role="separator" and passes aria-orientation'
  );
}
