import { component, createRoot, html } from '../../giant.js';
import { CreditCardInput } from './creditcardinput.js';

const { div } = html;

const nextTick = () => new Promise(resolve => setTimeout(resolve, 20));

let lastInput = null;

const CreditCardTestApp = component.CreditCardTestApp(() => div(
  CreditCardInput({ id: 'cc-basic', placeholder: '0000 0000 0000 0000', oninput: (e, v) => { lastInput = [e.type, v]; } }),
  CreditCardInput({ id: 'cc-visa', value: '4242424242424242' }),
  CreditCardInput({ id: 'cc-disabled', disabled: true })
), 'credit-card-test-app');

export async function testCreditCardInput(mountPoint, assert) {
  const appNode = await createRoot(CreditCardTestApp);
  mountPoint.appendChild(appNode);
  await nextTick();

  const host = document.getElementById('cc-basic');
  const field = () => host.querySelector('input');

  assert(field() && field().getAttribute('inputmode') === 'numeric', 'Render: a numeric text input');
  assert(document.getElementById('cc-visa').getValue() === '4242 4242 4242 4242', 'Props: value is formatted in groups of four');
  assert(document.querySelector('#cc-visa svg path[fill="#00579f"]'), 'Icon: a 4 prefix shows the Visa logo');

  field().value = '5555a55556666';
  field().setSelectionRange(field().value.length, field().value.length);
  field().dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
  assert(field().value === '5555 5555 6666' && host.getValue() === '5555 5555 6666', 'Input: non-digits are dropped and digits grouped');
  assert(lastInput && lastInput[0] === 'input' && lastInput[1] === '5555 5555 6666', 'Input: oninput receives (event, value)');
  assert(field().selectionStart === 14, 'Input: the caret stays after the last typed digit');
  assert(host.querySelector('circle[fill="#eb001b"]'), 'Icon: a 5 prefix shows the Mastercard logo');

  host.setValue('1234 5678 9012 3456 7890');
  await nextTick();
  assert(field().value === '1234 5678 9012 3456', 'API: setValue() formats and caps at 16 digits');

  host.setInvalid(true);
  await nextTick();
  assert(field().getAttribute('aria-invalid') === 'true' && host.querySelector('[style-emphasis="field"]').getAttribute('style-tone') === 'danger', 'API: setInvalid() sets aria-invalid and the danger tone');

  host.clear();
  await nextTick();
  assert(host.getValue() === '' && field().value === '', 'API: clear() empties the field');

  const disabled = document.getElementById('cc-disabled');
  assert(disabled.querySelector('input').disabled && disabled.querySelector('[aria-disabled="true"]'), 'Props: disabled disables the input and dims the field');
}
