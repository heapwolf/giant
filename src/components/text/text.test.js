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
        size: 'large',
        weight: 'bold',
        align: 'center',
        leading: 'tight',
        tracking: 'wide',
        transform: 'upper',
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
    elDefault.getAttribute('style-text') === 'medium' &&
    elDefault.getAttribute('style-weight') === 'regular' &&
    !elDefault.hasAttribute('style-tone'),
    'Defaults: Renders as a <p> tag with medium text, regular weight, and inherited colour'
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
    elDanger.getAttribute('style-tone') === 'danger' &&
    elMuted.getAttribute('style-tone') === 'muted',
    'Colors: Semantic color aliases successfully map to style-tone'
  );

  // ==========================================
  // --- TYPOGRAPHY TOKEN TESTS ---
  // ==========================================
  assert(
    elStyling.getAttribute('style-text') === 'large' &&
    elStyling.getAttribute('style-weight') === 'bold' &&
    elStyling.getAttribute('style-text-align') === 'center' &&
    elStyling.getAttribute('style-leading') === 'tight' &&
    elStyling.getAttribute('style-tracking') === 'wide' &&
    elStyling.getAttribute('style-case') === 'upper' &&
    elStyling.getAttribute('style-decoration') === 'underline' &&
    elStyling.getAttribute('style-wrap') === 'balance',
    'Typography: Prop aliases (align, leading, tracking, transform, decoration, wrap) map to style attributes'
  );

  // ==========================================
  // --- NATIVE ATTRIBUTE TESTS ---
  // ==========================================
  assert(
    elDir.getAttribute('dir') === 'rtl',
    'Attributes: Native HTML attributes like "dir" are safely forwarded to the rendered tag'
  );
}
