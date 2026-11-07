import { component, html, signal } from '../../../giant.js';
import { InputGroup } from '../input/input.js';

const { input, span, svg, path, rect, circle, line } = html;

// "4242424242424242" → "4242 4242 4242 4242" (max 16 digits)
const format = (val) => String(val ?? '').replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');

const ICON = { width: '24', height: '16', viewBox: '0 0 24 16', fill: 'none' };

const cardIcon = (invalid, digits) => {
  if (invalid) return svg({ ...ICON, viewBox: '0 0 30 20', fill: 'currentColor' },
    path({ opacity: '0.74', d: 'M26.2061 0.00488281C28.3194 0.112115 30 1.85996 30 4V13.335L28.5 10.623V8H27.0488L25.9736 6.05664C25.744 5.64161 25.4595 5.2894 25.1367 5H28.5V4C28.5 2.61929 27.3807 1.5 26 1.5H4C2.61929 1.5 1.5 2.61929 1.5 4V5H19.8643C19.608 5.22972 19.3755 5.49872 19.1758 5.80762L19.0264 6.05664L17.9512 8H1.5V16C1.5 17.3807 2.61929 18.5 4 18.5H13.0371C13.1062 19.0302 13.2775 19.5408 13.5391 20H4L3.79395 19.9951C1.7488 19.8913 0.108652 18.2512 0.00488281 16.2061L0 16V4C0 1.85996 1.68056 0.112115 3.79395 0.00488281L4 0H26L26.2061 0.00488281Z' }),
    path({ 'fill-rule': 'evenodd', 'clip-rule': 'evenodd', d: 'M20.7762 7.0252C21.5325 5.65827 23.4673 5.65826 24.2235 7.0252L29.743 17.0027C30.4843 18.3434 29.5319 19.9995 28.0194 19.9998H16.9803C15.4679 19.9995 14.5155 18.3434 15.2567 17.0027L20.7762 7.0252ZM22.4999 15.4998C21.8095 15.4998 21.2499 16.0595 21.2499 16.7498C21.2499 17.4402 21.8095 17.9998 22.4999 17.9998C23.1902 17.9998 23.7499 17.4402 23.7499 16.7498C23.7499 16.0595 23.1902 15.4998 22.4999 15.4998ZM22.4999 8.99981C21.9476 8.99981 21.4999 9.44753 21.4999 9.99981V12.9998C21.4999 13.5521 21.9476 13.9998 22.4999 13.9998C23.0522 13.9998 23.4999 13.5521 23.4999 12.9998V9.99981C23.4999 9.44753 23.0522 8.99981 22.4999 8.99981Z' })
  );
  // brand colours are part of the logos
  if (digits.startsWith('4')) return svg(ICON,
    path({ fill: '#00579f', d: 'M22 0H2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2' }),
    path({ fill: '#fff', d: 'M10.367 10.91H8.85l.949-5.802h1.517zm5.501-5.66a3.8 3.8 0 0 0-1.36-.247c-1.5 0-2.555.79-2.561 1.92-.013.833.755 1.296 1.33 1.574.587.284.786.469.786.722-.006.389-.474.568-.91.568-.607 0-.931-.092-1.425-.309l-.2-.092-.212 1.302c.356.16 1.012.303 1.692.309 1.593 0 2.63-.778 2.642-1.982.006-.66-.4-1.166-1.274-1.58-.53-.265-.856-.444-.856-.716.006-.247.275-.5.874-.5.493-.012.856.105 1.13.222l.138.062z' }),
    path({ fill: '#fff', 'fill-rule': 'evenodd', 'clip-rule': 'evenodd', d: 'M18.584 5.108h1.174l1.224 5.802h-1.405l-.18-.87h-1.95c-.055.154-.318.87-.318.87h-1.592l2.254-5.32c.156-.377.431-.482.793-.482m-.093 2.124-.606 1.623h1.261c-.062-.29-.35-1.679-.35-1.679l-.106-.5a31 31 0 0 1-.2.556' }),
    path({ fill: '#fff', d: 'M7.582 5.108 6.096 9.065l-.162-.803c-.275-.926-1.136-1.931-2.098-2.432l1.361 5.074h1.605l2.385-5.796z' }),
    path({ fill: '#fff', d: 'M4.716 5.108H2.275l-.025.118c1.904.481 3.166 1.641 3.684 3.036l-.53-2.666c-.088-.37-.357-.475-.688-.488' })
  );
  if (digits.startsWith('5')) return svg(ICON,
    rect({ fill: '#252525', height: '16', rx: '2', width: '24' }),
    circle({ cx: '9', cy: '8', fill: '#eb001b', r: '5' }),
    circle({ cx: '15', cy: '8', fill: '#f79e1b', r: '5' }),
    path({ fill: '#ff5f00', d: 'M12 4c1.214.912 2 2.364 2 4s-.786 3.088-2 4c-1.214-.912-2-2.364-2-4s.786-3.088 2-4z' })
  );
  return svg({ ...ICON, stroke: 'currentColor', 'stroke-width': '1.5' },
    rect({ x: '1', y: '1', width: '22', height: '14', rx: '2' }),
    line({ x1: '1', y1: '6', x2: '23', y2: '6' })
  );
};

