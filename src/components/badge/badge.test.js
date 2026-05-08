import { component, createRoot, html, design } from '../../giant.js';
import { Badge } from './badge.js';

const { div, section, h2 } = html;

const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

// --- TEST UI SETUP ---
const BadgeTestApp = component.BadgeTestApp(() => {
  return div({ class: 'badge-test-wrapper', style: { display: 'flex', flexDirection: 'column', gap: '20px' } },

    // 1. Default Badge
    section({ class: 'test-section' },
      h2('Default Badge'),
      Badge({ id: 'badge-default' }, 'Default Text')
    ),

    // 2. Variant Props
    section({ class: 'test-section' },
      h2('Variants'),
      Badge({ id: 'badge-destructive', variant: 'destructive' }, 'Destructive'),
      Badge({ id: 'badge-outline', variant: 'outline' }, 'Outline')
    ),

    // 3. API Controlled
    section({ class: 'test-section' },
      h2('API Controlled'),
      Badge({ id: 'badge-api' }, 'Dynamic')
    )
  );
}, 'badge-test-app');

// --- TEST RUNNER EXPORT ---
export async function testBadge(mountPoint, assert) {
  const appNode = await createRoot(BadgeTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // ==========================================
  // --- DEFAULT RENDER TESTS ---
  // ==========================================
  const defaultBadge = document.getElementById('badge-default');
  const defaultInner = defaultBadge.firstElementChild;

  assert(
    defaultBadge.state.variant === 'default',
    'State: Initializes with the "default" variant when no prop is provided'
  );

  assert(
    defaultInner && defaultInner.textContent === 'Default Text',
    'Render: Properly renders children text'
  );

  // CHANGED: Assert the presence of the design token classes
  assert(
    defaultInner.className.includes(design.bg.inverseBg) && defaultInner.className.includes(design.fg.inverseFg),
    'Style: Applies default background color correctly'
  );

  // ==========================================
  // --- VARIANT PROP TESTS ---
  // ==========================================
  const destructiveBadge = document.getElementById('badge-destructive');
  const outlineBadge = document.getElementById('badge-outline');

  assert(
    destructiveBadge.state.variant === 'destructive',
    'Props: Maps "destructive" variant prop to state correctly'
  );

  // CHANGED: Assert the design token classes
  assert(
    destructiveBadge.firstElementChild.className.includes(design.bg.dangerBg),
    'Style: Applies destructive background color correctly'
  );

  assert(
    outlineBadge.state.variant === 'outline' &&
    outlineBadge.firstElementChild.className.includes(design.border.border) &&
    !outlineBadge.firstElementChild.className.includes(design.bg.inverseBg),
    'Style: Applies outline variant specific styles'
  );

  // ==========================================
  // --- PROGRAMMATIC API TESTS ---
  // ==========================================
  const apiBadge = document.getElementById('badge-api');

  apiBadge.setVariant('secondary');
  await nextTick();

  assert(
    apiBadge.state.variant === 'secondary',
    'API: setVariant() successfully updates the internal state'
  );

  // CHANGED: Assert the design token classes
  assert(
    apiBadge.firstElementChild.className.includes(design.bg.bgMuted),
    'API: setVariant() successfully triggers a DOM re-render with new styles'
  );

  // ==========================================
  // --- REACTIVITY / PROP SYNC TESTS ---
  // ==========================================

  // Trigger a re-render from the outside
  apiBadge.render({ variant: 'destructive' });

  // Let the framework's microtask naturally flush the proxy updates
  await nextTick();

  assert(
    apiBadge.state.variant === 'destructive',
    'Props: Calling render() with a new variant seamlessly updates the internal state'
  );
}
