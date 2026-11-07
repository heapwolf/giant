import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const at = f => new URL(f, import.meta.url);
const read = f => fs.readFileSync(at(f), 'utf8');

// Every [style-x="y"] selector in giant.css is an allowed value.
const styles = {};
for (const [, name, value] of read('giant.css').replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\[style-([a-z][a-z-]*)="([a-z0-9-]+)"\]/g)) {
  if (!(styles[name] ??= []).includes(value)) styles[name].push(value);
}
if (!Object.keys(styles).length) throw new Error('No [style-*="..."] selectors found in giant.css');

const source = read('src/giant.source.js');
const sha = crypto.createHash('sha256').update(source).update(read('package.json')).digest('hex');
const header = `/**\n * GIANT.JS\n * Build Date: ${new Date().toISOString()}\n * Integrity: sha256-${sha}\n */\n`;

const js = header + source.replace('__GIANT_STYLES_INJECT__', JSON.stringify(styles));
const min = js.split('\n').map(l => l.trim()).filter(Boolean).join('\n');

const quoted = values => values.map(v => `'${v}'`);
const entries = Object.entries(styles);
const dts = `${header}
/** Design-system attributes, generated from giant.css. */
export interface StyleAttributes {
${entries.map(([n, v]) => `  'style-${n}'?: ${quoted(v).join(' | ')};`).join('\n')}
}

/** Allowed values for each style-* attribute (keys omit the "style-" prefix). */
export declare const styles: {
${entries.map(([n, v]) => `  readonly '${n}': readonly [${quoted(v).join(', ')}];`).join('\n')}
};

export interface VNode { readonly _type: string; toString(): string; }
export type Child = string | number | boolean | null | undefined | VNode | Node | ((...args: any[]) => any) | Child[];
export type Attributes = StyleAttributes & { class?: string | Array<string | false | null | undefined>; [attribute: string]: unknown };
export interface ElementFactory {
  (attributes: Attributes, ...children: Child[]): VNode;
  (...children: Child[]): VNode;
}

export declare function createRoot(Fn: any): any;
export declare function createElement(type: any, ...args: any[]): VNode;
export declare function component(Fn: any, tagName?: string): any;
export declare const html: Record<string, ElementFactory>;
export declare function match(p: Element | null, s?: string): Element | null;
`;

fs.writeFileSync(at('giant.js'), js);
fs.writeFileSync(at('giant.min.js'), min);
fs.writeFileSync(at('giant.d.ts'), dts);

const kb = n => (n / 1024).toFixed(2);
console.log(`giant.js sha256-${sha}\n${entries.length} style attributes\n${kb(Buffer.byteLength(min))} KB raw / ${kb(zlib.gzipSync(min).length)} KB gzip`);
