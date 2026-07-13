(() => {
  'use strict';

  const OWNER = 'nandurpm';
  const REPOSITORY = 'portfolio';
  const BRANCH = 'main';
  const TOKEN_KEY = 'portfolio-admin-token';
  const API_VERSION = '2022-11-28';
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

  const state = {
    token: sessionStorage.getItem(TOKEN_KEY) || '',
    activeType: 'blog',
    user: null
  };

  const loginPanel = document.querySelector('#loginPanel');
  const editorPanel = document.querySelector('#editorPanel');
  const loginForm = document.querySelector('#loginForm');
  const tokenInput = document.querySelector('#tokenInput');
  const loginStatus = document.querySelector('#loginStatus');
  const publishStatus = document.querySelector('#publishStatus');
  const accountLabel = document.querySelector('#accountLabel');
  const logoutButton = document.querySelector('#logoutButton');
  const previewFrame = document.querySelector('#previewFrame');
  const forms = [...document.querySelectorAll('.content-form')];

  function setStatus(element, message = '', type = '') {
    element.textContent = message;
    element.className = `status${type ? ` ${type}` : ''}`;
  }

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function slugify(value = '') {
    return String(value)
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  function formDataObject(form) {
    const data = new FormData(form);
    return Object.fromEntries([...data.entries()].filter(([, value]) => typeof value === 'string'));
  }

  function sanitizeBlogContent(html) {
    const documentValue = new DOMParser().parseFromString(`<div id="article-root">${html}</div>`, 'text/html');
    const root = documentValue.querySelector('#article-root');
    root.querySelectorAll('script, iframe, object, embed, form').forEach((element) => element.remove());
    root.querySelectorAll('*').forEach((element) => {
      [...element.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim().toLowerCase();
        if (name.startsWith('on') || value.startsWith('javascript:')) element.removeAttribute(attribute.name);
      });
    });
    return root.innerHTML.trim();
  }

  function imageExtension(file) {
    const byType = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif'
    };
    return byType[file.type] || file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Unable to read the selected image.'));
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.readAsDataURL(file);
    });
  }

  async function githubRequest(path, options = {}) {
    const response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${state.token}`,
        'X-GitHub-Api-Version': API_VERSION,
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      let detail = '';
      try {
        const payload = await response.json();
        detail = payload.message || '';
      } catch {
        detail = await response.text();
      }
      const error = new Error(detail || `GitHub request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) return null;
    return response.json();
  }

  function showEditor(user) {
    state.user = user;
    loginPanel.hidden = true;
    editorPanel.hidden = false;
    accountLabel.hidden = false;
    logoutButton.hidden = false;
    accountLabel.textContent = `@${user.login}`;
  }

  function showLogin() {
    state.user = null;
    state.token = '';
    sessionStorage.removeItem(TOKEN_KEY);
    loginPanel.hidden = false;
    editorPanel.hidden = true;
    accountLabel.hidden = true;
    logoutButton.hidden = true;
    tokenInput.value = '';
  }

  async function authenticate(token) {
    state.token = token.trim();
    if (!state.token) throw new Error('Enter a GitHub token.');
    const user = await githubRequest('/user');
    if (user.login.toLowerCase() !== OWNER.toLowerCase()) {
      throw new Error(`This dashboard accepts the ${OWNER} GitHub account only.`);
    }
    const repository = await githubRequest(`/repos/${OWNER}/${REPOSITORY}`);
    if (repository.permissions && !repository.permissions.push && !repository.permissions.admin) {
      throw new Error('The token does not have write access to this repository.');
    }
    sessionStorage.setItem(TOKEN_KEY, state.token);
    showEditor(user);
  }

  function siteHeader(active) {
    const item = (href, label, key) => `<a${active === key ? ' class="active" aria-current="page"' : ''} href="${href}">${label}</a>`;
    return `
      <header class="site-header glass">
        <a class="brand" href="../index.html" aria-label="Nandakumar M home"><span class="brand-mark">NM</span><span><strong>Nandakumar M</strong><small>Electrical &amp; Electronics Design Engineer</small></span></a>
        <button class="nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false"><span></span><span></span><span></span></button>
        <nav class="site-nav" aria-label="Main navigation">
          ${item('../index.html', 'Home', 'home')}
          ${item('../projects.html', 'Projects', 'projects')}
          ${item('../blog.html', 'Blog', 'blog')}
          ${item('../about.html', 'About', 'about')}
        </nav>
        <button class="theme-toggle" type="button" aria-label="Toggle dark and light theme"><span class="theme-icon" aria-hidden="true"></span></button>
      </header>`;
  }

  function siteFooter() {
    return `<footer class="site-footer"><p>&copy; <span data-year></span> Nandakumar M.</p><div><a href="mailto:nandakumarmkdpm@gmail.com">Email</a><a href="https://github.com/nandurpm" target="_blank" rel="noopener noreferrer">GitHub</a></div></footer>`;
  }

  function documentShell({ title, description, metadata, active, body }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="Nandakumar M">
${metadata}
  <title>${escapeHtml(title)} | Nandakumar M</title>
  <link rel="icon" href="../assets/images/logo.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/aos@2.3.1/dist/aos.css">
  <link rel="stylesheet" href="../assets/css/theme.css">
  <link rel="stylesheet" href="../assets/css/animations.css">
  <link rel="stylesheet" href="../assets/css/main.css">
</head>
<body>
  <div class="site-shell">
    ${siteHeader(active)}
    <main>${body}</main>
    ${siteFooter()}
  </div>
  <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
  <script src="../assets/js/theme.js"></script>
  <script src="../assets/js/main.js"></script>
</body>
</html>`;
  }

  function buildBlogDocument(values, imageName) {
    const content = sanitizeBlogContent(values.content);
    const metadata = `  <meta name="post-title" content="${escapeHtml(values.title)}">
  <meta name="post-slug" content="${escapeHtml(values.slug)}">
  <meta name="post-category" content="${escapeHtml(values.category)}">
  <meta name="post-date" content="${escapeHtml(values.date)}">
  <meta name="post-excerpt" content="${escapeHtml(values.excerpt)}">
  <meta name="post-tags" content="${escapeHtml(values.tags || '')}">
  <meta name="post-image" content="${escapeHtml(imageName)}">`;
    const body = `
      <article class="blog-article">
        <header class="article-header">
          <p class="eyebrow"><a href="../blog.html">← Back to Blog</a></p>
          <h1>${escapeHtml(values.title)}</h1>
          <div class="article-meta"><time datetime="${escapeHtml(values.date)}">${escapeHtml(values.date)}</time><span>${escapeHtml(values.category)}</span></div>
          <img src="../assets/images/blog/${escapeHtml(imageName)}" alt="${escapeHtml(values.title)}" class="article-image">
        </header>
        <div class="article-content">${content}</div>
        <footer class="article-footer"><a class="btn ghost" href="../blog.html">← Back to all posts</a></footer>
      </article>`;
    return documentShell({ title: values.title, description: values.excerpt, metadata, active: 'blog', body });
  }

  function buildProjectDocument(values, imageName) {
    const buttons = [
      values.demo ? `<a class="btn primary" href="${escapeHtml(values.demo)}" target="_blank" rel="noopener noreferrer">Open live project</a>` : '',
      values.github ? `<a class="btn ghost" href="${escapeHtml(values.github)}" target="_blank" rel="noopener noreferrer">View source</a>` : ''
    ].filter(Boolean).join('');
    const metadata = `  <meta name="project-title" content="${escapeHtml(values.title)}">
  <meta name="project-slug" content="${escapeHtml(values.slug)}">
  <meta name="project-category" content="${escapeHtml(values.category)}">
  <meta name="project-date" content="${escapeHtml(values.date)}">
  <meta name="project-description" content="${escapeHtml(values.description)}">
  <meta name="project-technologies" content="${escapeHtml(values.technologies || '')}">
  <meta name="project-image" content="${escapeHtml(imageName)}">
  <meta name="project-demo" content="${escapeHtml(values.demo || '')}">
  <meta name="project-github" content="${escapeHtml(values.github || '')}">`;
    const body = `
      <article class="blog-article">
        <header class="article-header">
          <p class="eyebrow"><a href="../projects.html">← Back to Projects</a></p>
          <h1>${escapeHtml(values.title)}</h1>
          <div class="article-meta"><time datetime="${escapeHtml(values.date)}">${escapeHtml(values.date)}</time><span>${escapeHtml(values.category)}</span></div>
          <img src="../assets/images/works/${escapeHtml(imageName)}" alt="${escapeHtml(values.title)}" class="article-image">
        </header>
        <div class="article-content"><p>${escapeHtml(values.description)}</p>${values.content}</div>
        ${buttons ? `<footer class="article-footer"><div class="button-row">${buttons}</div></footer>` : ''}
      </article>`;
    return documentShell({ title: values.title, description: values.description, metadata, active: 'projects', body });
  }

  function validateForm(form) {
    if (!form.reportValidity()) return null;
    const values = formDataObject(form);
    values.slug = slugify(values.slug || values.title);
    if (!values.slug) throw new Error('Enter a title that can produce a valid URL slug.');
    const image = form.elements.image.files[0];
    if (!image) throw new Error('Select a cover image.');
    if (image.size > MAX_IMAGE_BYTES) throw new Error('The cover image must be smaller than 8 MB.');
    return { values, image };
  }

  function createDocument(type, values, imageName) {
    return type === 'blog' ? buildBlogDocument(values, imageName) : buildProjectDocument(values, imageName);
  }

  async function commitUpload(files, message, attempt = 0) {
    const reference = await githubRequest(`/repos/${OWNER}/${REPOSITORY}/git/ref/heads/${encodeURIComponent(BRANCH)}`);
    const headSha = reference.object.sha;
    const commit = await githubRequest(`/repos/${OWNER}/${REPOSITORY}/git/commits/${headSha}`);

    const treeItems = [];
    for (const file of files) {
      const blob = await githubRequest(`/repos/${OWNER}/${REPOSITORY}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content: file.content, encoding: file.encoding })
      });
      treeItems.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
    }

    const tree = await githubRequest(`/repos/${OWNER}/${REPOSITORY}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: commit.tree.sha, tree: treeItems })
    });
    const nextCommit = await githubRequest(`/repos/${OWNER}/${REPOSITORY}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({ message, tree: tree.sha, parents: [headSha] })
    });

    try {
      await githubRequest(`/repos/${OWNER}/${REPOSITORY}/git/refs/heads/${encodeURIComponent(BRANCH)}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: nextCommit.sha, force: false })
      });
      return nextCommit;
    } catch (error) {
      if (attempt === 0 && [409, 422].includes(error.status)) return commitUpload(files, message, 1);
      throw error;
    }
  }

  async function publish(form) {
    const result = validateForm(form);
    if (!result) return;
    const { values, image } = result;
    const type = form.dataset.form;
    const extension = imageExtension(image);
    const imageName = `${values.slug}.${extension}`;
    const html = createDocument(type, values, imageName);
    const imageBase64 = await readFileAsBase64(image);
    const folder = type === 'blog' ? 'blog' : 'projects';
    const files = [
      { path: `uploads/${folder}/${values.slug}.html`, content: html, encoding: 'utf-8' },
      { path: `uploads/${folder}/${imageName}`, content: imageBase64, encoding: 'base64' }
    ];

    const publishButton = form.querySelector('.publish-button');
    publishButton.disabled = true;
    setStatus(publishStatus, 'Uploading to GitHub…');
    try {
      const commit = await commitUpload(files, `Upload ${type}: ${values.title}`);
      setStatus(publishStatus, `Uploaded successfully. Publishing workflow started from commit ${commit.sha.slice(0, 7)}.`, 'success');
    } catch (error) {
      setStatus(publishStatus, error.message, 'error');
      if (error.status === 401) showLogin();
    } finally {
      publishButton.disabled = false;
    }
  }

  function preview(form) {
    try {
      const result = validateForm(form);
      if (!result) return;
      const { values, image } = result;
      const imageName = `${values.slug}.${imageExtension(image)}`;
      const html = createDocument(form.dataset.form, values, imageName);
      const reader = new FileReader();
      reader.onload = () => {
        previewFrame.srcdoc = html.replace(`../assets/images/${form.dataset.form === 'blog' ? 'blog' : 'works'}/${imageName}`, String(reader.result));
      };
      reader.readAsDataURL(image);
      setStatus(publishStatus, 'Preview updated.');
    } catch (error) {
      setStatus(publishStatus, error.message, 'error');
    }
  }

  function activateTab(type) {
    state.activeType = type;
    document.querySelectorAll('.tab').forEach((tab) => {
      const active = tab.dataset.tab === type;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    forms.forEach((form) => { form.hidden = form.dataset.form !== type; });
    setStatus(publishStatus);
  }

  function setDefaults() {
    const today = new Date().toLocaleDateString('en-CA');
    forms.forEach((form) => {
      form.elements.date.value = today;
      const title = form.elements.title;
      const slug = form.elements.slug;
      title.addEventListener('input', () => {
        if (slug.dataset.edited !== 'true') slug.value = slugify(title.value);
      });
      slug.addEventListener('input', () => {
        slug.dataset.edited = slug.value ? 'true' : 'false';
        slug.value = slugify(slug.value);
      });
      form.querySelector('.preview-button').addEventListener('click', () => preview(form));
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        publish(form);
      });
    });
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector('button');
    button.disabled = true;
    setStatus(loginStatus, 'Checking GitHub access…');
    try {
      await authenticate(tokenInput.value);
      setStatus(loginStatus);
    } catch (error) {
      state.token = '';
      sessionStorage.removeItem(TOKEN_KEY);
      setStatus(loginStatus, error.message, 'error');
    } finally {
      button.disabled = false;
    }
  });

  logoutButton.addEventListener('click', showLogin);
  document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => activateTab(tab.dataset.tab)));

  setDefaults();
  activateTab('blog');

  if (state.token) {
    authenticate(state.token).catch(() => showLogin());
  }
})();
