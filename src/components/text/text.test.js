import { component, createRoot, html } from '../../giant.js';
import { Text } from './text.js';

const { div } = html;
const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

export async function testText(mountPoint, assert) {
  const TextTestApp = component.TextTestApp(() => {
    return div(
      { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },

      // 1. Default Render
      Text({ id: 'txt-default' }, 'Default Text'),

      // 2. Polymorphic rendering
      Text({ id: 'txt-h1', as: 'h1' }, 'Heading 1'),
      Text({ id: 'txt-span', as: 'span' }, 'Inline Span'),

      // 3. Color mapping aliases
      Text({ id: 'txt-danger', color: 'danger' }, 'Danger Color'),
      Text({ id: 'txt-muted', color: 'muted' }, 'Muted Color'),

      // 4. Typography styling props
      Text({
        id: 'txt-styling',
        size: 'size4',
        weight: 'weightBold',
        align: 'center',
        leading: 'tight',
        tracking: 'wide',
        transform: 'uppercase',
        decoration: 'underline',
        wrap: 'balance'
      }, 'Styled Text'),

      // 5. Native HTML attributes
      Text({ id: 'txt-dir', dir: 'rtl' }, 'Right to Left')
    );
  });

  const appNode = await createRoot(TextTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // ==========================================
  // --- DOM NODE LOOKUPS ---
  // ==========================================
  // Grab the inner element (the actual p/h1/span tag) inside the <ui-text> host wrapper
  const elDefault = document.getElementById('txt-default').firstElementChild;
  const elH1 = document.getElementById('txt-h1').firstElementChild;
  const elSpan = document.getElementById('txt-span').firstElementChild;
  const elDanger = document.getElementById('txt-danger').firstElementChild;
  const elMuted = document.getElementById('txt-muted').firstElementChild;
  const elStyling = document.getElementById('txt-styling').firstElementChild;
  const elDir = document.getElementById('txt-dir').firstElementChild;

  // ==========================================
  // --- RENDER & DEFAULT TESTS ---
  // ==========================================
  assert(
    elDefault.tagName === 'P' &&
    elDefault.classList.contains('typography-size-2') &&
    elDefault.classList.contains('typography-weight-regular') &&
    elDefault.classList.contains('fg'),
    'Defaults: Renders as a <p> tag with size2, weightRegular, and standard fg color'
  );

  // ==========================================
  // --- POLYMORPHISM TESTS ---
  // ==========================================
  assert(
    elH1.tagName === 'H1' && elSpan.tagName === 'SPAN',
    'Polymorphism: The "as" prop correctly alters the rendered HTML tag'
  );

  // ==========================================
  // --- COLOR MAPPING TESTS ---
  // ==========================================
  assert(
    elDanger.classList.contains('color-danger-fg') &&
    elMuted.classList.contains('fg-muted'),
    'Colors: Semantic color aliases successfully map to their respective design tokens'
  );

  // ==========================================
  // --- TYPOGRAPHY TOKEN TESTS ---
  // ==========================================
  assert(
    elStyling.classList.contains('typography-size-4') &&
    elStyling.classList.contains('typography-weight-bold') &&
    elStyling.classList.contains('typography-align-center') &&
    elStyling.classList.contains('typography-line-tight') &&
    elStyling.classList.contains('typography-letter-wide') &&
    elStyling.classList.contains('typography-transform-uppercase') &&
    elStyling.classList.contains('typography-decoration-underline') &&
    elStyling.classList.contains('typography-balance'),
    'Typography: Prop aliases (align, leading, tracking, transform, decoration, wrap) successfully construct and apply design tokens'
  );

  // ==========================================
  // --- NATIVE ATTRIBUTE TESTS ---
  // ==========================================
  assert(
    elDir.getAttribute('dir') === 'rtl',
    'Attributes: Native HTML attributes like "dir" are safely forwarded to the rendered tag'
  );
}
