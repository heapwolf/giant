import { component, html, createRoot, signal } from '../../giant.js';

const { div, nav, a, ul, li, h1, h4, p, button, form, input, fieldset, span, textarea, img, hr } = html;

// Safely check for isServer to handle the API base URL
const API_BASE = !globalThis.isServer
  ? `${window.location.origin}/api`
  : 'https://api.realworld.io/api';

// API & AUTHENTICATION LAYER
const api = {
  // Safely check if localStorage exists in the current environment
  token: typeof localStorage !== 'undefined' ? localStorage.getItem('jwt') : null,

  async request(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Token ${this.token}`;

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    if (res.status === 204) return null; // No content

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch (e) { throw { errors: { server: ['returned invalid JSON data.'] } }; }

    if (!res.ok) throw data;
    return data;
  },

  setToken(token) {
    this.token = token;
    // Apply the same safe check here
    if (typeof localStorage !== 'undefined') {
      if (token) localStorage.setItem('jwt', token);
      else localStorage.removeItem('jwt');
    }
  }
};

const ArticlePreview = component(function ArticlePreview({ article }) {
  // Make favorites interactive using signals
  const isFavorited = signal.isFavorited(article.favorited);
  const favCount = signal.favCount(article.favoritesCount);
  const isSubmitting = signal.isSubmitting(false);

  const toggleFavorite = async (e) => {
    e.preventDefault();
    if (!api.token) return window.location.hash = '#/login';
    if (isSubmitting.value) return;

    isSubmitting.value = true;
    // Optimistic UI update
    isFavorited.value = !isFavorited.value;
    favCount.value = isFavorited.value ? favCount.value + 1 : favCount.value - 1;

    try {
      const method = isFavorited.value ? 'POST' : 'DELETE';
      const data = await api.request(`/articles/${article.slug}/favorite`, method);
      // Sync with server source of truth
      isFavorited.value = data.article.favorited;
      favCount.value = data.article.favoritesCount;
    } catch (err) {
      // Revert on failure
      isFavorited.value = !isFavorited.value;
      favCount.value = isFavorited.value ? favCount.value + 1 : favCount.value - 1;
    } finally {
      isSubmitting.value = false;
    }
  };

  return div({ class: 'article-preview' },
    div({ class: 'article-meta' },
      a({ href: `#/profile/${article.author.username}` },
        img({ src: article.author.image || 'https://api.realworld.io/images/smiley-cyrus.jpeg' })
      ),
      div({ class: 'info' },
        a({ href: `#/profile/${article.author.username}`, class: 'author' }, article.author.username),
        span({ class: 'date' }, new Date(article.createdAt).toDateString())
      ),
      button({
        class: `btn btn-sm pull-xs-right ${isFavorited.value ? 'btn-primary' : 'btn-outline-primary'}`,
        onClick: toggleFavorite,
        disabled: isSubmitting.value
      },
        `♥ ${favCount.value}`
      )
    ),
    a({ href: `#/article/${article.slug}`, class: 'preview-link' },
      h1(article.title),
      p(article.description),
      span('Read more...'),
      ul({ class: 'tag-list' },
        article.tagList.map(tag => li({ class: 'tag-default tag-pill tag-outline' }, tag))
      )
    )
  );
});

// PAGE COMPONENTS

