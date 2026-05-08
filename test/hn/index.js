import { component, html, createRoot, signal } from '../../giant.js';

const { div, span, a, header, main, nav, b, button } = html;
const API_BASE = 'https://api.hnpwa.com/v0';

// ==========================================
// --- UTILITIES & DATA ---
// ==========================================

// 1. Simple memory cache to make navigation feel instantaneous
const apiCache = new Map();

const fetchHN = async (endpoint) => {
  if (apiCache.has(endpoint)) return apiCache.get(endpoint);
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  const data = await res.json();
  apiCache.set(endpoint, data);
  return data;
};

// 2. Strips unsafe tags but securely decodes HTML entities (like &quot;)
const decodeHTML = (htmlStr) => {
  if (!htmlStr) return '';
  const stripped = htmlStr.replace(/<[^>]*>?/gm, '');
  if (!globalThis.window) return stripped; // Server fallback
  const txt = document.createElement('textarea');
  txt.innerHTML = stripped;
  return txt.value;
};

// ==========================================
// --- COMPONENTS ---
// ==========================================

export const Comment = component(function Comment({ item }) {
  if (item.deleted) return '';

  // 3. Signal for collapsible comment threads!
  const isCollapsed = signal.isCollapsed(false);

  const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value;
  };

  return div({ class: 'comment', style: { margin: '10px 0 10px 15px', paddingLeft: '10px', borderLeft: '1px solid #ddd' } },
    div({
      class: 'meta',
      style: { fontSize: '11px', color: '#828282', marginBottom: '4px', cursor: 'pointer', userSelect: 'none' },
      onclick: toggleCollapse
    },
      isCollapsed.value ? '[+] ' : '[-] ',
      b({ style: { color: '#000' } }, item.user), ` ${item.time_ago}`
    ),
    isCollapsed.value ? null : [
      div({ class: 'text', style: { fontSize: '13px', color: '#000', marginBottom: '8px', wordBreak: 'break-word', lineHeight: '1.4' } },
        decodeHTML(item.content)
      ),
      // GIANT seamlessly handles recursive composition
      div({ class: 'children' },
        (item.comments || []).map(child => Comment({ item: child, key: child.id }))
      )
    ]
  );
});

export const Story = component(function Story({ item, rank }) {
  return div({ class: 'story-wrapper', style: { marginBottom: '15px' } },
    div({ class: 'story', style: { display: 'flex', alignItems: 'baseline' } },
      span({ class: 'rank', style: { width: '25px', textAlign: 'right', marginRight: '8px', color: '#828282' } }, `${rank}.`),
      a({ class: 'title', href: item.domain ? item.url : `#/item/${item.id}`, style: { color: '#000', textDecoration: 'none', fontSize: '14px' } }, item.title),
      item.domain ? a({ class: 'domain', href: item.url, style: { fontSize: '10px', color: '#828282', marginLeft: '5px', textDecoration: 'none' } }, `(${item.domain})`) : ''
    ),
    div({ class: 'meta', style: { fontSize: '10px', color: '#828282', paddingLeft: '33px', marginTop: '2px' } },
      `${item.points || 0} points by `,
      a({ href: `#/user/${item.user}`, style: { color: '#828282', textDecoration: 'none' } }, item.user),
      ` ${item.time_ago} | `,
      a({ href: `#/item/${item.id}`, style: { color: '#828282', textDecoration: 'none' } }, `${item.comments_count || 0} comments`)
    )
  );
});

const StoryList = component(async function StoryList({ feed, page }) {
  // If the route changed, clear the stale data to show loading state
  if (this.state.lastFeed !== feed || this.state.lastPage !== page) {
    this.state.stories = null;
    this.state.error = null;
    this.state.lastFeed = feed;
    this.state.lastPage = page;
  }

  // 1 Request gets all 30 fully populated stories
  if (!this.state.stories && !this.state.error) {
    try {
      this.state.stories = await fetchHN(`/${feed}/${page}.json`);
    } catch (err) {
      this.state.error = err.message;
    }
  }

  if (this.state.error) return div({ style: { padding: '15px', color: 'red' } }, `Failed to load: ${this.state.error}`);
  if (!this.state.stories) return div({ style: { padding: '15px' } }, 'Loading stories...');

  return div({ style: { padding: '10px', background: '#f6f6ef' } },
    div({ class: 'story-list' },
      this.state.stories.map((story, i) =>
        Story({ item: story, rank: ((page - 1) * 30) + i + 1, key: story.id })
      )
    ),
    a({
      href: `#/${feed}/${page + 1}`,
      style: { display: 'inline-block', marginLeft: '33px', marginTop: '10px', color: '#828282', textDecoration: 'none', fontWeight: 'bold' }
    }, 'More')
  );
});

