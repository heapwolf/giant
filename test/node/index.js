import test from 'node:test';
import assert from 'node:assert/strict';
import { html, component, createElement, signal } from '../../giant.js';

test('GIANT.JS Server-Side Rendering (SSR) Test Suite', async (t) => {

  await t.test('1. Environment & Polyfills', () => {
    assert.equal(globalThis.isServer, true, 'isServer should be true in Node environment');
    assert.ok(globalThis.window, 'Window polyfill should exist');
    assert.ok(globalThis.document, 'Document polyfill should exist');
    assert.equal(typeof globalThis.requestAnimationFrame, 'function', 'rAF should be polyfilled');
    assert.equal(typeof globalThis.CustomEvent, 'function', 'CustomEvent should be polyfilled');
  });

  await t.test('2. Basic VNode Stringification', () => {
    const { div, p, span } = html;

    assert.equal(div().toString(), '<div></div>', 'Empty div');
    assert.equal(p('Hello World').toString(), '<p>Hello World</p>', 'Text content');
    assert.equal(
      div(span('Inner')).toString().replace(/\s+/g, ''),
      '<div><span>Inner</span></div>',
      'Nested elements render correctly'
    );
    assert.equal(
      div('Text 1', p('Paragraph'), 'Text 2').toString().includes('<p>Paragraph</p>'),
      true,
      'Mixed text and element children'
    );
  });

  await t.test('3. Void Elements', () => {
    const { img, br, input, hr } = html;

    assert.equal(br().toString(), '<br>', 'br should not have a closing tag');
    assert.equal(hr().toString(), '<hr>', 'hr should not have a closing tag');
    assert.equal(
      img({ src: 'test.jpg' }).toString(),
      '<img src="test.jpg">',
      'img should serialize attributes without closing tag'
    );
    assert.equal(
      input({ type: 'text' }, 'Should ignore children').toString(),
      '<input type="text">',
      'Void elements should ignore children in toString()'
    );
  });

  await t.test('4. Attribute Serialization', () => {
    const { div, button, input } = html;

    assert.equal(
      div({ id: 'main', 'data-test': '123' }).toString(),
      '<div id="main" data-test="123"></div>',
      'Standard attributes'
    );
    assert.equal(
      button({ disabled: true }).toString(),
      '<button disabled></button>',
      'Boolean true renders as attribute name only'
    );
    assert.equal(
      button({ disabled: false, hidden: null }).toString(),
      '<button></button>',
      'Boolean false or null ignores the attribute'
    );
    assert.equal(
      input({ type: 'checkbox', checked: true }).toString(),
      '<input type="checkbox" checked>',
      'Checked boolean attribute'
    );
  });

  await t.test('5. Class Name Parsing', () => {
    const { div } = html;

    assert.equal(
      div({ class: 'btn primary' }).toString(),
      '<div class="btn primary"></div>',
      'String class name'
    );
    assert.equal(
      div({ class: ['btn', 'primary'] }).toString(),
      '<div class="btn primary"></div>',
      'Array class name'
    );
    assert.equal(
      div({ class: ['btn', null, false, 'active'] }).toString(),
      '<div class="btn active"></div>',
      'Array class name filters out falsy values'
    );
  });

  await t.test('6. Inline Styles Parsing', () => {
    const { div } = html;

    assert.equal(
      div({ style: 'color: red;' }).toString(),
      '<div style="color: red;"></div>',
      'String styles are passed through'
    );
    assert.equal(
      div({ style: { color: 'red', 'font-size': '12px' } }).toString(),
      '<div style="color:red;font-size:12px"></div>',
      'Object styles are mapped to string'
    );
    assert.equal(
      div({ style: { margin: 0, padding: null } }).toString(),
      '<div style="margin:0;padding:null"></div>',
      'Object style numeric rendering'
    );
  });

  await t.test('7. Event Handler Stripping', () => {
    const { button } = html;

    assert.equal(
      button({ onclick: () => {}, onpointerover: () => {} }, 'Click').toString(),
      '<button>Click</button>',
      'Function event handlers should be completely stripped in SSR'
    );
    assert.equal(
      button({ onClick: () => {} }, 'Click').toString(),
      '<button>Click</button>',
      'Case-insensitive handler stripping'
    );
  });

  await t.test('8. Security & XSS Prevention', () => {
    const { a, div } = html;

    assert.equal(
      div('<script>alert("xss")</script>').toString(),
      '<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>',
      'Text content should be HTML escaped'
    );
    assert.equal(
      a({ href: 'javascript:alert(1)' }, 'Link').toString(),
      '<a>Link</a>',
      'Dangerous javascript: URLs should be stripped from href'
    );
    assert.equal(
      a({ href: ' javascript:alert(1)' }, 'Link').toString(),
      '<a>Link</a>',
      'Dangerous URLs with leading spaces should be stripped'
    );
    assert.equal(
      div({ style: 'expression(alert(1))' }).toString(),
      '<div></div>',
      'Dangerous CSS expressions in string styles should be stripped'
    );
    assert.equal(
      div({ style: { color: 'url(javascript:alert(1))' } }).toString(),
      '<div></div>',
      'Dangerous CSS in object styles should be stripped'
    );
  });

  await t.test('9. Component SSR Wrapping', () => {
    const { span, section } = html;

    const SyncComponent = component.SyncComponent(() => span('SSR Content'));
    const renderedSync = SyncComponent().toString();

    assert.match(
      renderedSync,
      /^<sync-component id="local-[a-z0-9]+">(\s*)<span>SSR Content<\/span>(\s*)<\/sync-component>$/,
      'Synchronous component wraps content in its tag and generates an ID'
    );

    const ArrayComponent = component.ArrayComponent(() => [span('A'), span('B')]);
    const renderedArray = ArrayComponent().toString();

    assert.ok(
      renderedArray.includes('<span style="display:contents">'),
      'Components returning arrays should wrap children in display:contents span'
    );

    const CustomIdComponent = component.CustomIdComponent(() => section('Content'));
    const renderedCustomId = CustomIdComponent({ id: 'my-static-id' }).toString();

    assert.ok(
      renderedCustomId.includes('<custom-id-component id="my-static-id">'),
      'Explicit ID passed to component should override random local ID'
    );
  });

  await t.test('10. Error Boundaries (SSR Fallback)', () => {
    const ErrorComponent = component.ErrorComponent(() => {
      throw new Error('SSR Crash');
    });

    const originalError = console.error;
    console.error = () => {};

    const renderedError = ErrorComponent().toString();

    console.error = originalError; // Restore

    assert.ok(
      renderedError.includes('data-giant-error="error-component"'),
      'Component should gracefully catch error and render data-giant-error attribute'
    );
    assert.ok(
      renderedError.includes('display:none !important;'),
      'Component fallback should have display none'
    );
  });

  await t.test('11. SVG Elements & XMLNS Injection', () => {
    const { svg, path, rect } = html;

    const mySvg = svg({ viewBox: '0 0 10 10' },
      path({ d: 'M0 0' }),
      rect({ width: 10, height: 10 })
    );
    const rendered = mySvg.toString();

    assert.ok(
      rendered.includes('xmlns="http://www.w3.org/2000/svg"'),
      'Should auto-inject xmlns attribute into the root <svg> tag'
    );
    assert.ok(rendered.includes('<path d="M0 0">'), 'Should render SVG child tags');
    assert.ok(rendered.includes('<rect width="10" height="10">'), 'Should render subsequent SVG children');
  });

  await t.test('12. Framework-Specific Ignored Attributes', () => {
    const { div, p } = html;

    const el = div({ state: { x: 1 }, on: 'click', emit: 'customEvent', id: 'keep' }, p('Content'));
    const rendered = el.toString();

    assert.equal(
      rendered.includes('state='), false,
      'Should strip internal "state" attribute during SSR'
    );
    assert.equal(
      rendered.includes('on='), false,
      'Should strip internal "on" attribute during SSR'
    );
    assert.equal(
      rendered.includes('emit='), false,
      'Should strip internal "emit" attribute during SSR'
    );
    assert.ok(rendered.includes('id="keep"'), 'Should keep standard attributes');
  });

  await t.test('13. Signals inside SSR Components', () => {
    const SignalComponent = component.SignalComponent(() => {
      const count = signal.count(42);
      const message = signal.message(() => 'Hello State'); // Test function initializer

      return html.div(`Count: ${count.value}, Msg: ${message.value}`);
    });

    const rendered = SignalComponent().toString();

    assert.ok(
      rendered.includes('Count: 42'),
      'Signal initial primitive value should render successfully in SSR'
    );
    assert.ok(
      rendered.includes('Msg: Hello State'),
      'Signal function-initialized value should render successfully in SSR'
    );
  });

  await t.test('14. Deeply Nested & Falsy Children Filtering', () => {
    const { div, span } = html;

    const el = div(
      'Start',
      [span('Nested'), null],
      undefined,
      true, // Booleans convert to strings
      false,
      '', // Empty strings are ignored
      [['Deep']]
    );

    const rendered = el.toString().replace(/\s*\n\s*/g, ''); // strip newlines for easy assert

    assert.ok(rendered.startsWith('<div'), 'Should render wrapper');
    assert.ok(rendered.includes('Start'), 'Should render top-level text');
    assert.ok(rendered.includes('<span>Nested</span>'), 'Should flatten nested arrays');
    assert.ok(rendered.includes('true'), 'Should render `true` as text');
    assert.ok(rendered.includes('false'), 'Should render `false` as text');
    assert.ok(rendered.includes('Deep'), 'Should flatten deeply nested arrays');
  });

  await t.test('15. Array Returns (Host Props Pattern) in SSR', () => {
    const HostComponent = component.HostComponent((props) => {
      return [
        { 'data-active': true, class: 'host-class' },
        html.div('Inner Content 1'),
        html.div('Inner Content 2') // Added second child
      ];
    });

    const rendered = HostComponent().toString();

    assert.ok(
      rendered.includes('<host-component id="local-'),
      'Should wrap in custom component tag'
    );
    assert.ok(
      rendered.includes('<span style="display:contents">'),
      'Should fall back to a display:contents span wrapper for array returns in SSR'
    );
    assert.ok(
      rendered.includes('<div>Inner Content 1</div>') && rendered.includes('<div>Inner Content 2</div>'),
      'Should render actual children of the array return'
    );
  });

  await t.test('16. Invalid & Malicious Attribute Keys', () => {
    const { div } = html;

    const el = div({
      'data-valid': 'yes',
      'invalid="attr"': 'no',
      '>onclick': 'no',
      '--custom': 'var'
    });
    const rendered = el.toString();

    assert.ok(rendered.includes('data-valid="yes"'), 'Valid attributes are rendered');
    assert.ok(rendered.includes('--custom="var"'), 'Custom properties/CSS variables are rendered');
    assert.equal(
      rendered.includes('invalid='), false,
      'Attributes with invalid characters (quotes) are completely stripped'
    );
    assert.equal(
      rendered.includes('>onclick'), false,
      'Attributes meant to break out of tags (brackets) are completely stripped'
    );
  });

  await t.test('17. Handling Mock/Raw DOM Nodes (#dom VNodes)', () => {
    const { div } = html;

    // Simulating passing a raw DOM node into the render tree
    const mockNode = { nodeType: 1, id: 'test-node', textContent: 'Mocked text content' };
    const el = div(mockNode);

    const rendered = el.toString();

    assert.ok(
      rendered.includes('Mocked text content'),
      'Should gracefully extract and escape textContent from raw DOM nodes during SSR'
    );
  });

  await t.test('18. Global Enablement (enableGlobals)', () => {
    assert.equal(globalThis.nav, undefined, 'HTML tags should not be globally defined initially');

    component.enableGlobals();

    assert.equal(typeof globalThis.nav, 'function', 'HTML tags should be available globally after enablement');
    assert.equal(globalThis.nav().toString(), '<nav></nav>', 'Global functions should create VNodes correctly');

    // Cleanup so we don't pollute the test environment
    delete globalThis.nav;
    component._globalsEnabled = false;
  });

  await t.test('19. Component ID Uniqueness', () => {
    const Item = component.Item(() => html.div('item'));

    // Render two separate instances of the same component without explicit IDs
    const rendered1 = Item().toString();
    const rendered2 = Item().toString();

    const id1 = rendered1.match(/id="([^"]+)"/)?.[1];
    const id2 = rendered2.match(/id="([^"]+)"/)?.[1];

    assert.ok(id1 && id1.startsWith('local-'), 'Should auto-generate a local- prefix ID');
    assert.ok(id2 && id2.startsWith('local-'), 'Should auto-generate a local- prefix ID');
    assert.notEqual(id1, id2, 'Successive component renders must generate globally unique IDs');
  });

  await t.test('20. Signal Mutation During SSR Render Phase', () => {
    const MutatingComp = component.MutatingComp(() => {
      const val = signal.val(10);
      // Mutating state linearly before the return statement
      val.value = val.value + 15;
      return html.span(`Value is ${val.value}`);
    });

    const rendered = MutatingComp().toString();

    assert.ok(
      rendered.includes('<span>Value is 25</span>'),
      'Should reflect synchronous signal mutations made during the SSR setup phase'
    );
  });

  await t.test('21. Async Component SSR Boundary Limitations', () => {
    // Note: Your docblock says "Async/Generators natively supported"
    // But your `globalThis.isServer` block evaluates synchronously (`let innerVNode = safeRender(...)`).
    // This test verifies that returning a Promise does not crash the server,
    // even if it currently can't resolve the inner HTML synchronously.
    const AsyncComp = component.AsyncComp(async () => {
      return html.div('Async Data');
    });

    let rendered;
    assert.doesNotThrow(() => {
      rendered = AsyncComp().toString();
    }, 'Async component execution should not throw during SSR');

    // Currently, this will likely render an empty span or [object Promise] string
    // because SSR doesn't "await" the component setup.
    assert.ok(typeof rendered === 'string', 'Should fallback gracefully to a string');
  });

  await t.test('22. Advanced Boolean & Dataset Attributes', () => {
    const { input, select, option, div } = html;

    const el = div(
      { 'data-custom-id': '99', 'aria-hidden': true },
      input({ readonly: true, required: true, disabled: false }),
      select({ multiple: true }, option({ selected: true }))
    );

    const rendered = el.toString();

    assert.ok(rendered.includes('data-custom-id="99"'), 'Should render standard dataset attributes');
    assert.ok(rendered.includes('aria-hidden'), 'Should render boolean ARIA attributes');
    assert.ok(rendered.includes('readonly') && rendered.includes('required'), 'Should render input booleans');
    assert.ok(!rendered.includes('disabled'), 'Should omit false booleans');
    assert.ok(rendered.includes('multiple') && rendered.includes('selected'), 'Should render select/option booleans');
  });

  await t.test('23. Strict CSS Style Key Validation', () => {
    const { div } = html;

    // Giant.js style regex: /^[a-zA-Z0-9-]+$/
    const el = div({
      style: {
        '--theme-color': '#fff',
        'font-size': '12px',
        'invalid_key': '10px',
        'javascript:alert(1)': 'red' // Malicious key injection
      }
    });
    const rendered = el.toString();

    assert.ok(rendered.includes('--theme-color:#fff'), 'Should allow CSS variables (kebab-case with hyphens)');
    assert.ok(rendered.includes('font-size:12px'), 'Should allow standard kebab-case properties');
    assert.ok(!rendered.includes('invalid_key'), 'Should strip keys with underscores per the regex');
    assert.ok(!rendered.includes('javascript:'), 'Should strip malicious or poorly formatted property keys');
  });

  await t.test('24. Component Composition (Mapping Lists)', () => {
    const ListItem = component.ListItem((props) => html.li(props.text));

    const List = component.List(() => {
      return html.ul(
        [1, 2, 3].map(i => ListItem({ text: `Item ${i}` }))
      );
    });

    const rendered = List().toString();

    assert.ok(rendered.includes('<list-item'), 'Should render the custom element wrappers for child components');
    assert.ok(rendered.includes('Item 1') && rendered.includes('Item 3'), 'Should fully execute and map children');
    assert.ok(!rendered.includes(','), 'Should not accidentally render comma separators from Array.toString()');
  });

  await t.test('25. Exhaustive HTML Escaping (Text & Attributes)', () => {
    const { div } = html;
    // Testing all chars in the escapeMap: { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    const el = div({ title: `A & B " ' < >` }, `X & Y " ' < >`);
    const rendered = el.toString();

    assert.ok(
      rendered.includes('title="A &amp; B &quot; &#39; &lt; &gt;"'),
      'Should safely escape all restricted characters in attributes'
    );
    assert.ok(
      rendered.includes('X &amp; Y &quot; &#39; &lt; &gt;'),
      'Should safely escape all restricted characters in text nodes'
    );
  });

  await t.test('26. Falsy and Edge-Case Data Types as Children', () => {
    const { div } = html;
    // Giant.js ignores null/undefined/empty string, but converts booleans and numbers to strings
    const el = div('Start', 0, false, null, undefined, '', NaN, 'End');
    const rendered = el.toString();

    assert.ok(
      rendered.includes('Start0falseNaNEnd'),
      'Should stringify numbers and booleans, while completely dropping null, undefined, and empty strings'
    );
  });

  await t.test('27. Security: Dangerous URL Attributes', () => {
    const { form, iframe, object, video } = html;

    // Testing urlAttrs and dangerousUrl regexes
    const el1 = form({ action: 'javascript:submit()' });
    const el2 = iframe({ src: '   javascript:alert(1)' }); // Testing leading whitespace bypass
    const el3 = object({ data: 'JAVAScript:alert(1)' }); // Testing case insensitivity
    const el4 = video({ poster: 'javascript:alert()' });

    assert.equal(el1.toString().includes('action='), false, 'Should strip malicious action URLs');
    assert.equal(el2.toString().includes('src='), false, 'Should strip malicious src URLs with leading spaces');
    assert.equal(el3.toString().includes('data='), false, 'Should strip malicious object data URLs (case insensitive)');
    assert.equal(el4.toString().includes('poster='), false, 'Should strip malicious video poster URLs');
  });

  await t.test('28. Security: Malicious CSS Strings', () => {
    const { div } = html;

    // Testing dangerousCss regex against string-based styles
    const el1 = div({ style: "background: url('javascript:alert(1)')" });
    const el2 = div({ style: "behavior: url(#default#VML); -moz-binding: url(xss.xml);" });
    const el3 = div({ style: "x:expression(alert(1))" });

    assert.equal(el1.toString().includes('style='), false, 'Should entirely strip style strings containing javascript urls');
    assert.equal(el2.toString().includes('style='), false, 'Should entirely strip style strings containing -moz-binding');
    assert.equal(el3.toString().includes('style='), false, 'Should entirely strip style strings containing expression()');
  });

  await t.test('29. Host Props with Deeply Nested Array Returns', () => {
    const DeepHostComp = component.DeepHostComp(() => {
      // Testing how the SSR renderer handles arrays inside arrays when binding host props
      return [
        { 'data-role': 'widget' },
        [
          html.header('Top'),
          [html.span('Nested 1'), html.span('Nested 2')]
        ]
      ];
    });

    const rendered = DeepHostComp().toString();

    assert.ok(rendered.includes('data-role="widget"'), 'Should apply the host props object to the root element');
    assert.ok(rendered.includes('span style="display:contents"'), 'Should apply display:contents wrapper to inner arrays');
    assert.ok(rendered.includes('<header>Top</header>'), 'Should successfully render nested elements within arrays');
  });

  await t.test('30. Explicit Custom Elements & Unknown Tags', () => {
    // Testing createElement fallback behavior for non-standard tags not destructured from `html`
    const customEl = createElement('my-custom-web-component', { 'my-prop': 'test' }, createElement('slot'));
    const rendered = customEl.toString();

    assert.ok(
      rendered.startsWith('<my-custom-web-component my-prop="test">'),
      'Should successfully stringify custom Web Component tags'
    );
    assert.ok(
      rendered.includes('<slot></slot>'),
      'Should render standard children inside custom elements'
    );
  });
});


