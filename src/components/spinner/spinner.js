import { component, html, design } from '../../../giant.js';

const { svg, path, g } = html;

const SIZES = {
  sm: '16px',
  md: '24px',
  lg: '32px',
  xl: '48px'
};

// CHANGED: Use a standard function to allow 'this' binding
export const Spinner = component.Spinner(function(props) {
  const {
    size = 'md',
    spinning = true,
    class: customClass = '',
    style = {},
    ...rest
  } = props;

  // Now 'this.state' correctly points to the Giant element's state proxy
  if (this.state.isSpinning === undefined) {
    this.state.isSpinning = !!spinning;
  }

  // Handle prop updates
  if (spinning !== undefined && spinning !== this.state._prevSpinning) {
    this.state.isSpinning = !!spinning;
    this.state._prevSpinning = !!spinning;
  }

  // Define stable imperative methods
  if (!this.start) {
    this.start = () => { this.state.isSpinning = true; };
    this.stop = () => { this.state.isSpinning = false; };
    this.toggle = () => { this.state.isSpinning = !this.state.isSpinning; };
    this.timeout = (ms = 2000) => {
      this.start();
      setTimeout(() => this.stop(), ms);
    };
    Object.defineProperty(this, 'isSpinning', {
      get: () => this.state.isSpinning,
      configurable: true
    });
  }

  // If we aren't spinning, render nothing
  if (!this.state.isSpinning) return null;

  const pixelSize = SIZES[size] || size;

  return svg({
    ...rest,
    width: pixelSize,
    height: pixelSize,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2.5',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    class: [design.fg.fgMuted, customClass],
    style: { ...style }
  },
    g({
      style: {
        animation: 'spin 1s linear infinite',
        transformOrigin: '12px 12px'
      }
    },
      path({ d: 'M 21 12 A 9 9 0 1 1 12 3' })
    )
  );
});
