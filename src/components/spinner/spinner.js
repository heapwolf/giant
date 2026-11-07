import { component, html } from '../../../giant.js';

const SIZES = { sm: '16px', md: '24px', lg: '32px', xl: '48px' };

// A plain function so `this` is the host element (state + imperative API).
export const Spinner = component.Spinner(function (props = {}) {
  const { size = 'md', spinning = true, ...rest } = props;

  if (spinning !== this.state._prevSpinning) {
    this.state.isSpinning = !!spinning;
    this.state._prevSpinning = spinning;
  }

  if (!this.start) {
    this.start = () => { this.state.isSpinning = true; };
    this.stop = () => { this.state.isSpinning = false; };
    this.toggle = () => { this.state.isSpinning = !this.state.isSpinning; };
    this.timeout = (ms = 2000) => {
      this.start();
      setTimeout(() => this.stop(), ms);
    };
    Object.defineProperty(this, 'isSpinning', { get: () => this.state.isSpinning, configurable: true });
  }

  if (!this.state.isSpinning) return null;

  const px = SIZES[size] || size;

  return html.svg({
    'style-tone': 'muted',
    'style-motion': 'spin',
    ...rest,
    width: px,
    height: px,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2.5',
    'stroke-linecap': 'round'
  }, html.path({ d: 'M 21 12 A 9 9 0 1 1 12 3' }));
});
