import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 1. Import GIANT first so the global tag helpers are registered for Node
import '../../giant.js';
import { GiantNews } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript'
};

const server = http.createServer(async (req, res) => {
  if (req.url === '/giant.js') {
    res.setHeader('Content-Type', 'application/javascript');
    return res.end(fs.readFileSync(path.join(__dirname, '../../giant.js')));
  }

  if (req.url === '/giant.css') {
    res.setHeader('Content-Type', 'text/css');
    return res.end(fs.readFileSync(path.join(__dirname, '../../giant.css')));
  }

  if (req.url === '/') {
    try {
      const template = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

      const rootNode = await GiantNews();
      const appHtml = rootNode.toString();

      const { component } = await import('../../giant.js');
      const stateScript = `<script>window.__GIANT_STATE__ = ${JSON.stringify(component.state)}</script>`;

      const finalHtml = template.replace(
        '<giant-news></giant-news>',
        `${stateScript}\n<giant-news>\n${appHtml}\n</giant-news>`
      );

      res.setHeader('Content-Type', 'text/html');
      return res.end(finalHtml);
    } catch (err) {
      res.statusCode = 500;
      return res.end(`SSR Error: ${err.message}`);
    }
  }

  const filePath = path.join(__dirname, req.url);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const mime = mimeTypes[ext] || 'text/plain';

    res.setHeader('Content-Type', mime);
    return res.end(fs.readFileSync(filePath));
  }

  res.statusCode = 404;
  res.end('Not Found');
});

server.listen(3000, () => {
  console.log('GIANT Hacker News running on http://localhost:3000');
});
