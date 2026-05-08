import { component, createRoot, html, design } from '../../giant.js';
import { Avatar, AvatarImage, AvatarFallback } from './avatar.js';

const { div, section, h2 } = html;

const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

// Fully valid 1x1 transparent GIFs
const validImageSrc = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const validImageSrc2 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';

// --- TEST UI SETUP ---
const AvatarTestApp = component.AvatarTestApp(() => {
  return div({ class: 'avatar-test-wrapper', style: { display: 'flex', flexDirection: 'column', gap: '20px' } },

    // 1. Fallback Only
    section({ class: 'test-section' },
      h2('Fallback Only'),
      Avatar({ id: 'avatar-fallback-only' },
        AvatarFallback({ id: 'fallback-1' }, 'AB')
      )
    ),

    // 2. Successful Image
    section({ class: 'test-section' },
      h2('With Image'),
      Avatar({ id: 'avatar-with-image' },
        AvatarFallback({}, 'CD'),
        AvatarImage({ id: 'image-success', src: validImageSrc, alt: 'Test User' })
      )
    ),

    // 3. Error Handling & Recovery
    section({ class: 'test-section' },
      h2('Error Recovery'),
      Avatar({ id: 'avatar-error' },
        AvatarFallback({}, 'EF'),
        AvatarImage({ id: 'image-broken', src: validImageSrc })
      )
    )
  );
}, 'avatar-test-app');

// --- TEST RUNNER EXPORT ---
export async function testAvatar(mountPoint, assert) {
  const appNode = await createRoot(AvatarTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // ==========================================
  // --- BASE RENDER & FALLBACK TESTS ---
  // ==========================================
  const fallbackAvatar = document.getElementById('avatar-fallback-only');
  const fallbackInner = fallbackAvatar.firstElementChild;
  const fallbackText = document.getElementById('fallback-1');

  assert(
    fallbackInner && fallbackInner.style.width === '2.5rem' && fallbackInner.className.includes(design.layout.overflowHidden),
    'Base: Avatar wrapper applies correct default inline styles and framework classes'
  );

  assert(
    fallbackText && fallbackText.textContent === 'AB',
    'Fallback: Renders initials correctly when no image is provided'
  );

  // ==========================================
  // --- SUCCESSFUL IMAGE TESTS ---
  // ==========================================
  const imageSuccessHost = document.getElementById('image-success');
  const imgElement = imageSuccessHost.querySelector('img');

  assert(
    imgElement !== null,
    'Image: Renders the <img> element when src is provided'
  );

  if (imgElement) {
    assert(
      imgElement.getAttribute('src') === validImageSrc && imgElement.getAttribute('alt') === 'Test User',
      'Image: Correctly binds the src and alt attributes'
    );
  } else {
    assert(false, 'Image: Bypassing attribute check because img element is null');
  }

  // ==========================================
  // --- ERROR HANDLING & RECOVERY TESTS ---
  // ==========================================
  const imageBrokenHost = document.getElementById('image-broken');
  const brokenImgElement = imageBrokenHost.querySelector('img');

  assert(
    brokenImgElement !== null,
    'Error Lifecycle: Image element mounts initially to attempt loading'
  );

  // Simulate an image load error manually
  if (brokenImgElement) {
    brokenImgElement.dispatchEvent(new Event('error'));
    await nextTick();
  }

  assert(
    imageBrokenHost.querySelector('img') === null,
    'Error Lifecycle: Image unmounts itself (returns null) when the onerror event fires'
  );

  // Trigger a re-render with a new src to test recovery
  imageBrokenHost.render({ src: validImageSrc2 });

  // THE FIX: Cancel the cascading state update to prevent the stale props rollback!
  component._pendingRenders.delete(imageBrokenHost);

  await nextTick();

  const recoveredImgElement = imageBrokenHost.querySelector('img');

  assert(
    recoveredImgElement !== null && recoveredImgElement.getAttribute('src') === validImageSrc2,
    'Error Lifecycle: Image resets error state and remounts when a new valid src is provided'
  );
}
