import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import '../../giant.js';
import { ConduitApp } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'db.json');

let db = { users: [], articles: [], comments: [], tags: [] };
if (fs.existsSync(dbPath)) {
  db = { ...db, ...JSON.parse(fs.readFileSync(dbPath, 'utf-8')) };
}
const saveDb = () => fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript'
};

const parseBody = (req) => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    try { resolve(body ? JSON.parse(body) : {}); }
    catch (e) { reject(e); }
  });
});

const getAuthUser = (req) => {
  const token = (req.headers.authorization || '').replace('Token ', '');
  return db.users.find(u => u.token === token);
};

const requireAuth = (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    res.writeHead(401).end(JSON.stringify({ errors: { body: ['Unauthorized'] } }));
    return null;
  }
  return user;
};

const generateSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).slice(2, 8);

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

      // 1. Await the async application.
      const rootNode = await ConduitApp();
      const appHtml = rootNode.toString();

      const { component } = await import('../../giant.js');
      const stateScript = `<script>window.__GIANT_STATE__ = ${JSON.stringify(component.state)}</script>`;

      // 3. Inject state and HTML into the shell
      const finalHtml = template.replace(
        '<conduit-app></conduit-app>',
        `${stateScript}\n<conduit-app>\n${appHtml}\n</conduit-app>`
      );

      res.setHeader('Content-Type', 'text/html');
      return res.end(finalHtml);
    } catch (err) {
      res.statusCode = 500;
      return res.end(`SSR Error: ${err.message}\n${err.stack}`);
    }
  }

  // --- REALWORLD API ROUTING ---
  if (req.url.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');

    // Support CORS for local development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.writeHead(204).end();

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathName = url.pathname;
    const method = req.method;

    try {
      // 1. Tags
      if (pathName === '/api/tags' && method === 'GET') {
        const tags = [...new Set(db.articles.flatMap(a => a.tagList || []))].concat(db.tags);
        return res.end(JSON.stringify({ tags: [...new Set(tags)] }));
      }

      // 2. Auth & Users
      if (pathName === '/api/users/login' && method === 'POST') {
        const { user: { email, password } } = await parseBody(req);
        const user = db.users.find(u => u.email === email && u.password === password);
        if (!user) return res.writeHead(401).end(JSON.stringify({ errors: { "email or password": ["is invalid"] } }));
        return res.end(JSON.stringify({ user }));
      }

      if (pathName === '/api/users' && method === 'POST') {
        const { user: { username, email, password } } = await parseBody(req);
        if (db.users.some(u => u.email === email || u.username === username)) {
          return res.writeHead(422).end(JSON.stringify({ errors: { "email or username": ["has already been taken"] } }));
        }
        const newUser = { username, email, password, token: `jwt-${Date.now()}`, bio: '', image: '', following: [] };
        db.users.push(newUser);
        saveDb();
        return res.end(JSON.stringify({ user: newUser }));
      }

      if (pathName === '/api/user' && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        return res.end(JSON.stringify({ user }));
      }

      if (pathName === '/api/user' && method === 'PUT') {
        const user = requireAuth(req, res);
        if (!user) return;
        const { user: updates } = await parseBody(req);
        Object.assign(user, updates);
        saveDb();
        return res.end(JSON.stringify({ user }));
      }

      // 3. Profiles
      const profileMatch = pathName.match(/^\/api\/profiles\/([^/]+)(\/follow)?$/);
      if (profileMatch) {
        const targetUsername = decodeURIComponent(profileMatch[1]);
        const isFollowRoute = !!profileMatch[2];
        const targetUser = db.users.find(u => u.username === targetUsername);

        if (!targetUser) return res.writeHead(404).end();
        const currentUser = getAuthUser(req);

        if (isFollowRoute) {
          if (!currentUser) return res.writeHead(401).end();
          currentUser.following = currentUser.following || [];
          if (method === 'POST' && !currentUser.following.includes(targetUsername)) {
            currentUser.following.push(targetUsername);
          } else if (method === 'DELETE') {
            currentUser.following = currentUser.following.filter(u => u !== targetUsername);
          }
          saveDb();
        }

        return res.end(JSON.stringify({
          profile: {
            username: targetUser.username,
            bio: targetUser.bio,
            image: targetUser.image,
            following: currentUser ? (currentUser.following || []).includes(targetUser.username) : false
          }
        }));
      }

      // 4. Articles
      if (pathName === '/api/articles/feed' && method === 'GET') {
        const user = requireAuth(req, res);
        if (!user) return;
        const limit = Number(url.searchParams.get('limit')) || 20;
        const offset = Number(url.searchParams.get('offset')) || 0;

        const following = user.following || [];
        const feedArticles = db.articles
          .filter(a => following.includes(a.author.username))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(offset, offset + limit);

        return res.end(JSON.stringify({ articles: feedArticles, articlesCount: feedArticles.length }));
      }

      if (pathName === '/api/articles' && method === 'GET') {
        const tag = url.searchParams.get('tag');
        const author = url.searchParams.get('author');
        const favorited = url.searchParams.get('favorited');
        const limit = Number(url.searchParams.get('limit')) || 20;
        const offset = Number(url.searchParams.get('offset')) || 0;

        let filtered = db.articles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (tag) filtered = filtered.filter(a => a.tagList.includes(tag));
        if (author) filtered = filtered.filter(a => a.author.username === author);
        if (favorited) filtered = filtered.filter(a => a.favoritedBy && a.favoritedBy.includes(favorited));

        const paginated = filtered.slice(offset, offset + limit);
        return res.end(JSON.stringify({ articles: paginated, articlesCount: filtered.length }));
      }

      if (pathName === '/api/articles' && method === 'POST') {
        const user = requireAuth(req, res);
        if (!user) return;
        const { article } = await parseBody(req);

        const newArticle = {
          ...article,
          slug: generateSlug(article.title),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          favorited: false,
          favoritesCount: 0,
          favoritedBy: [],
          author: { username: user.username, bio: user.bio, image: user.image, following: false }
        };
        db.articles.push(newArticle);
        saveDb();
        return res.end(JSON.stringify({ article: newArticle }));
      }

      // Article Specific Routes (/api/articles/:slug...)
      const articleMatch = pathName.match(/^\/api\/articles\/([^/]+)(\/(comments|favorite))?(\/(.+))?$/);
      if (articleMatch) {
        const slug = articleMatch[1];
        const subRoute = articleMatch[3];
        const idParam = articleMatch[5];

        const articleIndex = db.articles.findIndex(a => a.slug === slug);
        const article = db.articles[articleIndex];

        if (!article) return res.writeHead(404).end(JSON.stringify({ errors: { article: ["not found"] }}));
        const currentUser = getAuthUser(req);

        // Core Article Routes
        if (!subRoute) {
          if (method === 'GET') return res.end(JSON.stringify({ article }));

          if (method === 'PUT') {
            const user = requireAuth(req, res);
            if (!user) return;
            const { article: updates } = await parseBody(req);
            Object.assign(article, updates, { updatedAt: new Date().toISOString() });
            if (updates.title) article.slug = generateSlug(updates.title); // RealWorld spec updates slug on title change
            saveDb();
            return res.end(JSON.stringify({ article }));
          }

          if (method === 'DELETE') {
            const user = requireAuth(req, res);
            if (!user) return;
            db.articles.splice(articleIndex, 1);
            saveDb();
            return res.writeHead(204).end();
          }
        }

        // Favorites
        if (subRoute === 'favorite') {
          const user = requireAuth(req, res);
          if (!user) return;
          article.favoritedBy = article.favoritedBy || [];

          if (method === 'POST' && !article.favoritedBy.includes(user.username)) {
            article.favoritedBy.push(user.username);
            article.favoritesCount++;
          } else if (method === 'DELETE' && article.favoritedBy.includes(user.username)) {
            article.favoritedBy = article.favoritedBy.filter(u => u !== user.username);
            article.favoritesCount = Math.max(0, article.favoritesCount - 1);
          }

          article.favorited = article.favoritedBy.includes(user.username);
          saveDb();
          return res.end(JSON.stringify({ article }));
        }

        // Comments
        if (subRoute === 'comments') {
          if (method === 'GET') {
            const comments = db.comments.filter(c => c.articleSlug === slug);
            return res.end(JSON.stringify({ comments }));
          }

          if (method === 'POST') {
            const user = requireAuth(req, res);
            if (!user) return;
            const { comment } = await parseBody(req);
            const newComment = {
              id: Date.now(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              body: comment.body,
              articleSlug: slug,
              author: { username: user.username, bio: user.bio, image: user.image, following: false }
            };
            db.comments.push(newComment);
            saveDb();
            return res.end(JSON.stringify({ comment: newComment }));
          }

          if (method === 'DELETE' && idParam) {
            const user = requireAuth(req, res);
            if (!user) return;
            db.comments = db.comments.filter(c => c.id !== Number(idParam));
            saveDb();
            return res.writeHead(204).end();
          }
        }
      }

      return res.writeHead(404).end(JSON.stringify({ errors: { route: ["not found"] } }));

    } catch (apiErr) {
      console.error(apiErr);
      return res.writeHead(500).end(JSON.stringify({ errors: { server: [apiErr.message] } }));
    }
  }

  // --- STATIC ASSET ROUTING ---
  const filePath = path.join(__dirname, req.url.split('?')[0]);
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
  console.log('GIANT Conduit running on http://localhost:3000');
});
