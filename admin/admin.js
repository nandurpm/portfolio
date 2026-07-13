(() => {
  'use strict';

  const CONFIG = {
    owner: 'nandurpm',
    repository: 'portfolio',
    branch: 'main',
    siteUrl: 'https://nandakumarm.dpdns.org',
    githubClientId: '',
    ...(window.CONTENT_STUDIO_CONFIG || {})
  };

  const API_VERSION = '2022-11-28';
  const TOKEN_KEY = 'portfolio-studio-token';
  const OAUTH_CLIENT_KEY = 'portfolio-studio-oauth-client';
  const DRAFT_KEY = 'portfolio-studio-drafts-v2';
  const PREF_KEY = 'portfolio-studio-preferences-v2';
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
  const IS_LOCAL_DEMO = (['localhost', '127.0.0.1'].includes(location.hostname) || location.protocol === 'file:') && new URLSearchParams(location.search).get('demo') === '1';

  const BLOG_CATEGORIES = ['Technical Articles', 'Engineering', 'Current Affairs', 'Movie Reviews', 'Politics', 'Personal Writings'];
  const PROJECT_CATEGORIES = ['Web Development', 'Embedded Systems', 'Engineering Design', 'Electronics', 'Tools & Utilities'];

  const DEMO_POSTS = [
    { title: 'How I Think About Engineering Design Reviews', slug: 'engineering-design-reviews', category: 'Engineering', date: '2026-05-28', readTime: '4 min read', excerpt: 'A practical checklist for reviewing design intent and quality risk.', image: 'assets/images/blog/blog-1.jpg', tags: ['design', 'quality'], url: 'blog/engineering-design-reviews.html' },
    { title: 'Building a Fast Static Portfolio with GitHub Pages', slug: 'fast-static-portfolio', category: 'Technical Articles', date: '2026-05-21', readTime: '5 min read', excerpt: 'A reliable publishing approach using HTML, CSS and JavaScript.', image: 'assets/images/blog/blog-2.jpg', tags: ['github pages', 'html'], url: 'blog/fast-static-portfolio.html' },
    { title: 'Why Documentation Is a Professional Skill', slug: 'documentation-professional-skill', category: 'Technical Articles', date: '2026-03-31', readTime: '5 min read', excerpt: 'Good documentation reduces repeated mistakes and makes decisions easier to audit.', image: 'assets/images/blog/blog-6.jpg', tags: ['documentation'], url: 'blog/documentation-professional-skill.html' }
  ];
  const DEMO_PROJECTS = [
    { title: 'Diploma Notes', slug: 'diploma-notes', category: 'Web Development', date: '2026-06-02', description: 'A student-friendly study platform with syllabus and lesson sections.', image: 'assets/images/works/project-6.png', url: 'works/diploma-notes.html', technologies: ['HTML', 'CSS', 'JavaScript'] },
    { title: 'Smart Portfolio Dashboard', slug: 'smart-portfolio-dashboard', category: 'Web Development', date: '2026-05-18', description: 'A responsive portfolio dashboard with JSON-powered content.', image: 'assets/images/works/project-1.jpg', url: 'works/smart-portfolio-dashboard.html', technologies: ['HTML5', 'CSS3', 'JavaScript'] }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const defaultPreferences = {
    theme: 'dark',
    autosave: true,
    confirmPublish: true,
    compactTable: false
  };

  const state = {
    token: sessionStorage.getItem(TOKEN_KEY) || '',
    authMethod: '',
    user: null,
    activeView: 'dashboard',
    previousView: 'dashboard',
    libraryType: 'blog',
    posts: [],
    projects: [],
    media: [],
    workflowRuns: [],
    drafts: loadLocalJson(DRAFT_KEY, []),
    preferences: { ...defaultPreferences, ...loadLocalJson(PREF_KEY, {}) },
    editor: null,
    coverFile: null,
    coverObjectUrl: '',
    autosaveTimer: null,
    sourceMode: false,
    slugEdited: false,
    confirmResolver: null,
    devicePollCancelled: false
  };

  const el = {
    authScreen: $('#authScreen'),
    studioApp: $('#studioApp'),
    authStatus: $('#authStatus'),
    tokenLoginForm: $('#tokenLoginForm'),
    tokenInput: $('#tokenInput'),
    githubLoginButton: $('#githubLoginButton'),
    oauthClientId: $('#oauthClientId'),
    deviceFlowPanel: $('#deviceFlowPanel'),
    deviceCode: $('#deviceCode'),
    sidebar: $('#sidebar'),
    mobileScrim: $('#mobileScrim'),
    pageHeading: $('#pageHeading'),
    contentTable: $('#contentTable'),
    libraryEmpty: $('#libraryEmpty'),
    librarySearch: $('#librarySearch'),
    categoryFilter: $('#categoryFilter'),
    sortFilter: $('#sortFilter'),
    recentContentList: $('#recentContentList'),
    mediaGrid: $('#mediaGrid'),
    mediaEmpty: $('#mediaEmpty'),
    draftGrid: $('#draftGrid'),
    draftEmpty: $('#draftEmpty'),
    toastRegion: $('#toastRegion'),
    richEditor: $('#richEditor'),
    sourceEditor: $('#sourceEditor'),
    editorTitle: $('#editorTitle'),
    editorExcerpt: $('#editorExcerpt'),
    editorSlug: $('#editorSlug'),
    editorCategory: $('#editorCategory'),
    editorDate: $('#editorDate'),
    editorTags: $('#editorTags'),
    editorDemoUrl: $('#editorDemoUrl'),
    editorGithubUrl: $('#editorGithubUrl'),
    editorAltText: $('#editorAltText'),
    projectFields: $('#projectFields'),
    coverInput: $('#coverInput'),
    coverDropzone: $('#coverDropzone'),
    coverPreview: $('#coverPreview'),
    coverPlaceholder: $('#coverPlaceholder'),
    coverOverlay: $('#coverOverlay'),
    previewModal: $('#previewModal'),
    previewFrame: $('#previewFrame'),
    confirmModal: $('#confirmModal'),
    confirmTitle: $('#confirmTitle'),
    confirmMessage: $('#confirmMessage'),
    confirmAccept: $('#confirmAccept'),
    publishProgressModal: $('#publishProgressModal'),
    publishProgressText: $('#publishProgressText'),
    publishProgressBar: $('#publishProgressBar'),
    searchModal: $('#searchModal'),
    globalSearchInput: $('#globalSearchInput'),
    globalSearchResults: $('#globalSearchResults')
  };

  function loadLocalJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveLocalJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
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

  function decodeBase64Utf8(value) {
    const bytes = Uint8Array.from(atob(String(value).replace(/\n/g, '')), (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
    if (!value) return 'Not dated';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', options).format(date);
  }

  function relativeTime(value) {
    if (!value) return 'Just now';
    const date = new Date(value);
    const diff = Date.now() - date.getTime();
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`;
    return `${Math.floor(diff / 86_400_000)} days ago`;
  }

  function todayString() {
    return new Date().toLocaleDateString('en-CA');
  }

  function imageExtension(file) {
    const byType = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
    return byType[file.type] || file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Unable to read the selected file.'));
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.readAsDataURL(file);
    });
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Unable to preview the selected file.'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
  }

  function sanitizeContent(html) {
    const parsed = new DOMParser().parseFromString(`<div id="content-root">${html}</div>`, 'text/html');
    const root = parsed.querySelector('#content-root');
    root.querySelectorAll('script, iframe, object, embed, form, input, button, textarea, select, link, meta').forEach((node) => node.remove());
    root.querySelectorAll('*').forEach((node) => {
      [...node.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim().toLowerCase();
        if (name.startsWith('on') || value.startsWith('javascript:')) node.removeAttribute(attribute.name);
      });
    });
    return root.innerHTML.trim();
  }

  function plainTextFromHtml(html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    return (parsed.body.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function toast(title, message = '', type = 'success', timeout = 4200) {
    const node = document.createElement('div');
    node.className = `toast ${type}`;
    node.innerHTML = `<span>${icon(type === 'error' ? 'alert' : 'check')}</span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(message)}</small></div><button type="button" aria-label="Dismiss">${icon('close')}</button>`;
    const remove = () => {
      if (!node.isConnected) return;
      node.classList.add('leaving');
      setTimeout(() => node.remove(), 210);
    };
    $('button', node).addEventListener('click', remove);
    el.toastRegion.append(node);
    if (timeout) setTimeout(remove, timeout);
  }

  function setAuthStatus(message = '', type = '') {
    el.authStatus.textContent = message;
    el.authStatus.className = `status${type ? ` ${type}` : ''}`;
  }

  function openModal(node) {
    node.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeModal(node) {
    node.hidden = true;
    if (!$$('.modal:not([hidden])').length) document.body.classList.remove('modal-open');
  }

  function confirmAction({ title, message, confirmText = 'Continue', danger = false }) {
    el.confirmTitle.textContent = title;
    el.confirmMessage.textContent = message;
    el.confirmAccept.textContent = confirmText;
    el.confirmAccept.className = `button ${danger ? 'danger-soft' : 'primary'}`;
    $('.confirm-dialog', el.confirmModal).classList.toggle('danger', danger);
    openModal(el.confirmModal);
    return new Promise((resolve) => { state.confirmResolver = resolve; });
  }

  function resolveConfirm(value) {
    closeModal(el.confirmModal);
    if (state.confirmResolver) state.confirmResolver(value);
    state.confirmResolver = null;
  }

  async function githubRequest(path, options = {}) {
    if (IS_LOCAL_DEMO) throw new Error('GitHub requests are disabled in local demo mode.');
    const response = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${state.token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': API_VERSION,
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      let detail = '';
      try { detail = (await response.json()).message || ''; } catch { detail = await response.text(); }
      const error = new Error(detail || `GitHub request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    if (response.status === 204) return null;
    return response.json();
  }

  async function readRepoText(path) {
    const payload = await githubRequest(`/repos/${CONFIG.owner}/${CONFIG.repository}/contents/${encodeRepoPath(path)}?ref=${encodeURIComponent(CONFIG.branch)}`);
    return { text: decodeBase64Utf8(payload.content), sha: payload.sha };
  }

  async function readRepoJson(path, fallback = []) {
    try {
      const result = await readRepoText(path);
      return { value: JSON.parse(result.text), sha: result.sha };
    } catch (error) {
      if (error.status === 404) return { value: fallback, sha: '' };
      throw error;
    }
  }

  function encodeRepoPath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  async function commitFiles(files, message, attempt = 0) {
    if (IS_LOCAL_DEMO) {
      await sleep(850);
      return { sha: `demo${Date.now().toString(16)}` };
    }
    const reference = await githubRequest(`/repos/${CONFIG.owner}/${CONFIG.repository}/git/ref/heads/${encodeURIComponent(CONFIG.branch)}`);
    const headSha = reference.object.sha;
    const headCommit = await githubRequest(`/repos/${CONFIG.owner}/${CONFIG.repository}/git/commits/${headSha}`);
    const tree = [];
    for (const file of files) {
      if (file.delete) {
        tree.push({ path: file.path, mode: '100644', type: 'blob', sha: null });
        continue;
      }
      const blob = await githubRequest(`/repos/${CONFIG.owner}/${CONFIG.repository}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content: file.content, encoding: file.encoding || 'utf-8' })
      });
      tree.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const nextTree = await githubRequest(`/repos/${CONFIG.owner}/${CONFIG.repository}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: headCommit.tree.sha, tree })
    });
    const nextCommit = await githubRequest(`/repos/${CONFIG.owner}/${CONFIG.repository}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({ message, tree: nextTree.sha, parents: [headSha] })
    });
    try {
      await githubRequest(`/repos/${CONFIG.owner}/${CONFIG.repository}/git/refs/heads/${encodeURIComponent(CONFIG.branch)}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: nextCommit.sha, force: false })
      });
      return nextCommit;
    } catch (error) {
      if (attempt === 0 && [409, 422].includes(error.status)) return commitFiles(files, message, 1);
      throw error;
    }
  }

  async function authenticate(token, method = 'token') {
    state.token = String(token || '').trim();
    if (!state.token) throw new Error('Enter a valid GitHub credential.');
    const user = await githubRequest('/user');
    if (String(user.login).toLowerCase() !== String(CONFIG.owner).toLowerCase()) {
      throw new Error(`This studio accepts the @${CONFIG.owner} GitHub account only.`);
    }
    const repository = await githubRequest(`/repos/${CONFIG.owner}/${CONFIG.repository}`);
    const canPush = repository.permissions?.push || repository.permissions?.admin || repository.permissions?.maintain;
    if (!canPush) throw new Error('This credential does not have repository write access.');
    sessionStorage.setItem(TOKEN_KEY, state.token);
    state.authMethod = method;
    state.user = user;
    await enterStudio();
  }

  function signOut() {
    state.devicePollCancelled = true;
    state.token = '';
    state.user = null;
    sessionStorage.removeItem(TOKEN_KEY);
    el.studioApp.hidden = true;
    el.authScreen.hidden = false;
    el.tokenInput.value = '';
    el.deviceFlowPanel.hidden = true;
    setAuthStatus();
  }

  async function oauthPost(url, params) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params)
    });
    if (!response.ok) throw new Error(`GitHub sign-in failed (${response.status}).`);
    return response.json();
  }

  function getOAuthClientId() {
    return localStorage.getItem(OAUTH_CLIENT_KEY) || CONFIG.githubClientId || '';
  }

  async function startGitHubDeviceLogin() {
    const clientId = getOAuthClientId().trim();
    if (!clientId) {
      $('#oauthSetup').hidden = false;
      el.oauthClientId.focus();
      setAuthStatus('Add your GitHub OAuth Client ID to enable direct sign-in.', 'error');
      return;
    }
    state.devicePollCancelled = false;
    el.githubLoginButton.disabled = true;
    const authWindow = window.open('about:blank', 'github-device-auth');
    setAuthStatus('Requesting a GitHub verification code…');
    try {
      const device = await oauthPost('https://github.com/login/device/code', { client_id: clientId, scope: 'public_repo' });
      if (device.error) throw new Error(device.error_description || device.error);
      el.deviceCode.textContent = device.user_code;
      $('#openDeviceLogin').href = device.verification_uri || 'https://github.com/login/device';
      el.deviceFlowPanel.hidden = false;
      setAuthStatus('Approve access in GitHub. This page will connect automatically.');
      if (authWindow && !authWindow.closed) authWindow.location.href = device.verification_uri || 'https://github.com/login/device';
      let interval = Math.max(5, Number(device.interval) || 5);
      const expiresAt = Date.now() + (Number(device.expires_in) || 900) * 1000;
      while (!state.devicePollCancelled && Date.now() < expiresAt) {
        await sleep(interval * 1000);
        const result = await oauthPost('https://github.com/login/oauth/access_token', {
          client_id: clientId,
          device_code: device.device_code,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        });
        if (result.access_token) {
          setAuthStatus('GitHub approved. Opening the studio…', 'success');
          await authenticate(result.access_token, 'github');
          return;
        }
        if (result.error === 'authorization_pending') continue;
        if (result.error === 'slow_down') { interval += 5; continue; }
        if (result.error === 'access_denied') throw new Error('GitHub access was cancelled.');
        if (result.error === 'expired_token') throw new Error('The GitHub verification code expired. Try again.');
        if (result.error) throw new Error(result.error_description || result.error);
      }
      if (!state.devicePollCancelled) throw new Error('The GitHub verification code expired. Try again.');
    } catch (error) {
      if (authWindow && !authWindow.closed) authWindow.close();
      setAuthStatus(`${error.message} You can still use a fine-grained token below.`, 'error');
    } finally {
      el.githubLoginButton.disabled = false;
    }
  }

  async function enterStudio() {
    el.authScreen.hidden = true;
    el.studioApp.hidden = false;
    updateUserInterface();
    applyPreferences();
    switchView('dashboard');
    await loadStudioData();
    startAutosaveLoop();
  }

  function updateUserInterface() {
    const user = state.user || { login: CONFIG.owner, name: 'Nandakumar M', avatar_url: 'https://github.com/nandurpm.png' };
    $('#sidebarAvatar').src = user.avatar_url || `https://github.com/${user.login}.png`;
    $('#sidebarAvatar').alt = `${user.login} GitHub avatar`;
    $('#sidebarUserName').textContent = user.name || user.login;
    $('#sidebarUserLogin').textContent = `@${user.login}`;
    $('#connectionAccount').textContent = `Connected as @${user.login}`;
    $('#connectionPermission').textContent = `Write access verified via ${state.authMethod === 'github' ? 'GitHub sign-in' : 'access token'}`;
  }

  async function loadStudioData(showFeedback = false) {
    setSyncState('loading', 'Syncing with GitHub');
    try {
      if (IS_LOCAL_DEMO) {
        state.posts = [...DEMO_POSTS];
        state.projects = [...DEMO_PROJECTS];
        state.media = [];
        state.workflowRuns = [{ status: 'completed', conclusion: 'success', name: 'Publish uploaded content', updated_at: new Date().toISOString(), html_url: '#' }];
      } else {
        const [blog, projects, media, runs] = await Promise.all([
          readRepoJson('assets/data/blog.json', []),
          readRepoJson('assets/data/works.json', []),
          readRepoJson('assets/data/media.json', []),
          githubRequest(`/repos/${CONFIG.owner}/${CONFIG.repository}/actions/runs?branch=${encodeURIComponent(CONFIG.branch)}&per_page=8`).catch(() => ({ workflow_runs: [] }))
        ]);
        state.posts = Array.isArray(blog.value) ? blog.value : [];
        state.projects = Array.isArray(projects.value) ? projects.value : [];
        state.media = Array.isArray(media.value) ? media.value : [];
        state.workflowRuns = runs.workflow_runs || [];
      }
      normalizeContent();
      renderAll();
      setSyncState('success', 'GitHub synced');
      if (showFeedback) toast('Content refreshed', 'Latest repository data is loaded.');
    } catch (error) {
      setSyncState('error', 'Sync failed');
      toast('Unable to sync', error.message, 'error', 7000);
      if (error.status === 401) signOut();
    }
  }

  function normalizeContent() {
    state.posts = state.posts.map((item) => ({
      ...item,
      slug: item.slug || slugFromUrl(item.url) || slugify(item.title),
      type: 'blog',
      summary: item.excerpt || '',
      tags: Array.isArray(item.tags) ? item.tags : []
    }));
    state.projects = state.projects.map((item) => ({
      ...item,
      slug: item.slug || slugFromUrl(item.url) || slugify(item.title),
      type: 'project',
      summary: item.description || '',
      tags: Array.isArray(item.technologies) ? item.technologies : [],
      date: item.date || ''
    }));
  }

  function slugFromUrl(url = '') {
    return String(url).split('/').pop()?.replace(/\.html?$/i, '') || '';
  }

  function setSyncState(type, text) {
    const dot = $('#syncDot');
    dot.className = type === 'success' ? 'success' : type === 'error' ? 'error' : '';
    $('#syncText').textContent = text;
  }

  function renderAll() {
    const combinedMedia = getCombinedMedia();
    $('#postCountBadge').textContent = state.posts.length;
    $('#projectCountBadge').textContent = state.projects.length;
    $('#draftCountBadge').textContent = state.drafts.length;
    $('#dashboardPostCount').textContent = state.posts.length;
    $('#dashboardProjectCount').textContent = state.projects.length;
    $('#dashboardDraftCount').textContent = state.drafts.length;
    $('#dashboardMediaCount').textContent = combinedMedia.length;
    const latestPost = [...state.posts].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    $('#lastPostDate').textContent = latestPost ? `Latest ${formatDate(latestPost.date, { day: 'numeric', month: 'short' })}` : 'No posts yet';
    renderWelcome();
    renderRecentContent();
    renderPipeline();
    renderLibrary();
    renderMedia();
    renderDrafts();
  }

  function renderWelcome() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    $('#welcomeTitle').textContent = `${greeting}, ${state.user?.name?.split(' ')[0] || 'Nandakumar'}`;
  }

  function getAllContent() {
    return [...state.posts, ...state.projects];
  }

  function renderRecentContent() {
    const items = getAllContent()
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 6);
    el.recentContentList.innerHTML = items.length ? items.map((item) => `
      <button class="recent-item" type="button" data-edit-type="${item.type}" data-edit-slug="${escapeHtml(item.slug)}">
        <img class="recent-thumb" src="../${escapeHtml(item.image || '')}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
        <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category || 'Uncategorized')} · ${formatDate(item.date)}</small></span>
        <span class="recent-type">${item.type === 'blog' ? 'Post' : 'Project'}</span>
      </button>`).join('') : '<div class="empty-state"><p>No published content yet.</p></div>';
  }

  function renderPipeline() {
    const run = state.workflowRuns[0];
    const orb = $('.pipeline-orb');
    orb.className = 'pipeline-orb';
    if (!run) {
      $('#pipelineStatus strong').textContent = 'No workflow runs';
      $('#pipelineStatus small').textContent = 'Publish content to start the pipeline.';
      return;
    }
    const running = run.status !== 'completed';
    const success = run.conclusion === 'success';
    orb.classList.add(running ? 'running' : success ? 'success' : 'failure');
    orb.innerHTML = icon(running ? 'refresh' : success ? 'check' : 'alert');
    $('#pipelineStatus strong').textContent = running ? 'Publishing in progress' : success ? 'Last publish succeeded' : 'Last publish failed';
    $('#pipelineStatus small').textContent = `${run.name || 'GitHub Actions'} · ${relativeTime(run.updated_at || run.created_at)}`;
    $('#pipelineBuildStep').classList.toggle('done', success || running);
    $('#pipelineDeployStep').classList.toggle('done', success);
  }

  function libraryItems() {
    return state.libraryType === 'blog' ? state.posts : state.projects;
  }

  function renderLibrary() {
    const query = el.librarySearch.value.trim().toLowerCase();
    const category = el.categoryFilter.value;
    const sort = el.sortFilter.value;
    let items = [...libraryItems()];
    if (query) items = items.filter((item) => [item.title, item.category, item.summary, ...(item.tags || [])].join(' ').toLowerCase().includes(query));
    if (category) items = items.filter((item) => item.category === category);
    items.sort((a, b) => {
      if (sort === 'title') return String(a.title).localeCompare(String(b.title));
      if (sort === 'oldest') return String(a.date || '').localeCompare(String(b.date || ''));
      return String(b.date || '').localeCompare(String(a.date || ''));
    });

    const categories = [...new Set(libraryItems().map((item) => item.category).filter(Boolean))].sort();
    const previousCategory = el.categoryFilter.value;
    el.categoryFilter.innerHTML = '<option value="">All categories</option>' + categories.map((value) => `<option${value === previousCategory ? ' selected' : ''}>${escapeHtml(value)}</option>`).join('');

    el.contentTable.innerHTML = items.map((item) => `
      <article class="content-row" data-content-type="${item.type}" data-content-slug="${escapeHtml(item.slug)}">
        <div class="content-main">
          <img src="../${escapeHtml(item.image || '')}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
          <div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml((item.summary || '').slice(0, 96))}</small></div>
        </div>
        <span class="content-category">${escapeHtml(item.category || 'Uncategorized')}</span>
        <time class="content-date">${formatDate(item.date)}</time>
        <span class="status-pill">Published</span>
        <div class="row-menu-wrap">
          <button class="icon-button row-menu-button" type="button" aria-label="Content actions">${icon('more')}</button>
          <div class="row-menu" hidden>
            <button type="button" data-row-action="edit">${icon('edit')}Edit</button>
            <a href="../${escapeHtml(item.url || '')}" target="_blank" rel="noopener noreferrer">${icon('external')}Open page</a>
            <button class="danger" type="button" data-row-action="delete">${icon('trash')}Delete</button>
          </div>
        </div>
      </article>`).join('');
    el.libraryEmpty.hidden = items.length > 0;
  }

  function getCombinedMedia() {
    const map = new Map();
    for (const item of [...state.posts, ...state.projects]) {
      if (!item.image) continue;
      map.set(item.image, { path: item.image, name: item.image.split('/').pop(), source: 'Published content', used: true });
    }
    for (const item of state.media) {
      if (!item.path) continue;
      map.set(item.path, { ...item, source: item.source || 'Media library', used: map.has(item.path) });
    }
    return [...map.values()];
  }

  function renderMedia() {
    const media = getCombinedMedia();
    el.mediaGrid.innerHTML = media.map((item) => `
      <article class="media-card" data-media-path="${escapeHtml(item.path)}">
        <div class="media-card-image"><img src="../${escapeHtml(item.path)}" alt="" loading="lazy"></div>
        <div class="media-card-body"><div><strong>${escapeHtml(item.name || item.path.split('/').pop())}</strong><small>${escapeHtml(item.source || 'Media library')}</small></div><button class="icon-button" type="button" data-copy-media aria-label="Copy media path">${icon('copy')}</button></div>
      </article>`).join('');
    el.mediaEmpty.hidden = media.length > 0;
  }

  function renderDrafts() {
    state.drafts.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    el.draftGrid.innerHTML = state.drafts.map((draft) => `
      <article class="draft-card" data-draft-id="${escapeHtml(draft.id)}">
        <div class="draft-card-top"><span class="draft-kind">${draft.type === 'blog' ? 'Blog post' : 'Project'}</span><span>${icon('more')}</span></div>
        <h3>${escapeHtml(draft.title || 'Untitled')}</h3>
        <p>${escapeHtml((draft.excerpt || plainTextFromHtml(draft.content || '') || 'Empty draft').slice(0, 120))}</p>
        <div class="draft-meta"><span>${relativeTime(draft.updatedAt)}</span><div class="draft-actions"><button type="button" data-draft-action="edit">Open</button><button class="danger" type="button" data-draft-action="delete">Delete</button></div></div>
      </article>`).join('');
    el.draftEmpty.hidden = state.drafts.length > 0;
    $('#draftCountBadge').textContent = state.drafts.length;
    $('#dashboardDraftCount').textContent = state.drafts.length;
  }

  function switchView(view) {
    if (view !== 'editor') state.previousView = view;
    state.activeView = view;
    $$('.app-view').forEach((panel) => panel.classList.remove('active'));
    const panelName = ['posts', 'projects'].includes(view) ? 'library' : view;
    $(`[data-view-panel="${panelName}"]`)?.classList.add('active');
    $$('.nav-item[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
    const meta = {
      dashboard: ['Overview', 'Manage your portfolio content.'],
      posts: ['Blog posts', 'Create, edit and publish articles.'],
      projects: ['Projects', 'Manage public portfolio projects.'],
      media: ['Media', 'Browse and upload reusable images.'],
      drafts: ['Drafts', 'Private drafts saved in this browser.'],
      settings: ['Settings', 'GitHub connection and editor preferences.'],
      editor: ['Editor', 'Create and publish content.']
    }[view];
    el.pageHeading.innerHTML = `<h1>${meta[0]}</h1><p>${meta[1]}</p>`;
    if (view === 'posts' || view === 'projects') {
      state.libraryType = view === 'posts' ? 'blog' : 'project';
      el.librarySearch.value = '';
      el.categoryFilter.value = '';
      $('#libraryCreateButton span').textContent = state.libraryType === 'blog' ? 'New post' : 'New project';
      renderLibrary();
    }
    closeSidebar();
  }

  function openSidebar() {
    el.sidebar.classList.add('open');
    el.mobileScrim.hidden = false;
  }

  function closeSidebar() {
    el.sidebar.classList.remove('open');
    el.mobileScrim.hidden = true;
  }

  function setEditorType(type, resetCategory = true) {
    state.editor.type = type;
    $$('#typeSwitch button').forEach((button) => button.classList.toggle('active', button.dataset.type === type));
    el.projectFields.hidden = type !== 'project';
    const categories = type === 'blog' ? BLOG_CATEGORIES : PROJECT_CATEGORIES;
    const current = el.editorCategory.value;
    el.editorCategory.innerHTML = categories.map((category) => `<option>${escapeHtml(category)}</option>`).join('');
    if (!resetCategory && categories.includes(current)) el.editorCategory.value = current;
    $('.slug-field span').textContent = type === 'blog' ? '/blog/' : '/works/';
    el.editorTags.placeholder = type === 'blog' ? 'engineering, design, learning' : 'HTML, CSS, JavaScript';
    updateEditorMetrics();
  }

  function newEditor(type = 'blog') {
    state.coverFile = null;
    state.slugEdited = false;
    state.sourceMode = false;
    state.editor = {
      id: `draft-${Date.now()}`,
      type,
      originalSlug: '',
      existingImage: '',
      existingUrl: '',
      isPublished: false,
      dirty: false
    };
    clearCoverPreview();
    el.editorTitle.value = '';
    el.editorExcerpt.value = '';
    el.editorSlug.value = '';
    el.editorDate.value = todayString();
    el.editorTags.value = '';
    el.editorDemoUrl.value = '';
    el.editorGithubUrl.value = '';
    el.editorAltText.value = '';
    el.richEditor.innerHTML = '';
    el.sourceEditor.value = '';
    setEditorType(type);
    setSourceMode(false);
    setEditorSaveState('New draft', 'Not saved yet', false);
    switchView('editor');
    setTimeout(() => el.editorTitle.focus(), 80);
  }

  async function editPublished(type, slug) {
    const item = (type === 'blog' ? state.posts : state.projects).find((entry) => entry.slug === slug);
    if (!item) return;
    toast('Loading editor', item.title, 'success', 1600);
    try {
      let values;
      if (IS_LOCAL_DEMO) {
        values = {
          title: item.title,
          excerpt: item.summary,
          slug: item.slug,
          category: item.category,
          date: item.date || todayString(),
          tags: (item.tags || []).join(', '),
          content: `<h2>Overview</h2><p>${escapeHtml(item.summary || '')}</p><p>Continue editing this content in the studio.</p>`,
          demo: item.demo || '',
          github: item.github || '',
          alt: item.title
        };
      } else if (item.url) {
        const page = await readRepoText(item.url);
        values = parsePublishedPage(page.text, type, item);
      } else {
        values = {
          title: item.title,
          excerpt: item.summary || item.description || '',
          slug: item.slug,
          category: item.category,
          date: item.date || todayString(),
          tags: (item.tags || item.technologies || []).join(', '),
          content: item.summary || item.description
            ? `<h2>Overview</h2><p>${escapeHtml(item.summary || item.description)}</p>`
            : '<h2>Overview</h2><p></p>',
          demo: item.demo || '',
          github: item.github || '',
          alt: item.title
        };
      }
      state.coverFile = null;
      state.slugEdited = true;
      state.sourceMode = false;
      state.editor = {
        id: `${type}:${item.slug}`,
        type,
        originalSlug: item.slug,
        existingImage: item.image || '',
        existingUrl: item.url || '',
        isPublished: true,
        dirty: false
      };
      el.editorTitle.value = values.title;
      el.editorExcerpt.value = values.excerpt;
      el.editorSlug.value = values.slug;
      el.editorDate.value = values.date || todayString();
      el.editorTags.value = values.tags;
      el.editorDemoUrl.value = values.demo;
      el.editorGithubUrl.value = values.github;
      el.editorAltText.value = values.alt || values.title;
      el.richEditor.innerHTML = values.content;
      el.sourceEditor.value = values.content;
      setEditorType(type);
      if ([...el.editorCategory.options].some((option) => option.value === values.category)) el.editorCategory.value = values.category;
      setCoverPreview(`../${item.image}`, item.image);
      setSourceMode(false);
      setEditorSaveState('Published content', 'Loaded from GitHub', true);
      switchView('editor');
      updateEditorMetrics();
    } catch (error) {
      toast('Unable to open content', error.message, 'error', 7000);
    }
  }

  function parsePublishedPage(html, type, fallback) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const meta = (name) => parsed.querySelector(`meta[name="${name}"]`)?.content || '';
    const prefix = type === 'blog' ? 'post' : 'project';
    const contentNode = parsed.querySelector('.article-content');
    let content = contentNode?.innerHTML.trim() || '';
    const excerpt = type === 'blog' ? meta('post-excerpt') || fallback.excerpt : meta('project-description') || fallback.description;
    if (type === 'project' && contentNode?.firstElementChild?.tagName === 'P' && contentNode.firstElementChild.textContent.trim() === excerpt.trim()) {
      contentNode.firstElementChild.remove();
      content = contentNode.innerHTML.trim();
    }
    return {
      title: meta(`${prefix}-title`) || fallback.title,
      slug: meta(`${prefix}-slug`) || fallback.slug,
      category: meta(`${prefix}-category`) || fallback.category,
      date: meta(`${prefix}-date`) || fallback.date || todayString(),
      excerpt,
      tags: meta(type === 'blog' ? 'post-tags' : 'project-technologies') || (fallback.tags || []).join(', '),
      content,
      demo: meta('project-demo') || fallback.demo || '',
      github: meta('project-github') || fallback.github || '',
      alt: parsed.querySelector('.article-image')?.alt || fallback.title
    };
  }

  function openDraft(id) {
    const draft = state.drafts.find((item) => item.id === id);
    if (!draft) return;
    state.coverFile = null;
    state.slugEdited = Boolean(draft.slug);
    state.sourceMode = false;
    state.editor = {
      id: draft.id,
      type: draft.type,
      originalSlug: draft.originalSlug || '',
      existingImage: draft.existingImage || '',
      existingUrl: draft.existingUrl || '',
      isPublished: Boolean(draft.isPublished),
      dirty: false
    };
    el.editorTitle.value = draft.title || '';
    el.editorExcerpt.value = draft.excerpt || '';
    el.editorSlug.value = draft.slug || '';
    el.editorDate.value = draft.date || todayString();
    el.editorTags.value = draft.tags || '';
    el.editorDemoUrl.value = draft.demo || '';
    el.editorGithubUrl.value = draft.github || '';
    el.editorAltText.value = draft.alt || '';
    el.richEditor.innerHTML = draft.content || '';
    el.sourceEditor.value = draft.content || '';
    setEditorType(draft.type);
    if ([...el.editorCategory.options].some((option) => option.value === draft.category)) el.editorCategory.value = draft.category;
    if (draft.existingImage) setCoverPreview(`../${draft.existingImage}`, draft.existingImage); else clearCoverPreview();
    setSourceMode(false);
    setEditorSaveState('Saved draft', `Saved ${relativeTime(draft.updatedAt)}`, true);
    switchView('editor');
    updateEditorMetrics();
  }

  function serializeEditor() {
    if (!state.editor) return null;
    return {
      id: state.editor.id,
      type: state.editor.type,
      originalSlug: state.editor.originalSlug,
      existingImage: state.editor.existingImage,
      existingUrl: state.editor.existingUrl,
      isPublished: state.editor.isPublished,
      title: el.editorTitle.value.trim(),
      excerpt: el.editorExcerpt.value.trim(),
      slug: slugify(el.editorSlug.value || el.editorTitle.value),
      category: el.editorCategory.value,
      date: el.editorDate.value,
      tags: el.editorTags.value.trim(),
      content: getEditorContent(),
      demo: el.editorDemoUrl.value.trim(),
      github: el.editorGithubUrl.value.trim(),
      alt: el.editorAltText.value.trim(),
      updatedAt: new Date().toISOString()
    };
  }

  function saveCurrentDraft(manual = false) {
    if (!state.editor || state.activeView !== 'editor') return;
    const draft = serializeEditor();
    const hasContent = draft.title || draft.excerpt || plainTextFromHtml(draft.content);
    if (!hasContent) {
      if (manual) toast('Nothing to save', 'Add a title or some content first.', 'error');
      return;
    }
    const index = state.drafts.findIndex((item) => item.id === draft.id);
    if (index >= 0) state.drafts[index] = draft; else state.drafts.unshift(draft);
    saveLocalJson(DRAFT_KEY, state.drafts);
    state.editor.dirty = false;
    setEditorSaveState('Draft saved', `Saved ${relativeTime(draft.updatedAt)}`, true);
    renderDrafts();
    if (manual) toast('Draft saved', 'Stored privately in this browser.');
  }

  function removeDraft(id) {
    state.drafts = state.drafts.filter((draft) => draft.id !== id);
    saveLocalJson(DRAFT_KEY, state.drafts);
    renderDrafts();
  }

  function startAutosaveLoop() {
    clearInterval(state.autosaveTimer);
    state.autosaveTimer = setInterval(() => {
      if (state.preferences.autosave && state.editor?.dirty && state.activeView === 'editor') saveCurrentDraft(false);
    }, 5000);
  }

  function markEditorDirty() {
    if (!state.editor) return;
    state.editor.dirty = true;
    setEditorSaveState(state.editor.isPublished ? 'Unsaved changes' : 'Editing draft', 'Autosave pending', false);
    updateEditorMetrics();
  }

  function setEditorSaveState(title, subtitle, saved) {
    $('#editorStateLabel').textContent = title;
    $('#autosaveLabel').textContent = subtitle;
    $('#editorStatusDot').classList.toggle('saved', saved);
  }

  function getEditorContent() {
    return sanitizeContent(state.sourceMode ? el.sourceEditor.value : el.richEditor.innerHTML);
  }

  function setSourceMode(enabled) {
    state.sourceMode = enabled;
    $('#sourceModeButton').classList.toggle('active', enabled);
    if (enabled) {
      el.sourceEditor.value = sanitizeContent(el.richEditor.innerHTML);
      el.sourceEditor.hidden = false;
      el.richEditor.hidden = true;
    } else {
      if (!el.sourceEditor.hidden) el.richEditor.innerHTML = sanitizeContent(el.sourceEditor.value);
      el.sourceEditor.hidden = true;
      el.richEditor.hidden = false;
    }
    updateEditorMetrics();
  }

  function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 44), 180)}px`;
  }

  function updateEditorMetrics() {
    if (!state.editor) return;
    const content = getEditorContent();
    const text = plainTextFromHtml(content);
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const chars = text.length;
    $('#wordCount').textContent = `${words} word${words === 1 ? '' : 's'}`;
    $('#readTime').textContent = `${Math.max(1, Math.ceil(words / 200))} min read`;
    $('#characterCount').textContent = `${chars} character${chars === 1 ? '' : 's'}`;
    const slug = slugify(el.editorSlug.value || el.editorTitle.value) || 'untitled';
    const folder = state.editor.type === 'blog' ? 'blog' : 'works';
    $('#seoPreviewTitle').textContent = `${el.editorTitle.value.trim() || 'Untitled'} | Nandakumar M`;
    $('#seoPreviewUrl').textContent = `nandakumarm.dpdns.org/${folder}/${slug}.html`;
    $('#seoPreviewDescription').textContent = el.editorExcerpt.value.trim() || 'Add a summary to preview the search description.';
    $('#publishDestination').textContent = `${folder}/${slug}.html`;
    $('.slug-field span').textContent = `/${folder}/`;
    updateSeoScore(words);
    updatePublishReadiness();
    autoResizeTextarea(el.editorTitle);
    autoResizeTextarea(el.editorExcerpt);
  }

  function updateSeoScore(words) {
    const title = el.editorTitle.value.trim();
    const excerpt = el.editorExcerpt.value.trim();
    const slug = slugify(el.editorSlug.value);
    const checks = [
      { pass: title.length >= 20 && title.length <= 65, text: 'Title is between 20 and 65 characters.' },
      { pass: excerpt.length >= 80 && excerpt.length <= 180, text: 'Summary is between 80 and 180 characters.' },
      { pass: Boolean(slug) && slug.length <= 70, text: 'URL slug is clear and readable.' },
      { pass: words >= 150, text: 'Content contains at least 150 words.' },
      { pass: Boolean(state.coverFile || state.editor.existingImage), text: 'A cover image is selected.' },
      { pass: Boolean(el.editorAltText.value.trim()), text: 'Cover image has alternative text.' }
    ];
    const score = Math.round((checks.filter((check) => check.pass).length / checks.length) * 100);
    $('#seoScore').textContent = score;
    $('.score-ring').style.setProperty('--score', `${score}%`);
    $('#seoLabel').textContent = score >= 85 ? 'Excellent' : score >= 65 ? 'Good foundation' : 'Needs work';
    $('#seoSummary').textContent = score >= 85 ? 'Ready for search and social sharing.' : 'Complete the remaining checks.';
    $('#seoChecklist').innerHTML = checks.map((check) => `<li class="${check.pass ? 'pass' : ''}"><span>${icon(check.pass ? 'check' : 'close')}</span>${escapeHtml(check.text)}</li>`).join('');
  }

  function validateEditor(showMessage = false) {
    const content = getEditorContent();
    const values = serializeEditor();
    const errors = [];
    if (!values.title) errors.push('Add a title.');
    if (!values.slug) errors.push('Add a valid URL slug.');
    if (!values.category) errors.push('Choose a category.');
    if (!values.date) errors.push('Choose a publication date.');
    if (!values.excerpt) errors.push(state.editor.type === 'blog' ? 'Add a post summary.' : 'Add a project summary.');
    if (!plainTextFromHtml(content)) errors.push('Add page content.');
    if (!state.coverFile && !state.editor.existingImage) errors.push('Add a cover image.');
    if (state.coverFile && state.coverFile.size > MAX_IMAGE_BYTES) errors.push('Cover image must be smaller than 8 MB.');
    if (showMessage && errors.length) toast('Content is not ready', errors[0], 'error');
    return { valid: errors.length === 0, errors, values: { ...values, content } };
  }

  function updatePublishReadiness() {
    const result = validateEditor(false);
    const box = $('.publish-check');
    box.classList.toggle('ready', result.valid);
    $('#publishReadyIcon').innerHTML = icon(result.valid ? 'check' : 'alert');
    $('#publishReadyTitle').textContent = result.valid ? 'Ready to publish' : 'Complete required fields';
    $('#publishReadyText').textContent = result.valid ? 'All required content and media are present.' : result.errors[0] || 'The studio will check your content before publishing.';
  }

  async function setCoverFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Invalid image', 'Choose a JPG, PNG, WebP or GIF file.', 'error');
    if (file.size > MAX_IMAGE_BYTES) return toast('Image is too large', 'The maximum cover image size is 8 MB.', 'error');
    state.coverFile = file;
    if (state.coverObjectUrl) URL.revokeObjectURL(state.coverObjectUrl);
    state.coverObjectUrl = URL.createObjectURL(file);
    setCoverPreview(state.coverObjectUrl, 'New upload');
    if (!el.editorAltText.value.trim()) el.editorAltText.value = el.editorTitle.value.trim();
    markEditorDirty();
  }

  function setCoverPreview(src, label = '') {
    el.coverPreview.src = src;
    el.coverPreview.hidden = false;
    el.coverPlaceholder.hidden = true;
    el.coverOverlay.hidden = false;
    el.coverDropzone.dataset.imagePath = label;
  }

  function clearCoverPreview() {
    if (state.coverObjectUrl) URL.revokeObjectURL(state.coverObjectUrl);
    state.coverObjectUrl = '';
    el.coverPreview.removeAttribute('src');
    el.coverPreview.hidden = true;
    el.coverPlaceholder.hidden = false;
    el.coverOverlay.hidden = true;
    delete el.coverDropzone.dataset.imagePath;
  }

  function siteHeader(active) {
    const item = (href, label, key) => `<a${active === key ? ' class="active" aria-current="page"' : ''} href="${href}">${label}</a>`;
    return `<header class="site-header glass"><a class="brand" href="../index.html" aria-label="Nandakumar M home"><span class="brand-mark">NM</span><span><strong>Nandakumar M</strong><small>Electrical &amp; Electronics Design Engineer</small></span></a><button class="nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false"><span></span><span></span><span></span></button><nav class="site-nav" aria-label="Main navigation">${item('../index.html','Home','home')}${item('../projects.html','Projects','projects')}${item('../blog.html','Blog','blog')}${item('../about.html','About','about')}</nav><button class="theme-toggle" type="button" aria-label="Toggle dark and light theme"><span class="theme-icon" aria-hidden="true"></span></button></header>`;
  }

  function siteFooter() {
    return `<footer class="site-footer"><p>&copy; <span data-year></span> Nandakumar M.</p><div><a href="mailto:nandakumarmkdpm@gmail.com">Email</a><a href="https://github.com/nandurpm" target="_blank" rel="noopener noreferrer">GitHub</a></div></footer>`;
  }

  function jsonLd(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c');
  }

  function documentShell({ title, description, metadata, active, body, canonical, image, schema }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="author" content="Nandakumar M">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
${metadata}
  <script type="application/ld+json">${jsonLd(schema)}</script>
  <title>${escapeHtml(title)} | Nandakumar M</title>
  <link rel="icon" href="../assets/images/logo.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
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
  <script src="../assets/js/theme.js"></script>
  <script src="../assets/js/main.js"></script>
</body>
</html>`;
  }

  function buildContentDocument(values, imageMeta, imageDisplaySrc) {
    const type = state.editor.type;
    const isBlog = type === 'blog';
    const folder = isBlog ? 'blog' : 'works';
    const canonical = `${CONFIG.siteUrl}/${folder}/${values.slug}.html`;
    const publicImage = imageMeta.startsWith('assets/') ? `${CONFIG.siteUrl}/${imageMeta}` : `${CONFIG.siteUrl}/assets/images/${isBlog ? 'blog' : 'works'}/${imageMeta}`;
    const tags = values.tags.split(',').map((item) => item.trim()).filter(Boolean);
    const content = sanitizeContent(values.content);
    const metadata = isBlog ? `  <meta name="post-title" content="${escapeHtml(values.title)}">
  <meta name="post-slug" content="${escapeHtml(values.slug)}">
  <meta name="post-category" content="${escapeHtml(values.category)}">
  <meta name="post-date" content="${escapeHtml(values.date)}">
  <meta name="post-excerpt" content="${escapeHtml(values.excerpt)}">
  <meta name="post-tags" content="${escapeHtml(values.tags)}">
  <meta name="post-image" content="${escapeHtml(imageMeta)}">` : `  <meta name="project-title" content="${escapeHtml(values.title)}">
  <meta name="project-slug" content="${escapeHtml(values.slug)}">
  <meta name="project-category" content="${escapeHtml(values.category)}">
  <meta name="project-date" content="${escapeHtml(values.date)}">
  <meta name="project-description" content="${escapeHtml(values.excerpt)}">
  <meta name="project-technologies" content="${escapeHtml(values.tags)}">
  <meta name="project-image" content="${escapeHtml(imageMeta)}">
  <meta name="project-demo" content="${escapeHtml(values.demo || '')}">
  <meta name="project-github" content="${escapeHtml(values.github || '')}">`;
    const buttons = !isBlog ? [
      values.demo ? `<a class="btn primary" href="${escapeHtml(values.demo)}" target="_blank" rel="noopener noreferrer">Open live project</a>` : '',
      values.github ? `<a class="btn ghost" href="${escapeHtml(values.github)}" target="_blank" rel="noopener noreferrer">View source</a>` : ''
    ].filter(Boolean).join('') : '';
    const body = `<article class="blog-article"><header class="article-header"><p class="eyebrow"><a href="../${isBlog ? 'blog' : 'projects'}.html">← Back to ${isBlog ? 'Blog' : 'Projects'}</a></p><h1>${escapeHtml(values.title)}</h1><div class="article-meta"><time datetime="${escapeHtml(values.date)}">${escapeHtml(formatDate(values.date))}</time><span>${escapeHtml(values.category)}</span><span>${Math.max(1, Math.ceil(plainTextFromHtml(content).split(/\s+/).filter(Boolean).length / 200))} min read</span></div><img src="${escapeHtml(imageDisplaySrc)}" alt="${escapeHtml(values.alt || values.title)}" class="article-image"></header><div class="article-content">${!isBlog ? `<p>${escapeHtml(values.excerpt)}</p>` : ''}${content}</div>${tags.length ? `<div class="article-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}<footer class="article-footer">${buttons ? `<div class="button-row">${buttons}</div>` : `<a class="btn ghost" href="../blog.html">← Back to all posts</a>`}</footer></article>`;
    const schema = isBlog ? {
      '@context': 'https://schema.org', '@type': 'BlogPosting', headline: values.title, description: values.excerpt, datePublished: values.date, dateModified: values.date, image: [publicImage], author: { '@type': 'Person', name: 'Nandakumar M', url: CONFIG.siteUrl }, mainEntityOfPage: canonical, keywords: tags.join(', ')
    } : {
      '@context': 'https://schema.org', '@type': 'CreativeWork', name: values.title, description: values.excerpt, datePublished: values.date, image: publicImage, author: { '@type': 'Person', name: 'Nandakumar M', url: CONFIG.siteUrl }, url: canonical, keywords: tags.join(', ')
    };
    return documentShell({ title: values.title, description: values.excerpt, metadata, active: isBlog ? 'blog' : 'projects', body, canonical, image: publicImage, schema });
  }

  async function previewCurrent() {
    const result = validateEditor(true);
    if (!result.valid) return;
    const imageMeta = state.coverFile ? `${result.values.slug}.${imageExtension(state.coverFile)}` : state.editor.existingImage;
    const imageSrc = state.coverFile ? await fileToDataUrl(state.coverFile) : `../${state.editor.existingImage}`;
    el.previewFrame.srcdoc = buildContentDocument(result.values, imageMeta, imageSrc);
    el.previewFrame.classList.remove('mobile');
    $$('.preview-controls [data-preview-size]').forEach((button) => button.classList.toggle('active', button.dataset.previewSize === 'desktop'));
    openModal(el.previewModal);
  }

  async function publishCurrent() {
    const result = validateEditor(true);
    if (!result.valid) return;
    if (state.preferences.confirmPublish) {
      const approved = await confirmAction({ title: `Publish ${state.editor.type === 'blog' ? 'blog post' : 'project'}?`, message: `This will commit “${result.values.title}” to the main branch and start GitHub Actions.`, confirmText: 'Publish now' });
      if (!approved) return;
    }
    const values = result.values;
    const type = state.editor.type;
    const uploadFolder = type === 'blog' ? 'blog' : 'projects';
    const imageFolder = type === 'blog' ? 'blog' : 'works';
    const imageName = state.coverFile ? `${values.slug}.${imageExtension(state.coverFile)}` : state.editor.existingImage;
    const articleImageSrc = state.coverFile ? `../assets/images/${imageFolder}/${imageName}` : `../${state.editor.existingImage}`;
    const html = buildContentDocument(values, imageName, articleImageSrc);
    const files = [{ path: `uploads/${uploadFolder}/${values.slug}.html`, content: html, encoding: 'utf-8' }];
    if (state.coverFile) files.push({ path: `uploads/${uploadFolder}/${imageName}`, content: await fileToBase64(state.coverFile), encoding: 'base64' });
    openModal(el.publishProgressModal);
    updatePublishProgress(12, 'Validating content…', 'stepValidate');
    await sleep(350);
    updatePublishProgress(34, 'Preparing the GitHub commit…', 'stepUpload');
    try {
      const commit = await commitFiles(files, `Publish ${type}: ${values.title}`);
      updatePublishProgress(62, 'Files committed. Starting the publisher…', 'stepWorkflow');
      const workflow = await waitForWorkflow(commit.sha);
      if (workflow?.conclusion === 'failure') throw new Error('The publishing workflow failed. Open GitHub Actions for details.');
      updatePublishProgress(100, workflow ? 'Published successfully.' : 'Upload committed. GitHub Actions is processing it.', 'stepComplete');
      removeDraft(state.editor.id);
      state.editor.dirty = false;
      await sleep(900);
      closeModal(el.publishProgressModal);
      toast('Published to GitHub', workflow ? 'The website content is ready.' : 'The publisher workflow has started.');
      if (!IS_LOCAL_DEMO) await sleep(2200);
      await loadStudioData(false);
      switchView(type === 'blog' ? 'posts' : 'projects');
    } catch (error) {
      closeModal(el.publishProgressModal);
      toast('Publishing failed', error.message, 'error', 8000);
      if (error.status === 401) signOut();
    }
  }

  function updatePublishProgress(percent, text, activeStep) {
    el.publishProgressBar.style.width = `${percent}%`;
    el.publishProgressText.textContent = text;
    const order = ['stepValidate', 'stepUpload', 'stepWorkflow', 'stepComplete'];
    const activeIndex = order.indexOf(activeStep);
    order.forEach((id, index) => {
      const item = $(`#${id}`);
      item.classList.toggle('active', index === activeIndex);
      item.classList.toggle('done', index < activeIndex || (id === 'stepComplete' && percent === 100));
    });
  }

  async function waitForWorkflow(headSha) {
    if (IS_LOCAL_DEMO) { await sleep(1200); return { conclusion: 'success' }; }
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await sleep(attempt === 0 ? 1800 : 3000);
      const payload = await githubRequest(`/repos/${CONFIG.owner}/${CONFIG.repository}/actions/runs?head_sha=${encodeURIComponent(headSha)}&per_page=5`).catch(() => ({ workflow_runs: [] }));
      const run = payload.workflow_runs?.[0];
      if (!run) continue;
      if (run.status === 'completed') return run;
      el.publishProgressText.textContent = 'GitHub Actions is publishing the content…';
    }
    return null;
  }

  async function deleteContent(type, item) {
    const approved = await confirmAction({ title: `Delete “${item.title}”?`, message: 'The page and its content index entry will be removed from GitHub. This can be restored from commit history.', confirmText: 'Delete content', danger: true });
    if (!approved) return;
    try {
      if (IS_LOCAL_DEMO) {
        if (type === 'blog') state.posts = state.posts.filter((entry) => entry.slug !== item.slug);
        else state.projects = state.projects.filter((entry) => entry.slug !== item.slug);
        renderAll();
        toast('Content deleted', 'Demo content was removed locally.');
        return;
      }
      const dataPath = type === 'blog' ? 'assets/data/blog.json' : 'assets/data/works.json';
      const data = await readRepoJson(dataPath, []);
      const remaining = data.value.filter((entry) => (entry.slug || slugFromUrl(entry.url) || slugify(entry.title)) !== item.slug);
      const files = [{ path: dataPath, content: `${JSON.stringify(remaining, null, 2)}\n`, encoding: 'utf-8' }];
      if (item.url) files.push({ path: item.url, delete: true });
      const imageUsedElsewhere = getAllContent().some((entry) => entry.slug !== item.slug && entry.image === item.image);
      const imageIsOwnedByItem = Boolean(item.image) && (
        item.image.startsWith('assets/images/uploads/') ||
        item.image.includes(`/${item.slug}.`)
      );
      if (imageIsOwnedByItem && !imageUsedElsewhere) files.push({ path: item.image, delete: true });
      await commitFiles(files, `Delete ${type}: ${item.title}`);
      toast('Content deleted', 'GitHub history can restore it if needed.');
      await loadStudioData(false);
    } catch (error) {
      toast('Delete failed', error.message, 'error', 7000);
    }
  }

  async function uploadMedia(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast('Invalid media', 'Choose an image file.', 'error');
    if (file.size > MAX_IMAGE_BYTES) return toast('Image is too large', 'Maximum file size is 8 MB.', 'error');
    const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'image';
    const extension = imageExtension(file);
    const path = `assets/images/uploads/${Date.now()}-${base}.${extension}`;
    const nextMedia = [...state.media, { name: file.name, path, uploadedAt: new Date().toISOString(), source: 'Media library' }];
    try {
      await commitFiles([
        { path, content: await fileToBase64(file), encoding: 'base64' },
        { path: 'assets/data/media.json', content: `${JSON.stringify(nextMedia, null, 2)}\n`, encoding: 'utf-8' }
      ], `Upload media: ${file.name}`);
      state.media = nextMedia;
      renderMedia();
      toast('Media uploaded', 'The image is available in the media library.');
    } catch (error) {
      toast('Upload failed', error.message, 'error', 7000);
    }
  }

  function applyPreferences() {
    document.documentElement.dataset.theme = state.preferences.theme;
    document.body.classList.toggle('compact-table', state.preferences.compactTable);
    $('#autosaveToggle').checked = state.preferences.autosave;
    $('#confirmPublishToggle').checked = state.preferences.confirmPublish;
    $('#compactTableToggle').checked = state.preferences.compactTable;
    $('#settingsOAuthClientId').value = getOAuthClientId();
    el.oauthClientId.value = getOAuthClientId();
  }

  function savePreferences() {
    saveLocalJson(PREF_KEY, state.preferences);
    applyPreferences();
  }

  function toggleTheme() {
    state.preferences.theme = state.preferences.theme === 'dark' ? 'light' : 'dark';
    savePreferences();
  }

  function saveOAuthClientId(value) {
    const clientId = String(value || '').trim();
    if (clientId) localStorage.setItem(OAUTH_CLIENT_KEY, clientId); else localStorage.removeItem(OAUTH_CLIENT_KEY);
    el.oauthClientId.value = clientId;
    $('#settingsOAuthClientId').value = clientId;
    toast('OAuth Client ID saved', clientId ? 'GitHub direct sign-in is configured on this device.' : 'Direct sign-in configuration was cleared.');
  }

  function openSearch() {
    renderGlobalSearch('');
    openModal(el.searchModal);
    setTimeout(() => el.globalSearchInput.focus(), 50);
  }

  function renderGlobalSearch(query) {
    const term = query.trim().toLowerCase();
    const actions = [
      { title: 'Create blog post', subtitle: 'Open a blank article editor', icon: 'file', action: 'new-blog' },
      { title: 'Create project', subtitle: 'Open a blank project editor', icon: 'briefcase', action: 'new-project' },
      { title: 'Open media library', subtitle: 'Browse uploaded images', icon: 'image', action: 'view-media' },
      { title: 'Open settings', subtitle: 'GitHub and editor preferences', icon: 'settings', action: 'view-settings' }
    ].filter((item) => !term || `${item.title} ${item.subtitle}`.toLowerCase().includes(term));
    const content = getAllContent().filter((item) => !term || `${item.title} ${item.category} ${item.summary}`.toLowerCase().includes(term)).slice(0, 8);
    el.globalSearchResults.innerHTML = `${actions.length ? `<div class="command-section-label">Actions</div>${actions.map((item) => `<button class="command-item" type="button" data-command-action="${item.action}"><span>${icon(item.icon)}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.subtitle)}</small></span>${icon('chevron')}</button>`).join('')}` : ''}${content.length ? `<div class="command-section-label">Content</div>${content.map((item) => `<button class="command-item" type="button" data-command-content="${item.type}:${escapeHtml(item.slug)}"><span>${icon(item.type === 'blog' ? 'file' : 'briefcase')}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category || '')}</small></span>${icon('chevron')}</button>`).join('')}` : ''}${!actions.length && !content.length ? '<div class="empty-state"><p>No results found.</p></div>' : ''}`;
  }

  function executeCommand(action) {
    closeModal(el.searchModal);
    if (action === 'new-blog') newEditor('blog');
    if (action === 'new-project') newEditor('project');
    if (action === 'view-media') switchView('media');
    if (action === 'view-settings') switchView('settings');
  }

  function handleToolbarAction(button) {
    el.richEditor.focus();
    if (button.dataset.command) document.execCommand(button.dataset.command, false);
    if (button.dataset.action === 'link') {
      const url = prompt('Enter a link URL');
      if (url) document.execCommand('createLink', false, url);
    }
    if (button.dataset.action === 'quote') document.execCommand('formatBlock', false, 'blockquote');
    if (button.dataset.action === 'code') document.execCommand('formatBlock', false, 'pre');
    markEditorDirty();
  }

  function setupEventListeners() {
    el.tokenLoginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = $('button[type="submit"]', el.tokenLoginForm);
      button.disabled = true;
      setAuthStatus('Verifying repository access…');
      try { await authenticate(el.tokenInput.value, 'token'); setAuthStatus(); }
      catch (error) { state.token = ''; sessionStorage.removeItem(TOKEN_KEY); setAuthStatus(error.message, 'error'); }
      finally { button.disabled = false; }
    });

    el.githubLoginButton.addEventListener('click', startGitHubDeviceLogin);
    $('#toggleToken').addEventListener('click', () => { el.tokenInput.type = el.tokenInput.type === 'password' ? 'text' : 'password'; });
    $('#oauthSetupToggle').addEventListener('click', () => { $('#oauthSetup').hidden = !$('#oauthSetup').hidden; });
    $('#saveOAuthClientId').addEventListener('click', () => saveOAuthClientId(el.oauthClientId.value));
    $('#copyDeviceCode').addEventListener('click', async () => { await navigator.clipboard.writeText(el.deviceCode.textContent); toast('Code copied', 'Paste it into GitHub verification.'); });

    $$('.nav-item[data-view]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
    $('#newContentButton').addEventListener('click', () => newEditor('blog'));
    $('#topCreateButton').addEventListener('click', () => newEditor(state.libraryType || 'blog'));
    $('#libraryCreateButton').addEventListener('click', () => newEditor(state.libraryType));
    $$('[data-create-type]').forEach((button) => button.addEventListener('click', () => newEditor(button.dataset.createType)));
    $$('[data-open-view]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.openView)));
    $('#editorBackButton').addEventListener('click', async () => {
      if (state.editor?.dirty && plainTextFromHtml(getEditorContent())) saveCurrentDraft(false);
      switchView(state.editor?.type === 'project' ? 'projects' : 'posts');
    });
    $('#openSidebar').addEventListener('click', openSidebar);
    $('#closeSidebar').addEventListener('click', closeSidebar);
    el.mobileScrim.addEventListener('click', closeSidebar);
    $('#signOutButton').addEventListener('click', signOut);
    $('#themeButton').addEventListener('click', toggleTheme);
    $('#refreshButton').addEventListener('click', () => loadStudioData(true));
    $('#globalSearchButton').addEventListener('click', openSearch);

    el.librarySearch.addEventListener('input', renderLibrary);
    el.categoryFilter.addEventListener('change', renderLibrary);
    el.sortFilter.addEventListener('change', renderLibrary);

    el.contentTable.addEventListener('click', (event) => {
      const row = event.target.closest('.content-row');
      if (!row) return;
      const menuButton = event.target.closest('.row-menu-button');
      if (menuButton) {
        const menu = $('.row-menu', row);
        $$('.row-menu').forEach((other) => { if (other !== menu) other.hidden = true; });
        menu.hidden = !menu.hidden;
        return;
      }
      const action = event.target.closest('[data-row-action]')?.dataset.rowAction;
      if (!action) return;
      const type = row.dataset.contentType;
      const item = (type === 'blog' ? state.posts : state.projects).find((entry) => entry.slug === row.dataset.contentSlug);
      if (action === 'edit') editPublished(type, item.slug);
      if (action === 'delete') deleteContent(type, item);
    });

    el.recentContentList.addEventListener('click', (event) => {
      const target = event.target.closest('[data-edit-slug]');
      if (target) editPublished(target.dataset.editType, target.dataset.editSlug);
    });

    el.draftGrid.addEventListener('click', async (event) => {
      const card = event.target.closest('[data-draft-id]');
      const action = event.target.closest('[data-draft-action]')?.dataset.draftAction;
      if (!card || !action) return;
      if (action === 'edit') openDraft(card.dataset.draftId);
      if (action === 'delete') {
        const approved = await confirmAction({ title: 'Delete this draft?', message: 'This removes the browser-only draft. Published content is not affected.', confirmText: 'Delete draft', danger: true });
        if (approved) { removeDraft(card.dataset.draftId); toast('Draft deleted'); }
      }
    });

    $('#clearDraftsButton').addEventListener('click', async () => {
      if (!state.drafts.length) return;
      const approved = await confirmAction({ title: 'Clear all drafts?', message: 'This removes every browser-only draft on this device.', confirmText: 'Clear drafts', danger: true });
      if (approved) { state.drafts = []; saveLocalJson(DRAFT_KEY, []); renderDrafts(); toast('Drafts cleared'); }
    });

    $('#mediaUploadInput').addEventListener('change', (event) => { uploadMedia(event.target.files[0]); event.target.value = ''; });
    el.mediaGrid.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-copy-media]');
      const card = event.target.closest('[data-media-path]');
      if (button && card) { await navigator.clipboard.writeText(card.dataset.mediaPath); toast('Media path copied', card.dataset.mediaPath); }
    });

    $('#saveDraftButton').addEventListener('click', () => saveCurrentDraft(true));
    $('#previewButton').addEventListener('click', previewCurrent);
    $('#publishButton').addEventListener('click', publishCurrent);
    el.coverDropzone.addEventListener('click', () => el.coverInput.click());
    el.coverInput.addEventListener('change', (event) => { setCoverFile(event.target.files[0]); event.target.value = ''; });
    ['dragenter', 'dragover'].forEach((name) => el.coverDropzone.addEventListener(name, (event) => { event.preventDefault(); el.coverDropzone.classList.add('dragging'); }));
    ['dragleave', 'drop'].forEach((name) => el.coverDropzone.addEventListener(name, (event) => { event.preventDefault(); el.coverDropzone.classList.remove('dragging'); }));
    el.coverDropzone.addEventListener('drop', (event) => setCoverFile(event.dataTransfer.files[0]));

    [el.editorTitle, el.editorExcerpt, el.editorSlug, el.editorCategory, el.editorDate, el.editorTags, el.editorDemoUrl, el.editorGithubUrl, el.editorAltText, el.richEditor, el.sourceEditor].forEach((input) => input.addEventListener('input', markEditorDirty));
    el.editorTitle.addEventListener('input', () => {
      if (!state.slugEdited) el.editorSlug.value = slugify(el.editorTitle.value);
      if (!el.editorAltText.value.trim()) el.editorAltText.value = el.editorTitle.value.trim();
    });
    el.editorSlug.addEventListener('input', () => { state.slugEdited = Boolean(el.editorSlug.value); el.editorSlug.value = slugify(el.editorSlug.value); });
    $$('#typeSwitch button').forEach((button) => button.addEventListener('click', () => setEditorType(button.dataset.type, false)));
    $$('.inspector-tabs button').forEach((button) => button.addEventListener('click', () => {
      $$('.inspector-tabs button').forEach((item) => item.classList.toggle('active', item === button));
      $$('.inspector-panel').forEach((panel) => panel.classList.toggle('active', panel.dataset.inspectorPanel === button.dataset.inspector));
    }));
    $$('.editor-toolbar button[data-command], .editor-toolbar button[data-action]').forEach((button) => button.addEventListener('click', () => handleToolbarAction(button)));
    $('#formatSelect').addEventListener('change', (event) => { el.richEditor.focus(); document.execCommand('formatBlock', false, event.target.value); markEditorDirty(); });
    $('#sourceModeButton').addEventListener('click', () => setSourceMode(!state.sourceMode));

    $('#autosaveToggle').addEventListener('change', (event) => { state.preferences.autosave = event.target.checked; savePreferences(); });
    $('#confirmPublishToggle').addEventListener('change', (event) => { state.preferences.confirmPublish = event.target.checked; savePreferences(); });
    $('#compactTableToggle').addEventListener('change', (event) => { state.preferences.compactTable = event.target.checked; savePreferences(); renderLibrary(); });
    $('#settingsSaveOAuth').addEventListener('click', () => saveOAuthClientId($('#settingsOAuthClientId').value));
    $('#resetLocalDataButton').addEventListener('click', async () => {
      const approved = await confirmAction({ title: 'Clear local studio data?', message: 'Drafts, OAuth Client ID and preferences will be removed from this browser. GitHub content is unchanged.', confirmText: 'Clear local data', danger: true });
      if (!approved) return;
      [DRAFT_KEY, PREF_KEY, OAUTH_CLIENT_KEY].forEach((key) => localStorage.removeItem(key));
      state.drafts = [];
      state.preferences = { ...defaultPreferences };
      applyPreferences();
      renderDrafts();
      toast('Local data cleared');
    });

    $('#confirmCancel').addEventListener('click', () => resolveConfirm(false));
    el.confirmAccept.addEventListener('click', () => resolveConfirm(true));
    $$('[data-close-modal="confirm"]').forEach((node) => node.addEventListener('click', () => resolveConfirm(false)));
    $$('[data-close-modal="preview"]').forEach((node) => node.addEventListener('click', () => closeModal(el.previewModal)));
    $$('[data-close-modal="search"]').forEach((node) => node.addEventListener('click', () => closeModal(el.searchModal)));
    $$('.preview-controls [data-preview-size]').forEach((button) => button.addEventListener('click', () => {
      $$('.preview-controls [data-preview-size]').forEach((item) => item.classList.toggle('active', item === button));
      el.previewFrame.classList.toggle('mobile', button.dataset.previewSize === 'mobile');
    }));

    el.globalSearchInput.addEventListener('input', () => renderGlobalSearch(el.globalSearchInput.value));
    el.globalSearchResults.addEventListener('click', (event) => {
      const action = event.target.closest('[data-command-action]')?.dataset.commandAction;
      const content = event.target.closest('[data-command-content]')?.dataset.commandContent;
      if (action) executeCommand(action);
      if (content) { closeModal(el.searchModal); const [type, slug] = content.split(':'); editPublished(type, slug); }
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.row-menu-wrap')) $$('.row-menu').forEach((menu) => { menu.hidden = true; });
    });

    document.addEventListener('keydown', (event) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === 'k' && !el.studioApp.hidden) { event.preventDefault(); openSearch(); }
      if (mod && event.key.toLowerCase() === 's' && state.activeView === 'editor') { event.preventDefault(); saveCurrentDraft(true); }
      if (mod && event.key === 'Enter' && state.activeView === 'editor') { event.preventDefault(); publishCurrent(); }
      if (event.key === 'Escape') {
        if (!el.searchModal.hidden) closeModal(el.searchModal);
        else if (!el.previewModal.hidden) closeModal(el.previewModal);
        else if (!el.confirmModal.hidden) resolveConfirm(false);
        else closeSidebar();
      }
    });
  }

  async function bootstrap() {
    applyPreferences();
    setupEventListeners();
    el.oauthClientId.value = getOAuthClientId();
    $('#settingsOAuthClientId').value = getOAuthClientId();
    if (IS_LOCAL_DEMO) {
      state.user = { login: 'nandurpm', name: 'Nandakumar M', avatar_url: 'https://github.com/nandurpm.png' };
      state.authMethod = 'demo';
      await enterStudio();
      return;
    }
    if (state.token) {
      setAuthStatus('Restoring your GitHub session…');
      try { await authenticate(state.token, 'token'); }
      catch { signOut(); setAuthStatus('Your previous session expired. Sign in again.', 'error'); }
    }
  }

  bootstrap();
})();
