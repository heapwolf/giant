import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 1. Go UP one level to get GIANT, stay LOCAL for the app
import '../../giant.js';
import { TodoApp } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// A proper MIME type map for our static assets
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript'
};

const server = http.createServer((req, res) => {
  if (req.url === '/giant.js') {
    res.setHeader('Content-Type', 'application/javascript');
    return res.end(fs.readFileSync(path.join(__dirname, '../../giant.js')));
  }

  if (req.url === '/giant.css') {
    res.setHeader('Content-Type', 'text/css');
    return res.end(fs.readFileSync(path.join(__dirname, '../../giant.css')));
  }

  if (req.url === '/') {
    const template = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
    const rootNode = TodoApp();
    const appHtml = rootNode.toString();

    const finalHtml = template.replace(
      '<todo-app></todo-app>',
      `<todo-app>\n${appHtml}\n</todo-app>`
    );

    res.setHeader('Content-Type', 'text/html');
    return res.end(finalHtml);
  }

  const filePath = path.join(__dirname, req.url);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const mime = mimeTypes[ext] || 'text/plain'; // Look up MIME, fallback to text/plain

    res.setHeader('Content-Type', mime);
    return res.end(fs.readFileSync(filePath));
  }

  res.statusCode = 404;
  res.end('Not Found');
});

server.listen(3000, () => {
  console.log('TODOMVC Demo: http://localhost:3000');
  console.log('Perf Tests: http://localhost:3000/index.perf.giant.html');
  console.log('Perf Tests: http://localhost:3000/index.perf.react.html');
  console.log('Basic Tests: on http://localhost:3000/index.test.basic.html');
  console.log('Composition Tests: on http://localhost:3000/index.test.composition.html');
});