const Home = component(async function Home() {
  const tab = signal.tab(api.token ? 'feed' : 'global');
  const selectedTag = signal.tag(null);
  const articles = signal.articles([]);
  const tags = signal.tags([]);
  const fetchError = signal.fetchError(null);

  const tagsAttempted = signal.tagsAttempted(false);
  const articlesLoaded = signal.articlesLoaded(false);

  if (!tagsAttempted.value) {
    tagsAttempted.value = true;
    api.request('/tags')
      .then(data => { tags.value = data.tags; })
      .catch(() => { tags.value = ['error loading tags']; });
  }

  if (!articlesLoaded.value) {
    const endpoint = tab.value === 'feed' ? '/articles/feed' :
                     selectedTag.value ? `/articles?tag=${selectedTag.value}` :
                     '/articles';
    try {
      const data = await api.request(endpoint);
      articles.value = data.articles;
      fetchError.value = null;
    } catch (err) {
      articles.value = [];
      fetchError.value = "Could not load articles.";
    } finally {
      articlesLoaded.value = true;
    }
  }

  const setTab = (newTab, newTag = null) => {
    tab.value = newTab;
    selectedTag.value = newTag;
    articlesLoaded.value = false;
  };

  return div({ class: 'home-page' },
    div({ class: 'banner' },
      div({ class: 'container' },
        h1({ class: 'logo-font' }, 'conduit'),
        p('A place to share your knowledge.')
      )
    ),
    div({ class: 'container page' },
      div({ class: 'row' },
        div({ class: 'col-md-9' },
          div({ class: 'feed-toggle' },
            ul({ class: 'nav nav-pills outline-active' },
              api.token ? li({ class: 'nav-item' },
                a({ class: `nav-link ${tab.value === 'feed' ? 'active' : ''}`, href: '#', onClick: (e) => { e.preventDefault(); setTab('feed'); } }, 'Your Feed')
              ) : '',
              li({ class: 'nav-item' },
                a({ class: `nav-link ${tab.value === 'global' ? 'active' : ''}`, href: '#', onClick: (e) => { e.preventDefault(); setTab('global'); } }, 'Global Feed')
              ),
              selectedTag.value && selectedTag.value !== 'error loading tags' ? li({ class: 'nav-item' },
                a({ class: 'nav-link active' }, `# ${selectedTag.value}`)
              ) : ''
            )
          ),
          fetchError.value ? div({ class: 'article-preview' }, fetchError.value) :
          !articlesLoaded.value ? div({ class: 'article-preview' }, 'Loading articles...') :
          articles.value.length === 0 ? div({ class: 'article-preview' }, 'No articles are here... yet.') :
          articles.value.map(article => ArticlePreview({ article, key: article.slug }))
        ),
        div({ class: 'col-md-3' },
          div({ class: 'sidebar' },
            p('Popular Tags'),
            div({ class: 'tag-list' },
              tags.value.length === 0 && !tagsAttempted.value ? 'Loading tags...' :
              tags.value.map(tag =>
                a({ href: '#', class: 'tag-pill tag-default', onClick: (e) => { e.preventDefault(); if (tag !== 'error loading tags') setTab('tag', tag); } }, tag)
              )
            )
          )
        )
      )
    )
  );
});

const AuthForm = component(function AuthForm({ type, onAuth }) {
  const errors = signal.errors([]);
  const isSubmitting = signal.isSubmitting(false);

  const isLogin = type === 'login';
  const endpoint = isLogin ? '/users/login' : '/users';

  const handleSubmit = async (e) => {
    e.preventDefault();
    isSubmitting.value = true;
    errors.value = [];

    const formData = new FormData(e.target);
    const user = { email: formData.get('email'), password: formData.get('password') };
    if (!isLogin) user.username = formData.get('username');

    try {
      const data = await api.request(endpoint, 'POST', { user });
      api.setToken(data.user.token);
      onAuth(data.user);
      window.location.hash = '#/';
    } catch (err) {
      const errs = err.errors || {};
      errors.value = Object.keys(errs).map(k => `${k} ${errs[k]}`);
    } finally {
      isSubmitting.value = false;
    }
  };

  return div({ class: 'auth-page' },
    div({ class: 'container page' },
      div({ class: 'row' },
        div({ class: 'col-md-6 offset-md-3 col-xs-12' },
          h1({ class: 'text-xs-center' }, isLogin ? 'Sign in' : 'Sign up'),
          p({ class: 'text-xs-center' },
            a({ href: isLogin ? '#/register' : '#/login' }, isLogin ? 'Need an account?' : 'Have an account?')
          ),
          ul({ class: 'error-messages' }, errors.value.map(err => li(err))),
          form({ onSubmit: handleSubmit },
            !isLogin ? fieldset({ class: 'form-group' },
              input({ class: 'form-control form-control-lg', type: 'text', name: 'username', placeholder: 'Username', required: true })
            ) : '',
            fieldset({ class: 'form-group' },
              input({ class: 'form-control form-control-lg', type: 'email', name: 'email', placeholder: 'Email', required: true })
            ),
            fieldset({ class: 'form-group' },
              input({ class: 'form-control form-control-lg', type: 'password', name: 'password', placeholder: 'Password', required: true })
            ),
            button({ class: 'btn btn-lg btn-primary pull-xs-right', type: 'submit', disabled: isSubmitting.value }, isLogin ? 'Sign in' : 'Sign up')
          )
        )
      )
    )
  );
});

