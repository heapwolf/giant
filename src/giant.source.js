/**
 * # GIANT.JS BEST PRACTICES
 *
 * - IMPORTS: `import { component, html, signal, design } from './giant.js';`
 * - HTML TAGS: Destructure from `html` object (e.g., `const { div, p } = html;`).
 * - COMPONENTS: Wrap in `component.Name((props, ...children) => { ... })`. Async/Generators natively supported.
 * - STATE: ALWAYS use signals (`const x = signal.x(init)`). Read/mutate via `x.value`. DO NOT use `this`.
 * - EVENTS: Use lowercase inline handlers (e.g., `onclick`, `onpointerover`).
 *
 * ## COMPONENT EXAMPLE
 * export const MyComponent = component.MyComponent(async (props, ...children) => {
 * const { disabled = false, ...hostProps } = props;
 * const count = signal.count(0); // Reactive state
 * const onclick = (e) => count.value++;
 *   // RETURN PATTERNS:
 *   // 1. Standard: `return div({ class: 'wrapper' }, ...children);`
 *   // 2. Host Props: Return an array to bind props/events directly to the `<ui-mycomponent>` host element.
 *   return [
 *   { ...hostProps, onclick, 'data-active': count.value > 0 },
 *     div(
 *     button({ disabled, class: design.typography.weightBold }, `Count: ${count.value}`)
 *   )
 *   ];
 * });
 */
globalThis.isServer = typeof process < 'u' && !!process.versions?.node && typeof window > 'u';

if (globalThis.isServer) {
  const g = globalThis;
  g.requestAnimationFrame ??= cb => setTimeout(() => cb(Date.now()), 16);
  g.cancelAnimationFrame ??= clearTimeout;

  g.CustomEvent ??= class CustomEvent extends Event {
    constructor(type, opts = {}) {
      super(type, opts);
      this.detail = opts.detail ?? null;
    }
  };

  const dom = new Proxy(() => {}, {
    get: (_, p) =>
      p === 'then' ? undefined :
      ['toString', Symbol.toPrimitive].includes(p) ? () => '' :
      p === 'valueOf' ? () => 0 :
      p === 'dispatchEvent' ? () => false :
      dom,
    apply: () => dom,
    construct: () => dom,
    set: () => true
  });

  for (const k of ['window', 'document', 'navigator', 'location']) g[k] ??= dom;
}

const tags = 'a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hr html i iframe img input ins kbd label legend li link main map mark meta meter nav noscript object ol optgroup option output p param picture pre progress q rp rt ruby s samp script section select small source span strong style sub summary sup svg path polyline rect circle g line polygon use text table tbody td template textarea tfoot th thead time title tr track u ul video wbr'.split(' ');
const match = (p, s) => s ? p.closest(s) : (a1, a2) => !a2 ? p.closest(a1) : (a1?.closest ? a1.closest(a2) : p.closest(a2));

