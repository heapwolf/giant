import { component, createRoot, html } from '../../giant.js';
import { Tooltip } from './tooltip.js';

const { div, button } = html;
const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));
const delayTick = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function testTooltip(mountPoint, assert) {
  const TooltipTestApp = component.TooltipTestApp(() => {
    return div(
      { style: { padding: '100px', display: 'flex', gap: '20px', flexWrap: 'wrap' } },

      Tooltip({ id: 'tt-default', position: 'top', content: 'Default Top' },
        button({}, 'Top')
      ),

      Tooltip({ id: 'tt-custom', delay: 0, position: 'bottom', padding: '16px', offset: 20, content: 'Custom Settings' },
        button({}, 'Custom')
      ),

      Tooltip({ id: 'tt-rtl', dir: 'rtl', delay: 0, position: 'left', content: 'RTL Support' },
        button({}, 'RTL Left')
      ),

      Tooltip({ id: 'tt-disabled', disabled: true, delay: 0, position: 'top', content: 'Hidden' },
        button({}, 'Disabled')
      )
    );
  });

  const appNode = await createRoot(TooltipTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  // ==========================================
  // --- DOM NODE LOOKUPS ---
  // ==========================================
  // FIX: Reinstated `.firstElementChild`. The ID is attached to the <ui-tooltip> host.
  // We must target the internal `div` wrapper that actually holds the event listeners.
  const defaultWrapper = document.getElementById('tt-default').firstElementChild;
  const customWrapper = document.getElementById('tt-custom').firstElementChild;
  const rtlWrapper = document.getElementById('tt-rtl').firstElementChild;
  const disabledWrapper = document.getElementById('tt-disabled').firstElementChild;

  // ==========================================
  // --- INITIALIZATION TESTS ---
  // ==========================================
  assert(
    defaultWrapper.querySelector('[role="tooltip"]') === null,
    'Initialization: Tooltips remain securely unmounted and hidden by default'
  );

  // ==========================================
  // --- INTERACTION & CONFIGURATION TESTS ---
  // ==========================================

  // Show Sequence
  customWrapper.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
  await nextTick();

  const customTooltip = customWrapper.querySelector('[role="tooltip"]');
  assert(
    customTooltip !== null && customTooltip.style.padding === '16px',
    'Props: Tooltip securely mounts on hover and applies custom padding configurations'
  );

  assert(
    customTooltip !== null && customTooltip.style.top === 'calc(100% + 20px)',
    'Props: Custom offsets successfully calculate the extended CSS coordinates'
  );

  // Hide Sequence
  customWrapper.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }));
  await delayTick(60); // Wait out the 50ms anti-flicker delay
  await nextTick();

  assert(
    customWrapper.querySelector('[role="tooltip"]') === null,
    'Interaction: pointerout cleanly destroys and unmounts the tooltip popup'
  );

  // ==========================================
  // --- RTL (RIGHT-TO-LEFT) TESTS ---
  // ==========================================
  rtlWrapper.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
  await nextTick();

  const rtlTooltip = rtlWrapper.querySelector('[role="tooltip"]');
  assert(
    rtlTooltip !== null && rtlTooltip.style.left === 'calc(100% + 8px)',
    'Logic: RTL direction actively flips "left" placements to output on the right (using CSS left coordinate)'
  );

  // ==========================================
  // --- DISABLED STATE TESTS ---
  // ==========================================
  disabledWrapper.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
  await nextTick();

  assert(
    disabledWrapper.querySelector('[role="tooltip"]') === null,
    'Logic: disabled=true entirely blocks the mount sequence during hover interactions'
  );
}