const Settings = component(function Settings({ user, onUpdate }) {
  const isSubmitting = signal.isSubmitting(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    isSubmitting.value = true;
    const formData = new FormData(e.target);
    const updates = {
      image: formData.get('image'), username: formData.get('username'),
      bio: formData.get('bio'), email: formData.get('email')
    };
    if (formData.get('password')) updates.password = formData.get('password');

    try {
      const data = await api.request('/user', 'PUT', { user: updates });
      onUpdate(data.user);
      window.location.hash = `#/profile/${data.user.username}`;
    } finally {
      isSubmitting.value = false;
    }
  };

  return div({ class: 'settings-page' },
    div({ class: 'container page' },
      div({ class: 'row' },
        div({ class: 'col-md-6 offset-md-3 col-xs-12' },
          h1({ class: 'text-xs-center' }, 'Your Settings'),
          form({ onSubmit: handleSubmit },
            fieldset({ class: 'form-group' }, input({ class: 'form-control', type: 'text', name: 'image', placeholder: 'URL of profile picture', value: user.image || '' })),
            fieldset({ class: 'form-group' }, input({ class: 'form-control form-control-lg', type: 'text', name: 'username', placeholder: 'Username', value: user.username })),
            fieldset({ class: 'form-group' }, textarea({ class: 'form-control form-control-lg', rows: '8', name: 'bio', placeholder: 'Short bio about you' }, user.bio || '')),
            fieldset({ class: 'form-group' }, input({ class: 'form-control form-control-lg', type: 'email', name: 'email', placeholder: 'Email', value: user.email })),
            fieldset({ class: 'form-group' }, input({ class: 'form-control form-control-lg', type: 'password', name: 'password', placeholder: 'New Password' })),
            button({ class: 'btn btn-lg btn-primary pull-xs-right', type: 'submit', disabled: isSubmitting.value }, 'Update Settings')
          )
        )
      )
    )
  );
});

const Editor = component(async function Editor({ slug }) {
  const isSubmitting = signal.isSubmitting(false);
  const article = signal.article({ title: '', description: '', body: '', tagList: [] });
  const loaded = signal.loaded(false);

  if (slug && !loaded.value) {
    try {
      const res = await api.request(`/articles/${slug}`);
      article.value = res.article;
    } catch(e) {}
    loaded.value = true;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    isSubmitting.value = true;
    const formData = new FormData(e.target);
    const updatedArticle = {
      title: formData.get('title'), description: formData.get('description'),
      body: formData.get('body'), tagList: formData.get('tags').split(',').map(t => t.trim()).filter(Boolean)
    };

    try {
      const reqSlug = slug ? `/${slug}` : '';
      const method = slug ? 'PUT' : 'POST';
      const data = await api.request(`/articles${reqSlug}`, method, { article: updatedArticle });
      window.location.hash = `#/article/${data.article.slug}`;
    } finally {
      isSubmitting.value = false;
    }
  };

  if (slug && !loaded.value) return div({ class: 'container page' }, 'Loading editor...');

  return div({ class: 'editor-page' },
    div({ class: 'container page' },
      div({ class: 'row' },
        div({ class: 'col-md-10 offset-md-1 col-xs-12' },
          form({ onSubmit: handleSubmit },
            fieldset({ class: 'form-group' }, input({ class: 'form-control form-control-lg', type: 'text', name: 'title', placeholder: 'Article Title', value: article.value.title, required: true })),
            fieldset({ class: 'form-group' }, input({ class: 'form-control', type: 'text', name: 'description', placeholder: "What's this article about?", value: article.value.description, required: true })),
            fieldset({ class: 'form-group' }, textarea({ class: 'form-control', rows: '8', name: 'body', placeholder: 'Write your article (in markdown)', required: true }, article.value.body)),
            fieldset({ class: 'form-group' }, input({ class: 'form-control', type: 'text', name: 'tags', placeholder: 'Enter tags (comma separated)', value: article.value.tagList.join(', ') })),
            button({ class: 'btn btn-lg pull-xs-right btn-primary', type: 'submit', disabled: isSubmitting.value }, 'Publish Article')
          )
        )
      )
    )
  );
});