const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHTML = (str) => String(str).replace(/[&<>"']/g, m => escapeMap[m]);

const eventCache = {};
const delegatedEvents = new Set();
const svgTags = new Set(['svg', 'path', 'polyline', 'rect', 'circle', 'g', 'line', 'polygon', 'use', 'text']);
const isSvgTag = t => svgTags.has(t);
const safeAttr = /^[a-zA-Z_:-][\w:.-]*$/;
const dangerousCss = /javascript:|expression\(|url\(|@import|-moz-binding|\\0/i;
const urlAttrs = /^(href|src|xlink:href|formaction|action|poster|data)$/i;
const dangerousUrl = /^\s*javascript:/i;
const parseClass = (c) => Array.isArray(c) ? c.flat(Infinity).filter(Boolean).join(' ') : c;

let currentRenderingElement = null;
const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const ignoredAttrs = new Set(['state', 'on', 'emit']);

const createVNode = (_type, attributes = {}, children = [], node = null) => ({
  _type,
  attributes,
  children,
  node,
  toString(lvl = 0) {
    if (_type === '#text') return escapeHTML(this.attributes.text);
    if (_type === '#dom') return this.node?.textContent ? escapeHTML(this.node.textContent) : '';

    const ind = lvl === 0 ? '' : '  '.repeat(lvl);

    const attrs = Object.entries(this.attributes)
      .filter(([k, v]) => typeof v !== 'function' && !ignoredAttrs.has(k) && v !== false && v != null)
      .map(([k, v]) => {
        const kLower = k.toLowerCase();
        if (!safeAttr.test(k) || kLower === 'srcdoc' || kLower.startsWith('on') || (urlAttrs.test(k) && dangerousUrl.test(String(v)))) return '';

        if (k === 'style') {
          if (typeof v === 'string' && dangerousCss.test(v)) return '';
          if (typeof v === 'object') {
            const styleStr = Object.entries(v)
              .filter(([sk, sv]) => /^[a-zA-Z0-9-]+$/.test(sk) && !dangerousCss.test(String(sv)))
              .map(([sk, sv]) => `${sk}:${escapeHTML(sv)}`).join(';');
            return styleStr ? `style="${styleStr}"` : '';
          }
        }

        return v === true ? k : `${k}="${escapeHTML(v)}"`;
      })
      .filter(Boolean)
      .join(' ');

    const tagStr = `<${_type}${attrs ? ' ' + attrs : ''}>`;

    if (voidElements.has(_type)) return `${ind}${tagStr}`;

    const validC = this.children.filter(c => c != null);
    if (validC.some(c => c._type !== '#text')) {
      return `${ind}${tagStr}\n${validC.map(c => c.toString ? c.toString(lvl + 1) : String(c)).join('\n')}\n${ind}</${_type}>`;
    }
    return `${ind}${tagStr}${validC.map(c => c.toString ? c.toString(lvl) : String(c)).join('')}</${_type}>`;
  }
});

const createElement = (t, ...args) => {
  const attributes = {};
  const children = [];
  const _type = (typeof t === 'string' ? t : t.tagName || 'div').toLowerCase();

  const processArgs = (arr) => {
    arr.forEach(c => {
      if (c == null || c === '') return;

      const type = typeof c;
      if (type === 'string' || type === 'number' || type === 'boolean') {
        children.push(createVNode('#text', { text: String(c) }));
      } else if (Array.isArray(c)) {
        processArgs(c);
      } else if (c._type) {
        children.push(c);
      } else if (c.nodeType === 1 || c.nodeType === 3) {
        const domAttrs = {};
        if (c.nodeType === 1) {
          const key = c._key ?? (typeof c.getAttribute === 'function' ? c.getAttribute('key') : null);
          if (key != null) domAttrs.key = key;
          if (c.id) domAttrs.id = c.id;
        }
        children.push(createVNode('#dom', domAttrs, [], c));
      } else if (type === 'function' && c.name?.startsWith('on')) {
        attributes[c.name] = c;
      } else if (type === 'object') {
        for (const k in c) attributes[k] = k === 'class' ? parseClass(c[k]) : c[k];
      }
    });
  };

  processArgs(args);

  if (_type === 'svg') attributes.xmlns = 'http://www.w3.org/2000/svg';

  return createVNode(_type, attributes, children);
};

const html = Object.fromEntries(tags.map(tag => [tag, (...args) => createElement(tag, ...args)]));

const patch = (el, vnode) => {
  if (!el || vnode == null) return el;

  if (typeof vnode.nodeType === 'number') {
    if (el !== vnode) {
      if (el && el.parentNode) el.replaceWith(vnode);
      return vnode;
    }
    return el;
  }

  if (typeof vnode === 'string' || typeof vnode === 'number') {
    if (el.textContent !== String(vnode)) el.textContent = String(vnode);
    return el;
  }

  if (vnode._type === '#dom') {
    if (el !== vnode.node) {
      if (el && el.parentNode) el.replaceWith(vnode.node);
      return vnode.node;
    }
    return el;
  }

  if (vnode._type === '#text') {
    if (el.nodeType === 3) {
      if (el.nodeValue !== vnode.attributes.text) el.nodeValue = vnode.attributes.text;
      return el;
    } else {
      const textNode = document.createTextNode(vnode.attributes.text);
      if (el.parentNode) el.replaceWith(textNode);
      return textNode;
    }
  }

  if (el.nodeType !== 1 || el.localName !== vnode._type) {
    const newEl = isSvgTag(vnode._type)
      ? document.createElementNS('http://www.w3.org/2000/svg', vnode._type)
      : document.createElement(vnode._type);

    if (el._compId) {
      newEl.state = el.state;
      newEl.render = el.render;
      newEl._compId = el._compId;
      newEl._renderSeq = el._renderSeq;
    }

    if (el.parentNode) el.replaceWith(newEl);
    el = newEl;
  }

  const oldProps = el._vprops || {};
  if (!el._vprops && el.attributes) {
    for (let i = 0; i < el.attributes.length; i++) oldProps[el.attributes[i].name] = true;
  }

  for (const k in oldProps) {
    if (!(k in vnode.attributes)) {
      if (k === 'class') {
        el.className = '';
        el.removeAttribute('class');
      } else if (k === 'id') {
        el.id = '';
        el.removeAttribute('id');
      } else if (k.startsWith('on')) {
        const eventName = eventCache[k] || k.slice(2).toLowerCase();
        if (el._handlers) delete el._handlers[eventName];
      } else if (k === 'style') {
        el.style.cssText = '';
      } else {
        el.removeAttribute(k);
      }
    }
  }

  el._vprops = { ...vnode.attributes };

  for (const k in vnode.attributes) {
    const v = vnode.attributes[k];

    if (k === 'key') {
      el._key = v;
      if (el.getAttribute(k) !== String(v)) el.setAttribute(k, v);
    } else if (typeof v === 'function') {
      let eventName = eventCache[k];
      if (!eventName) {
        eventName = eventCache[k] = k.startsWith('on') ? k.slice(2).toLowerCase() : k.toLowerCase();
      }

      (el._handlers ??= {})[eventName] = v;

      if (!delegatedEvents.has(eventName)) {
        delegatedEvents.add(eventName);
        const useCapture = ['focus', 'blur', 'scroll', 'load', 'error'].includes(eventName);

        document.addEventListener(eventName, (e) => {
          let node = e.target;
          while (node && node !== document) {
            if (node._handlers && node._handlers[eventName]) {

              let compRoot = node;
              while (compRoot && !compRoot.state && compRoot !== document) {
                compRoot = compRoot.parentNode;
              }
              const contextNode = (compRoot && compRoot.state) ? compRoot : node;

              node._handlers[eventName].call(contextNode, e, match(e.target));

              if (e.cancelBubble) break;
            }
            node = node.parentNode;
          }
        }, useCapture);
      }
    } else if (k === 'class') {
      const classStr = parseClass(v);
      if (typeof el.className === 'string') {
        if (el.className !== classStr) el.className = classStr;
      } else {
        if (el.getAttribute('class') !== classStr) el.setAttribute('class', classStr);
      }
    } else if (k === 'value') {
      if (el.value !== String(v)) el.value = v;
    } else if (k === 'checked') {
      if (el.checked !== !!v) el.checked = !!v;
    } else if (k === 'style' && typeof v === 'object') {
      const oldStyle = oldProps.style || {};
      for (const sk in oldStyle) {
        if (!(sk in v)) {
          if (sk.startsWith('--')) el.style.removeProperty(sk);
          else el.style[sk] = '';
        }
      }
      for (const sk in v) {
        if (dangerousCss.test(String(v[sk]))) continue;

        if (sk.startsWith('--')) {
          if (el.style.getPropertyValue(sk) !== String(v[sk])) {
            el.style.setProperty(sk, v[sk]);
          }
        } else {
          if (el.style[sk] !== v[sk]) el.style[sk] = v[sk];
        }
      }
    } else if (k !== 'state' && k !== 'on' && k !== 'emit') {
      if (!safeAttr.test(k)) continue;
      if (k.toLowerCase() === 'srcdoc') continue;
      if (k.toLowerCase().startsWith('on') && typeof v === 'string') continue;
      if (urlAttrs.test(k) && dangerousUrl.test(String(v))) continue;
      if (k === 'style' && typeof v === 'string' && dangerousCss.test(v)) continue;

      if (v === false || v == null) {
        if (el.hasAttribute(k)) el.removeAttribute(k);
      } else {
        const strVal = v === true ? '' : String(v);
        if (el.getAttribute(k) !== strVal) el.setAttribute(k, strVal);
      }
    }
  }

  const newC = vnode.children || [];

  if (newC.length === 0) {
    if (el.childNodes.length > 0) el.textContent = '';
    return el;
  }

  if (el.childNodes.length === 0) {
    for (let i = 0; i < newC.length; i++) {
      const vchild = newC[i];
      let targetNode = vchild._type === '#text'
        ? document.createTextNode(vchild.attributes.text)
        : vchild._type === '#dom'
          ? vchild.node
          : isSvgTag(vchild._type)
            ? document.createElementNS('http://www.w3.org/2000/svg', vchild._type)
            : document.createElement(vchild._type);

      if (vchild._type !== '#dom' && vchild._type !== '#text') {
        targetNode = patch(targetNode, vchild);
      }
      el.appendChild(targetNode);
    }
    return el;
  }

  let oldNode = el.firstChild;
  let newIdx = 0;
  let lastPlacedNode = null;

  while (oldNode && newIdx < newC.length) {
    const vchild = newC[newIdx];

    while (oldNode && oldNode.nodeType === 3 && oldNode.nodeValue.trim() === '' && vchild._type !== '#text') {
      const next = oldNode.nextSibling;
      el.removeChild(oldNode);
      oldNode = next;
    }
    if (!oldNode) break;

    const oldKey = oldNode.nodeType === 1 ? (oldNode._key ?? oldNode.getAttribute('key')) : null;
    const newKey = vchild.attributes?.key;

    if (oldKey == null && newKey == null) {
      // Fast path: both elements are unkeyed, keep patching sequentially
    } else if (String(oldKey) !== String(newKey)) {
      break;
    }

    oldNode = patch(oldNode, vchild);
    lastPlacedNode = oldNode;
    oldNode = oldNode.nextSibling;
    newIdx++;
  }

  if (newIdx === newC.length) {
    while (oldNode) {
      const next = oldNode.nextSibling;
      el.removeChild(oldNode);
      oldNode = next;
    }
    return el;
  }

  const keyed = new Map();
  const unkeyed = [];

  let curr = oldNode;
  while (curr) {
    const next = curr.nextSibling;
    if (curr.nodeType === 1) {
      const key = curr._key ?? curr.getAttribute('key');
      if (key != null) keyed.set(String(key), curr);
      else unkeyed.push(curr);
    } else {
      if (!(curr.nodeType === 3 && curr.nodeValue.trim() === '')) {
        unkeyed.push(curr);
      }
    }
    curr = next;
  }

  let unkeyedIdx = 0;

  for (let i = newIdx; i < newC.length; i++) {
    const vchild = newC[i];
    const key = vchild.attributes?.key;
    let targetNode = null;

    if (key != null) {
      targetNode = keyed.get(String(key));
      if (targetNode) keyed.delete(String(key));
    } else if (unkeyedIdx < unkeyed.length) {
      targetNode = unkeyed[unkeyedIdx++];
    }

    if (targetNode) {
      targetNode = patch(targetNode, vchild);
    } else {
      targetNode = vchild._type === '#text'
        ? document.createTextNode(vchild.attributes.text)
        : vchild._type === '#dom'
          ? vchild.node
          : isSvgTag(vchild._type)
            ? document.createElementNS('http://www.w3.org/2000/svg', vchild._type)
            : document.createElement(vchild._type);

      if (vchild._type !== '#dom' && vchild._type !== '#text') {
        targetNode = patch(targetNode, vchild);
      }
    }

    const expectedNext = lastPlacedNode ? lastPlacedNode.nextSibling : el.firstChild;

    if (targetNode !== expectedNext) {
      el.insertBefore(targetNode, expectedNext);
    }

    lastPlacedNode = targetNode;
  }

  keyed.forEach(node => {
    if (node.parentNode === el) el.removeChild(node);
  });
  for (let i = unkeyedIdx; i < unkeyed.length; i++) {
    if (unkeyed[i].parentNode === el) el.removeChild(unkeyed[i]);
  }

  return el;
};

const observables = new WeakSet();

const handleError = (err, compName, compId) => {
  if (err instanceof Error && err.stack) {
    const msg = `${err.name}: ${err.message}`;
    const stackStr = err.stack.includes(err.message) ? err.stack : `${msg}\n${err.stack}`;
    const [firstLine, ...rest] = stackStr.split('\n');
    const userStack = rest.filter(l => !l.includes('giant.js') && !l.includes('node:'));
    err.stack = [firstLine, ...userStack, `    at <${compName}> (GIANT Component Boundary)`].join('\n');
  }

  if (typeof coreComponent.onError === 'function') {
    coreComponent.onError(err, { component: compName, id: compId });
  } else {
    console.error(`[GIANT] Error Boundary: Component <${compName}> crashed.\n`, err.stack || err);
    if (!globalThis.isServer && globalThis.window) {
      window.dispatchEvent(new CustomEvent('giant:error', { detail: { component: compName, id: compId, error: err } }));
    }
  }
};

function coreComponent(Fn, tagName = '') {
  const defaultTag = ((Fn.name.match(/[A-Z][a-z0-9]*/g)?.join('-') ?? Fn.name) || 'anonymous-component').toLowerCase();
  Fn.tagName = tagName || (tags.includes(defaultTag) ? `ui-${defaultTag}` : defaultTag);
  Fn.rawFn = Fn;

  const proxy = new Proxy(Fn, {
    apply: (target, _, rawArgs) => {
      const isProps = rawArgs[0] && typeof rawArgs[0] === 'object' && !Array.isArray(rawArgs[0]) && !rawArgs[0]._type && !rawArgs[0].nodeType;
      const args = isProps ? rawArgs : [{}, ...rawArgs];

      const explicitId = args[0]?.id;
      const explicitKey = args[0]?.key;
      const id = explicitId || `local-${Math.random().toString(36).slice(2, 9)}`;

      let compState = explicitId ? (coreComponent.state[id] ??= {}) : {};

      const safeRender = (contextToApply, argsToApply) => {
        try {
          return target.apply(contextToApply, argsToApply);
        } catch (err) {
          handleError(err, Fn.tagName, explicitId || id);
          return createVNode('span', { style: 'display:none !important;', 'data-giant-error': Fn.tagName });
        }
      };

      if (globalThis.isServer) {
        const mockEl = { state: compState, _signals: {} };
        const previousElement = currentRenderingElement;
        currentRenderingElement = mockEl;

        let innerVNode = safeRender(mockEl, args);

        currentRenderingElement = previousElement;

        let hostAttrs = { id: explicitId || id };

        // Recursive SSR normalizer that matches client behavior
        const normalizeSSR = (val) => {
          if (val == null || typeof val === 'boolean') return createVNode('#text', { text: '' });
          if (typeof val === 'string' || typeof val === 'number') return createVNode('#text', { text: String(val) });
          if (Array.isArray(val)) {
            const renderableChildren = [];
            for (let i = 0; i < val.length; i++) {
              const item = val[i];
              if (typeof item === 'function') continue; // Strip event handlers

              // Extract host props
              if (item && typeof item === 'object' && !item._type && !item.nodeType && !Array.isArray(item)) {
                for (const k in item) hostAttrs[k] = k === 'class' ? parseClass(item[k]) : item[k];
                continue;
              }
              renderableChildren.push(normalizeSSR(item));
            }
            // Match client logic: unwrap if only 1 child remains, otherwise group in span
            if (renderableChildren.length === 1) return renderableChildren[0];
            return createVNode('span', { style: { display: 'contents' } }, renderableChildren);
          }
          return val;
        };

        return createVNode(Fn.tagName, hostAttrs, [normalizeSSR(innerVNode)]);
      }

      const safeId = (globalThis.CSS && CSS.escape) ? CSS.escape(explicitId) : explicitId;
      let el = explicitId ? document.querySelector(`${Fn.tagName}#${safeId}`) : null;
      if (!el) el = document.createElement(Fn.tagName);

      el.id = el.id || explicitId || '';
      if (explicitKey != null) el._key = explicitKey;

      el._compId = explicitId || id;
      el._renderSeq = el._renderSeq || 0;
      el.state = el.state || compState;

      if (!el.state._isProxy) {
        el.state = new Proxy(el.state, {
          get: (tgt, prop) => prop === '_isProxy' ? true : tgt[prop],
          set: (tgt, prop, val) => {
            if (tgt[prop] === val) return true;
            tgt[prop] = val;
            coreComponent._pendingRenders.add(el);
            if (!coreComponent._isMicrotaskQueued) {
              coreComponent._isMicrotaskQueued = true;
              queueMicrotask(coreComponent._flushRenders);
            }
            return true;
          }
        });
      }

      el.render = (updates) => {
        if (updates && typeof updates === 'object') Object.assign(args[0], updates);

        const newArgs = [{ ...args[0] }, ...args.slice(1)];
        const seq = ++el._renderSeq;

        if (el._renderController) el._renderController.abort();
        el._renderController = new AbortController();
        el.signal = el._renderController.signal;

        const previousElement = currentRenderingElement;
        currentRenderingElement = el;
        const innerVNode = safeRender(el, newArgs);
        currentRenderingElement = previousElement;

        const normalizeVNode = (val) => {
          if (val == null || typeof val === 'boolean') return createVNode('#text', { text: '' });
          if (typeof val === 'string' || typeof val === 'number') return createVNode('#text', { text: String(val) });
          if (Array.isArray(val)) {
            const renderableChildren = [];
            for (let i = 0; i < val.length; i++) {
              const item = val[i];
              if (typeof item === 'function' && item.name) { el[item.name] = item; continue; }
              if (item && typeof item === 'object' && !item._type && !item.nodeType && !Array.isArray(item)) {
                for (const k in item) k === 'class' ? el.setAttribute('class', parseClass(item[k])) : (el[k] = item[k]);
                continue;
              }
              renderableChildren.push(normalizeVNode(item));
            }
            if (renderableChildren.length === 1) return renderableChildren[0];
            return createVNode('span', { style: { display: 'contents' } }, renderableChildren);
          }
          return val;
        };

        const applyPatch = (node) => {
          if (seq !== el._renderSeq) return; // Prevent race conditions
          el = patch(el, createVNode(Fn.tagName, { id: el.id || explicitId || id }, [node]));
          if (seq > 1) queueMicrotask(() => el.dispatchEvent(new CustomEvent('updated', { bubbles: true, detail: { element: el } })));
        };

        if (innerVNode?.next) {
          (async () => {
            try {
              let result = await innerVNode.next();
              while (!result.done) {
                applyPatch(normalizeVNode(result.value));
                result = await innerVNode.next();
              }
              applyPatch(normalizeVNode(result.value));
            } catch (err) {
              handleError(err, Fn.tagName, explicitId || id);
              applyPatch(createVNode('span', { style: 'display:none !important;', 'data-giant-error': Fn.tagName }));
            }
          })();
        } else if (innerVNode?.then) {
          innerVNode.then(res => applyPatch(normalizeVNode(res)))
                    .catch(err => {
                      handleError(err, Fn.tagName, explicitId || id);
                      applyPatch(createVNode('span', { style: 'display:none !important;', 'data-giant-error': Fn.tagName }));
                    });
        } else {
          applyPatch(normalizeVNode(innerVNode));
        }
      };

      el.render();
      observables.add(el);
      return el;
    }
  });

  if (coreComponent._globalsEnabled && Fn.name) {
    if (!(Fn.name in globalThis)) globalThis[Fn.name] = proxy;
    else if (globalThis[Fn.name] !== proxy) console.warn(`GIANT: Cannot expose component "${Fn.name}" globally because it conflicts with a native browser API or existing variable.`);
  }

  if (!tags.includes(Fn.tagName.toLowerCase())) coreComponent.registry[Fn.tagName] = proxy;

  return proxy;
}

Object.assign(coreComponent, {
  _globalsEnabled: false,
  registry: {},
  state: {},
  onError: null,
  _pendingRenders: new Set(),
  _isMicrotaskQueued: false,
  enableGlobals: () => {
    coreComponent._globalsEnabled = true;
    tags.forEach(tag => { if (!(tag in globalThis)) globalThis[tag] = html[tag]; });
    console.log('GIANT: HTML tags and components exposed to global scope.');
  },
  _flushRenders: () => {
    const queue = Array.from(coreComponent._pendingRenders);
    coreComponent._pendingRenders.clear();
    coreComponent._isMicrotaskQueued = false;
    queue.forEach(el => el.isConnected !== false && el.render());
  }
});

const component = new Proxy(coreComponent, {
  apply(target, thisArg, argArray) {
    return target.apply(thisArg, argArray);
  },
  get(target, prop) {
    if (prop in target) return target[prop];
    if (typeof prop === 'string') {
      return (Fn, tagName = '') => {
        Object.defineProperty(Fn, 'name', { value: prop, configurable: true });
        return target(Fn, tagName);
      };
    }
  },
  set(target, prop, value) {
    target[prop] = value;
    return true;
  }
});

function createRoot(Fn) {
  const app = (Fn.tagName && coreComponent.registry[Fn.tagName] === Fn) ? Fn : component(Fn);

  if (globalThis.isServer) return app;

  return new Promise(resolve => {
    const onready = async () => {
      const el = document.querySelector(Fn.tagName)
      let root

      try {
        const props = {};
        if (el) {
          if (!el.id) el.id = `root-${Math.random().toString(36).slice(2, 9)}`;
          props.id = el.id;
        }
        root = await app(props)
      } catch (err) {
        return window.dispatchEvent(new ErrorEvent('error', { message: err.message, error: err }))
      }

      if (el && el !== root && el.parentNode) {
        el.parentNode.replaceChild(root, el)
      } else if (!document.body.contains(root)) {
        document.body.appendChild(root)
      }

      resolve(root)
      if (!globalThis.MutationObserver) return

      const processNodes = (nodes, eventType) => {
        const stack = Array.from(nodes)
        while (stack.length > 0) {
          const node = stack.pop()
          if (observables.has(node)) {
            node.dispatchEvent(new CustomEvent(eventType, { bubbles: true, detail: { element: node } }));
            if (eventType === 'destroyed') {
              if (node._renderController) node._renderController.abort();

              queueMicrotask(() => {
                if (document.body && !document.body.contains(node)) {
                  if (node._compId && coreComponent.state[node._compId]) delete coreComponent.state[node._compId];
                  observables.delete(node);
                }
              });
            }
          }
          if (node.childNodes) {
             for (let i = node.childNodes.length - 1; i >= 0; i--) stack.push(node.childNodes[i])
          }
        }
      }

      new globalThis.MutationObserver(list => list.forEach(mut => {
        mut.removedNodes && processNodes(mut.removedNodes, 'destroyed')
        mut.addedNodes && processNodes(mut.addedNodes, 'ready')
      })).observe(root.parentNode || document.body, { childList: true, subtree: true })
    }

    document.readyState === 'loading'
      ? globalThis.window.addEventListener('DOMContentLoaded', onready)
      : onready()
  })
}

const signal = new Proxy({}, {
  get: (_, key) => {
    if (typeof key !== 'string') return;

    return initial => {
      const el = currentRenderingElement;
      if (!el) throw Error('GIANT: state must be used inside a component.');

      el.state ??= {};
      el._signals ??= {};

      if (!(key in el.state)) {
        el.state[key] = typeof initial === 'function' ? initial() : initial;
      }

      return el._signals[key] ??= {
        get value() {
          return el.state[key];
        },
        set value(v) {
          el.state[key] = typeof v === 'function' ? v(el.state[key]) : v;
        }
      };
    };
  }
});

const design = __GIANT_DESIGN_INJECT__;

export { createRoot, createElement, design, component, html, signal, match };