/**
 * A card number field: keeps digits only, groups them in fours and shows the Visa / Mastercard logo.
 * @param {string} [value=''] - Controlled value (formatted on the way in).
 * @param {boolean} [invalid=false]
 * @param {boolean} [disabled=false]
 * @param {(e: Event, value: string) => void} [oninput] - Receives the formatted value.
 * @method getValue() - The formatted value.
 * @method setValue(val)
 * @method clear()
 * @method setInvalid(state)
 */
export const CreditCardInput = component.CreditCardInput((props) => {
  const { value = '', invalid = false, disabled = false, oninput, ...rest } = props;

  const text = signal.value(format(value));
  const prevValue = signal._prevValue(value);
  const isInvalid = signal.invalid(!!invalid);
  const prevInvalid = signal._prevInvalid(invalid);

  if (value !== prevValue.value) text.value = format(prevValue.value = value);
  if (invalid !== prevInvalid.value) isInvalid.value = !!(prevInvalid.value = invalid);

  const handleInput = (e) => {
    const { target } = e;
    const digitsBefore = target.value.slice(0, target.selectionStart).replace(/\D/g, '').length;
    text.value = target.value = format(target.value);
    // the caret goes after the same number of digits, skipping the inserted spaces
    let caret = 0;
    for (let n = 0; n < digitsBefore && caret < text.value.length; caret++) if (text.value[caret] !== ' ') n++;
    oninput?.(e, text.value);
    queueMicrotask(() => target.setSelectionRange(caret, caret));
  };

  return [
    {
      getValue: () => text.value,
      setValue: (val) => { text.value = format(val); },
      clear: () => { text.value = ''; },
      setInvalid: (st) => { isInvalid.value = !!st; },
    },
    { 'style-layout': 'block', 'style-width': 'full' },
    InputGroup({ invalid: isInvalid.value, disabled },
      input({
        'style-flex': 'grow',
        'style-font': 'mono',
        'style-text': 'small',
        'style-pad-block': 'small',
        'style-pad-inline': 'small',
        'style-tone': isInvalid.value ? 'danger' : undefined,
        ...rest,
        type: 'text',
        inputmode: 'numeric',
        autocomplete: 'cc-number',
        value: text.value,
        disabled,
        'aria-invalid': String(isInvalid.value),
        oninput: handleInput,
      }),
      span({ 'style-layout': 'row', 'style-pad-inline': 'small', 'style-tone': isInvalid.value ? undefined : 'muted' }, cardIcon(isInvalid.value, text.value))
    )
  ];
});