const ArticlePage = component(async function ArticlePage({ slug, currentUser }) {
  const article = signal.article(null);
  const comments = signal.comments([]);
  const loaded = signal.loaded(false);

  if (!loaded.value) {
    try {
      const [artRes, comRes] = await Promise.all([
        api.request(`/articles/${slug}`),
        api.request(`/articles/${slug}/comments`)
      ]);
      article.value = artRes.article;
      comments.value = comRes.comments;
    } catch(e) {}
    loaded.value = true;
  }

  if (!article.value) return div({ class: 'container page' }, 'Loading article...');

  const art = article.value;
  const isAuthor = currentUser && currentUser.username === art.author.username;

  const handleComment = async (e) => {
    e.preventDefault();
    const body = new FormData(e.target).get('body');
    const { comment } = await api.request(`/articles/${slug}/comments`, 'POST', { comment: { body } });
    comments.value = [comment, ...comments.value];
    e.target.reset();
  };

  const handleDelete = async () => {
    await api.request(`/articles/${slug}`, 'DELETE');
    window.location.hash = '#/';
  };

  const ActionButtons = () => isAuthor ? span(
    a({ class: 'btn btn-outline-secondary btn-sm', href: `#/editor/${art.slug}` }, 'Edit Article'),
    ' ',
    button({ class: 'btn btn-outline-danger btn-sm', onClick: handleDelete }, 'Delete Article')
  ) : span('');

  return div({ class: 'article-page' },
    div({ class: 'banner' },
      div({ class: 'container' },
        h1(art.title),
        div({ class: 'article-meta' },
          a({ href: `#/profile/${art.author.username}` }, img({ src: art.author.image || 'https://api.realworld.io/images/smiley-cyrus.jpeg' })),
          div({ class: 'info' },
            a({ href: `#/profile/${art.author.username}`, class: 'author' }, art.author.username),
            span({ class: 'date' }, new Date(art.createdAt).toDateString())
          ),
          ActionButtons()
        )
      )
    ),
    div({ class: 'container page' },
      div({ class: 'row article-content' },
        div({ class: 'col-md-12' },
          p(art.body),
          ul({ class: 'tag-list' }, art.tagList.map(t => li({ class: 'tag-default tag-pill tag-outline' }, t)))
        )
      ),
      hr(),
      div({ class: 'row' },
        div({ class: 'col-xs-12 col-md-8 offset-md-2' },
          currentUser ? form({ class: 'card comment-form', onSubmit: handleComment },
            div({ class: 'card-block' }, textarea({ class: 'form-control', name: 'body', placeholder: 'Write a comment...', rows: '3', required: true })),
            div({ class: 'card-footer' },
              img({ src: currentUser.image || 'https://api.realworld.io/images/smiley-cyrus.jpeg', class: 'comment-author-img' }),
              button({ class: 'btn btn-sm btn-primary', type: 'submit' }, 'Post Comment')
            )
          ) : p(a({ href: '#/login' }, 'Sign in'), ' or ', a({ href: '#/register' }, 'sign up'), ' to add comments on this article.'),

          comments.value.map(c => div({ class: 'card' },
            div({ class: 'card-block' }, p({ class: 'card-text' }, c.body)),
            div({ class: 'card-footer' },
              a({ href: `#/profile/${c.author.username}`, class: 'comment-author' },
                img({ src: c.author.image || 'https://api.realworld.io/images/smiley-cyrus.jpeg', class: 'comment-author-img' })
              ),
              ' ', a({ href: `#/profile/${c.author.username}`, class: 'comment-author' }, c.author.username),
              span({ class: 'date-posted' }, new Date(c.createdAt).toDateString())
            )
          ))
        )
      )
    )
  );
});

const Profile = component(async function Profile({ username, currentUser }) {
  const profile = signal.profile(null);
  const articles = signal.articles([]);
  const tab = signal.tab('author');

  const profileLoaded = signal.profileLoaded(false);
  const articlesLoaded = signal.articlesLoaded(false);

  if (!profileLoaded.value) {
    try {
      const data = await api.request(`/profiles/${username}`);
      profile.value = data.profile;
    } catch(e) {}
    profileLoaded.value = true;
  }

  if (!articlesLoaded.value) {
    const endpoint = tab.value === 'author' ? `/articles?author=${username}` : `/articles?favorited=${username}`;
    try {
      const data = await api.request(endpoint);
      articles.value = data.articles;
    } catch(e) {}
    articlesLoaded.value = true;
  }

  if (!profile.value) return div({ class: 'profile-page' }, 'Loading profile...');

  const setTab = (newTab) => {
    tab.value = newTab;
    articlesLoaded.value = false;
  };

  const isSelf = currentUser && currentUser.username === username;

  return div({ class: 'profile-page' },
    div({ class: 'user-info' },
      div({ class: 'container' },
        div({ class: 'row' },
          div({ class: 'col-xs-12 col-md-10 offset-md-1' },
            img({ src: profile.value.image || 'https://api.realworld.io/images/smiley-cyrus.jpeg', class: 'user-img' }),
            h4(username),
            p(profile.value.bio),
            isSelf ? a({ class: 'btn btn-sm btn-outline-secondary action-btn', href: '#/settings' }, 'Edit Profile Settings') : ''
          )
        )
      )
    ),
    div({ class: 'container' },
      div({ class: 'row' },
        div({ class: 'col-xs-12 col-md-10 offset-md-1' },
          div({ class: 'articles-toggle' },
            ul({ class: 'nav nav-pills outline-active' },
              li({ class: 'nav-item' }, a({ class: `nav-link ${tab.value === 'author' ? 'active' : ''}`, href: '#', onClick: (e) => { e.preventDefault(); setTab('author'); } }, 'My Articles')),
              li({ class: 'nav-item' }, a({ class: `nav-link ${tab.value === 'favorites' ? 'active' : ''}`, href: '#', onClick: (e) => { e.preventDefault(); setTab('favorites'); } }, 'Favorited Articles'))
            )
          ),
          !articlesLoaded.value ? div({ class: 'article-preview' }, 'Loading articles...') :
          articles.value.length === 0 ? div({ class: 'article-preview' }, 'No articles are here... yet.') :
          articles.value.map(article => ArticlePreview({ article, key: article.slug }))
        )
      )
    )
  );
});