const ItemView = component(async function ItemView({ id }) {
  if (this.state.lastId !== id) {
    this.state.item = null;
    this.state.error = null;
    this.state.lastId = id;
  }

  // 1 Request gets the item AND the entire recursive comment tree
  if (!this.state.item && !this.state.error) {
    try {
      this.state.item = await fetchHN(`/item/${id}.json`);
    } catch (err) {
      this.state.error = err.message;
    }
  }

  if (this.state.error) return div({ style: { padding: '15px', color: 'red' } }, `Failed to load: ${this.state.error}`);
  if (!this.state.item) return div({ style: { padding: '15px' } }, 'Loading discussion...');

  return div({ style: { padding: '10px', background: '#f6f6ef' } },
    Story({ item: this.state.item, rank: '*' }),
    div({ style: { marginTop: '20px', paddingLeft: '20px' } },
      (this.state.item.comments || []).map(child => Comment({ item: child, key: child.id }))
    )
  );
});

const UserView = component(async function UserView({ id }) {
  if (this.state.lastId !== id) {
    this.state.user = null;
    this.state.error = null;
    this.state.lastId = id;
  }

  if (!this.state.user && !this.state.error) {
    try {
      this.state.user = await fetchHN(`/user/${id}.json`);
    } catch (err) {
      this.state.error = err.message;
    }
  }

  if (this.state.error) return div({ style: { padding: '15px', color: 'red' } }, `Failed to load: ${this.state.error}`);
  if (!this.state.user) return div({ style: { padding: '15px' } }, 'Loading user...');

  return div({ style: { padding: '15px', color: '#000', background: '#f6f6ef' } },
    div({ style: { marginBottom: '5px' } }, 'User: ', b(this.state.user.id)),
    div({ style: { marginBottom: '5px' } }, 'Created: ', this.state.user.created),
    div({ style: { marginBottom: '15px' } }, 'Karma: ', this.state.user.karma),
    div({ style: { fontSize: '13px' } }, decodeHTML(this.state.user.about))
  );
});

// ==========================================
// --- ROOT APPLICATION ---
// ==========================================

export const GiantNews = component(function GiantNews() {
  // 4. Refactored routing to use `signal` instead of manual proxy assignment
  const currentRoute = signal.route(globalThis.window ? window.location.hash || '#/news/1' : '#/news/1');

  if (!this.state.initialized && globalThis.window) {
    window.addEventListener('hashchange', () => {
      currentRoute.value = window.location.hash || '#/news/1';
      window.scrollTo(0, 0);
    });
    this.state.initialized = true;
  }

  const parts = currentRoute.value.replace('#/', '').split('/');
  const route = parts[0];
  const param = parts[1];

  let activeView;
  if (route === 'item') {
    activeView = ItemView({ id: param, key: `item-${param}` });
  } else if (route === 'user') {
    activeView = UserView({ id: param, key: `user-${param}` });
  } else {
    const validFeeds = ['news', 'newest', 'ask', 'show', 'jobs'];
    const feed = validFeeds.includes(route) ? route : 'news';
    const page = parseInt(param) || 1;
    activeView = StoryList({ feed, page, key: `${feed}-${page}` });
  }

  const navLinkStyle = { color: '#000', textDecoration: 'none', marginRight: '5px' };

  return div({ class: 'container', style: { width: '85%', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Verdana, Geneva, sans-serif' } },
    header({ style: { background: '#ff6600', padding: '4px 8px', display: 'flex', alignItems: 'center' } },
      a({ href: '#/news/1', style: { border: '1px solid #fff', padding: '2px 6px', marginRight: '8px', color: '#fff', textDecoration: 'none', fontWeight: 'bold' } }, 'Y'),
      b({ style: { marginRight: '15px', color: '#000' } }, 'GIANT News'),
      nav({ style: { fontSize: '13px' } },
        a({ href: '#/newest/1', style: navLinkStyle }, 'new'), '| ',
        a({ href: '#/ask/1', style: navLinkStyle }, 'ask'), '| ',
        a({ href: '#/show/1', style: navLinkStyle }, 'show'), '| ',
        a({ href: '#/jobs/1', style: navLinkStyle }, 'jobs')
      )
    ),
    main(activeView)
  );
});

if (globalThis.window) {
  if (window.__GIANT_STATE__) Object.assign(component.state, window.__GIANT_STATE__);
  createRoot(GiantNews);
}
