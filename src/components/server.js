import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../../giant.js';
import { ComponentsApp } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const template = fs.readFileSync('./src/components/index.html', 'utf-8');

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.ttf': 'font/ttf',
  '.js': 'application/javascript'
};

const server = http.createServer(async (req, res) => {
  // FRAMEWORK ROUTE
  if (req.url === '/giant.js') {
    res.setHeader('Content-Type', 'application/javascript');
    return res.end(fs.readFileSync(path.join(__dirname, '../../giant.js')));
  }

  if (req.url === '/giant.css') {
    res.setHeader('Content-Type', 'text/css');
    return res.end(fs.readFileSync(path.join(__dirname, '../../giant.css')));
  }

  if (req.url === '/src/lib.rs') {
    res.setHeader('Content-Type', 'text/plain'); // Plain text so it renders nicely in the CodeView
    return res.end(fs.readFileSync(path.join(__dirname, '../../src/lib.rs')));
  }

  // SERVER SIDE RENDERING ROUTE (COMPONENTS UI)
  if (req.url === '/') {
    try {
      // 1. Await the async application rendering
      const rootNode = await ComponentsApp();
      const appHtml = rootNode.toString();

      // 2. Extract and securely serialize component state (prevents XSS)
      const { component } = await import('../../giant.js');
      const safeState = JSON.stringify(component.state).replace(/</g, '\\u003c');
      const stateScript = `<script>window.__GIANT_STATE__ = ${safeState}</script>`;

      // 3. Inject state and rendered HTML into the shell
      const finalHtml = template.replace(
        '<components-app></components-app>',
        `${stateScript}\n<components-app>\n${appHtml}\n</components-app>`
      );

      res.setHeader('Content-Type', 'text/html');
      return res.end(finalHtml);
    } catch (err) {
      res.statusCode = 500;
      return res.end(`SSR Error: ${err.message}`);
    }
  }

  // STATIC ASSET ROUTING
  // Resolve paths directly relative to the components directory
  const reqPath = req.url.split('?')[0];
  const filePath = path.join(__dirname, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const mime = mimeTypes[ext] || 'text/plain';

    res.setHeader('Content-Type', mime);
    return res.end(fs.readFileSync(filePath));
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not Found', path: reqPath }));
});

server.listen(3000, () => {
  console.log('GIANT Components Demo running on http://localhost:3000');
  console.log('GIANT Components Test running on http://localhost:3000/test.html');
});
