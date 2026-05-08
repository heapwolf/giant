import { component, createRoot, html, design } from '../../giant.js';
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
    compCard.firstElementChild.style.borderStyle === 'solid',
    'Card: Renders base container with explicit solid border style'
  );

  assert(
    header.firstElementChild.style.flexDirection === 'column',
    'CardHeader: Renders with inline flex-direction column'
  );

  assert(
    title.firstElementChild.tagName === 'H3' && title.firstElementChild.className.includes(design.spacing.m0),
    'CardTitle: Renders as an h3 tag with margin reset classes'
  );

  assert(
    desc.firstElementChild.tagName === 'P' && desc.firstElementChild.className.includes(design.spacing.m0),
    'CardDescription: Renders as a p tag with margin reset classes'
  );

  // Note: DOM properties for '0' usually return '0px'
  assert(
    content.firstElementChild.style.paddingTop === '0px',
    'CardContent: Overrides top padding to 0px to seamlessly follow header'
  );

  assert(
    footer.firstElementChild.style.paddingTop === '0px' && footer.firstElementChild.className.includes(design.layout.flex),
    'CardFooter: Applies flex layout and overrides top padding to 0px'
  );

  // ==========================================
  // --- PROPS MERGING TESTS ---
  // ==========================================
  const customCard = document.getElementById('card-custom');
  const customInner = customCard.firstElementChild;

  assert(
    customInner.className.includes('my-custom-card-class') && customInner.className.includes(design.effect.shadow1),
    'Props: Properly merges custom classes alongside default design tokens'
  );

  assert(
    customInner.style.backgroundColor === 'rgb(255, 0, 0)' && customInner.style.borderStyle === 'solid',
    'Props: Properly merges custom inline styles without losing base inline styles'
  );
}