// MAIN APP SHELL & ROUTER
export const ConduitApp = component(async function ConduitApp() {
  const initialized = signal.initialized(false);
  const currentRoute = signal.route(globalThis.window ? window.location.hash || '#/' : '#/');
  const currentUser = signal.currentUser(null);

  if (!initialized.value) {
    if (globalThis.window) {
      window.addEventListener('hashchange', () => {
        currentRoute.value = window.location.hash || '#/';
      });
    }

    if (api.token && !currentUser.value) {
      try {
        const { user } = await api.request('/user');
        currentUser.value = user;
      } catch (e) {
        api.setToken(null);
      }
    }
    initialized.value = true;
  }

  const parts = currentRoute.value.replace('#', '').split('/');
  const route = parts[1] || '';
  const param = parts[2] || '';

  const handleAuth = (user) => { currentUser.value = user; };
  const handleLogout = (e) => {
    e.preventDefault();
    api.setToken(null);
    currentUser.value = null;
    window.location.hash = '#/';
  };

  // Routing Engine
  let activeView;
  if (route === 'login') activeView = AuthForm({ type: 'login', onAuth: handleAuth, key: 'login' });
  else if (route === 'register') activeView = AuthForm({ type: 'register', onAuth: handleAuth, key: 'register' });
  else if (route === 'settings') activeView = Settings({ user: currentUser.value, onUpdate: handleAuth, key: 'settings' });
  else if (route === 'editor') activeView = Editor({ slug: param, key: `editor-${param}` });
  else if (route === 'article') activeView = ArticlePage({ slug: param, currentUser: currentUser.value, key: `article-${param}` });
  else if (route === 'profile') activeView = Profile({ username: param, currentUser: currentUser.value, key: `profile-${param}` });
  else if (route === '') activeView = Home({ key: 'home' });
  else activeView = div({ class: 'container page' }, h1('404 Not Found'));

  const NavItem = (title, href, active, icon) => li({ class: 'nav-item' },
    a({ class: `nav-link ${active ? 'active' : ''}`, href }, icon ? span({ class: icon }, ' ') : '', title)
  );

  return div(
    nav({ class: 'navbar navbar-light' },
      div({ class: 'container' },
        a({ class: 'navbar-brand', href: '#/' }, 'conduit'),
        ul({ class: 'nav navbar-nav pull-xs-right' },
          NavItem('Home', '#/', route === ''),
          currentUser.value ? [
            NavItem('New Article', '#/editor', route === 'editor', 'ion-compose'),
            NavItem('Settings', '#/settings', route === 'settings', 'ion-gear-a'),
            li({ class: 'nav-item' },
              a({ class: 'nav-link', href: `#/profile/${currentUser.value.username}` },
                img({ src: currentUser.value.image || 'https://api.realworld.io/images/smiley-cyrus.jpeg', class: 'user-pic' }),
                currentUser.value.username
              )
            ),
            li({ class: 'nav-item' }, a({ class: 'nav-link', href: '#', onClick: handleLogout }, `Logout`))
          ] : [
            NavItem('Sign in', '#/login', route === 'login'),
            NavItem('Sign up', '#/register', route === 'register')
          ]
        )
      )
    ),
    activeView
  );
});

if (globalThis.window) {
  createRoot(ConduitApp);
}
