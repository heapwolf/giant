import { component, createRoot, html } from '../../giant.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card.js';

const { div, section, h2, button } = html;

const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

// --- TEST UI SETUP ---
const CardTestApp = component.CardTestApp(() => {
  return div({ class: 'card-test-wrapper', style: { display: 'flex', flexDirection: 'column', gap: '20px' } },

    // 1. Full Composition Card
    section({ class: 'test-section' },
      h2('Full Card Composition'),
      Card({ id: 'card-composition' },
        CardHeader({ id: 'card-header' },
          CardTitle({ id: 'card-title' }, 'Project Alpha'),
          CardDescription({ id: 'card-desc' }, 'Manage your project settings and team members.')
        ),
        CardContent({ id: 'card-content' },
          div({}, 'Main card content goes here.')
        ),
        CardFooter({ id: 'card-footer' },
          button({}, 'Cancel'),
          button({}, 'Save')
        )
      )
    ),

    // 2. Custom Props Merging
    section({ class: 'test-section' },
      h2('Custom Props Merging'),
      Card({
        id: 'card-custom',
        class: 'my-custom-card-class',
        style: { backgroundColor: 'rgb(255, 0, 0)' }
      }, 'Custom styles test')
    ),

    // 3. Variants
    section({ class: 'test-section' },
      h2('Variants'),
      Card({ id: 'card-outline', variant: 'outline' }, 'Outline'),
      Card({ id: 'card-transparent', variant: 'transparent' }, 'Transparent'),
      Card({ id: 'card-sunk', variant: 'sunk' }, 'Sunk')
    )
  );
}, 'card-test-app');

// --- TEST RUNNER EXPORT ---
export async function testCard(mountPoint, assert) {
  const appNode = await createRoot(CardTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // ==========================================
  // --- COMPOSITION TESTS ---
  // ==========================================
  const compCard = document.getElementById('card-composition');
  const header = document.getElementById('card-header');
  const title = document.getElementById('card-title');
  const desc = document.getElementById('card-desc');
  const content = document.getElementById('card-content');
  const footer = document.getElementById('card-footer');

  assert(
    compCard.firstElementChild.getAttribute('style-border') === 'thin' &&
    compCard.firstElementChild.getAttribute('style-surface') === 'raised',
    'Card: Renders base container as a raised surface with a thin border'
  );

  assert(
    header.firstElementChild.getAttribute('style-layout') === 'stack',
    'CardHeader: Renders as a vertical stack'
  );

  assert(
    title.firstElementChild.tagName === 'H3' && title.firstElementChild.getAttribute('style-margin') === 'none',
    'CardTitle: Renders as an h3 tag with margin reset'
  );

  assert(
    desc.firstElementChild.tagName === 'P' && desc.firstElementChild.getAttribute('style-margin') === 'none',
    'CardDescription: Renders as a p tag with margin reset'
  );

  // Note: DOM properties for '0' usually return '0px'
  assert(
    content.firstElementChild.style.paddingBlockStart === '0px',
    'CardContent: Overrides top padding to 0px to seamlessly follow header'
  );

  assert(
    footer.firstElementChild.style.paddingBlockStart === '' &&
    footer.firstElementChild.getAttribute('style-pad') === 'large' &&
    footer.firstElementChild.getAttribute('style-layout') === 'row',
    'CardFooter: Applies row layout with full padding'
  );

  // ==========================================
  // --- PROPS MERGING TESTS ---
  // ==========================================
  const customCard = document.getElementById('card-custom');
  const customInner = customCard.firstElementChild;

  assert(
    customInner.className.includes('my-custom-card-class') && customInner.getAttribute('style-surface') === 'raised',
    'Props: Properly merges custom classes alongside default style attributes'
  );

  assert(
    customInner.style.backgroundColor === 'rgb(255, 0, 0)' && customInner.getAttribute('style-border') === 'thin',
    'Props: Properly merges custom inline styles without losing base style attributes'
  );

  // ==========================================
  // --- VARIANT TESTS ---
  // ==========================================
  const outline = document.getElementById('card-outline').firstElementChild;
  const transparent = document.getElementById('card-transparent').firstElementChild;
  const sunk = document.getElementById('card-sunk').firstElementChild;

  assert(
    outline.getAttribute('style-border') === 'thin' && !outline.hasAttribute('style-surface'),
    'Variant: outline has a border and no surface'
  );

  assert(
    !transparent.hasAttribute('style-border') && !transparent.hasAttribute('style-surface'),
    'Variant: transparent has neither border nor surface'
  );

  assert(
    sunk.getAttribute('style-surface') === 'muted' && !sunk.hasAttribute('style-border'),
    'Variant: sunk is a borderless muted surface'
  );

  assert(
    !outline.hasAttribute('variant') && compCard.firstElementChild.getAttribute('style-radius') === 'medium',
    'Variant: the variant prop is not forwarded and every card has medium radius'
  );
}
