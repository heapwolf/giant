import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

// --- Configuration ---
const CSS_PATH = path.join(import.meta.dirname, 'giant.css');
const JS_IN_PATH = path.join(import.meta.dirname, 'src/giant.source.js');
const PKG_PATH = path.join(import.meta.dirname, 'package.json');
const JS_OUT_PATH = path.join(import.meta.dirname, 'giant.js');
const JS_MIN_OUT_PATH = path.join(import.meta.dirname, 'giant.min.js');
const DTS_OUT_PATH = path.join(import.meta.dirname, 'giant.d.ts');

console.log('Starting zero-dependency GIANT.JS compilation...');

const safeMinify = (code) => {
  return code.split('\n').map(line => line.trim()).filter(Boolean).join('\n');
};

try {
  // 1. CSS Parsing
  if (!fs.existsSync(CSS_PATH)) throw new Error(`Could not find CSS file at ${CSS_PATH}`);
  const cssString = fs.readFileSync(CSS_PATH, 'utf8');

  const classMatches = cssString.match(/\.[a-zA-Z_-][\w-]*(?:\\:[\w-]+)*/g) || [];
  const classes = new Set(classMatches);

  const bags = `color bg fg border layout spacing size typography shape effect animation interaction responsive state misc`.split` `;
  const design = Object.fromEntries(bags.map(k => [k, {}]));

  const camel = s => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
  const add = (bag, key, cls) => { design[bag][camel(key)] = cls; };

  // --- Parse Utility Classes ---
  for (const m of classes) {
    const cls = m.slice(1).replaceAll('\\:', ':');
    const c = cls.replace(':', '-');

    if (cls.includes(':')) add(/^(sm|md|lg|cq):/.test(cls) ? 'responsive' : 'state', c, cls);
    else if (/^layout-/.test(cls) && !/^layout-(gap|margin|padding|width|height|size|ratio)/.test(cls)) add('layout', cls.slice(7), cls);
    else if (/^(p|m|gap)-|^layout-(padding|margin|gap)/.test(cls)) add('spacing', cls, cls);
    else if (/^(w|h)-|^layout-(width|height|size|ratio)/.test(cls) || cls == 'min-h-screen') add('size', cls, cls);
    else if (/^(typography|shape|effect|animation|interaction)-/.test(cls)) {
      const [, bag, key] = cls.match(/^([^-]+)-(.+)/);
      add(bag, key, cls);
    }
    else if (cls.startsWith('color-')) {
      const key = cls.slice(6);
      add(key.includes('bg') ? 'bg' : key.includes('fg') ? 'fg' : key.includes('border') ? 'border' : 'color', key, cls);
    }
    else if (cls.includes('bg')) add('bg', cls, cls);
    else if (cls.includes('fg')) add('fg', cls, cls);
    else if (cls.includes('border') || cls == 'border-color') add('border', cls.replace('border-color', 'border'), cls);
    else add('misc', cls, cls);
  }

  // --- NEW: Parse CSS Variable Palettes ---
  // Looks for strings like "--color-primary-3:" and grabs "primary" and "3"
  const paletteMatches = cssString.matchAll(/--color-([a-z]+)-(\d+)\s*:/g);
  for (const match of paletteMatches) {
    const family = match[1]; // e.g., "primary", "neutral", "danger"
    const scaleIndex = parseInt(match[2], 10); // e.g., 0, 1, 3

    // Initialize the array for this color family if it doesn't exist yet
    if (!design.color[family]) {
      design.color[family] = [];
    }

    // Inject the mapped CSS variable string
    design.color[family][scaleIndex] = `var(--color-${family}-${scaleIndex})`;
  }

  // 2. Read Source and Package data
  if (!fs.existsSync(JS_IN_PATH)) throw new Error(`Could not find JS source file at ${JS_IN_PATH}`);
  let jsSource = fs.readFileSync(JS_IN_PATH, 'utf8');
  let pkgSource = fs.existsSync(PKG_PATH) ? fs.readFileSync(PKG_PATH, 'utf8') : '';

  // 3. Generate SHA-256 Hash
  const hash = crypto.createHash('sha256');
  hash.update(jsSource).update(pkgSource);
  const sha256Hex = hash.digest('hex');
  const buildDate = new Date().toISOString();

  const header = `/**\n * GIANT.JS\n * Build Date: ${buildDate}\n * Integrity: sha256-${sha256Hex}\n */\n`;

  // 4. Inject JS Object & Minify
  // JSON.stringify will automatically handle the nested arrays we created!
  const compiledJs = header + jsSource.replace('__GIANT_DESIGN_INJECT__', JSON.stringify(design));
  fs.writeFileSync(JS_OUT_PATH, compiledJs, 'utf8');

  const lightMinified = safeMinify(compiledJs);
  fs.writeFileSync(JS_MIN_OUT_PATH, lightMinified, 'utf8');

  // 5. Build TypeScript Definitions (.d.ts)
  console.log('Generating TypeScript definitions...');
  let dtsString = `${header}\n`;

  dtsString += `export declare const design: {\n`;
  for (const bag of bags) {
    dtsString += `  ${bag}: {\n`;
    for (const [key, value] of Object.entries(design[bag])) {

      // NEW: Handle nested arrays for color palettes in TypeScript
      if (Array.isArray(value)) {
        // Convert the JS array into a TypeScript literal tuple (e.g. readonly ["var(--color-primary-0)", ...])
        const tupleTypes = Array.from(value).map(v => v ? `"${v}"` : 'undefined').join(', ');
        dtsString += `    readonly "${key}": readonly [${tupleTypes}];\n`;
      } else {
        dtsString += `    readonly "${key}": "${value}";\n`;
      }

    }
    dtsString += `  };\n`;
  }
  dtsString += `};\n\n`;

  dtsString += `export declare function createRoot(Fn: any): any;\n`;
  dtsString += `export declare function createElement(type: any, ...args: any[]): any;\n`;
  dtsString += `export declare function component(Fn: any, tagName?: string): any;\n`;
  dtsString += `export declare const html: Record<string, (...args: any[]) => any>;\n`;
  dtsString += `export declare function match(p: Element | null, s?: string): Element | null;\n`;

  fs.writeFileSync(DTS_OUT_PATH, dtsString, 'utf8');

  // 6. Calculate Metrics
  const rawSize = Buffer.byteLength(lightMinified, 'utf8');
  const gzipSize = zlib.gzipSync(lightMinified).length;

  console.log(`\nCompilation Complete!`);
  console.log(`Integrity:  sha256-${sha256Hex}`);
  console.log(`Typings:    Saved to giant.d.ts`);
  console.log(`Size:       ${(rawSize / 1024).toFixed(2)} KB raw / ${(gzipSize / 1024).toFixed(2)} KB gzip`);

} catch (err) {
  console.error('Compilation failed:', err);
  process.exit(1);
}
