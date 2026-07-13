(() => {
  'use strict';

  const OWNER = 'nandurpm';
  const REPOSITORY = 'portfolio';
  const BRANCH = 'main';
  const API_VERSION = '2022-11-28';
  const TOKEN_KEY = 'portfolio-admin-token-v2';
  const DRAFT_KEY = 'portfolio-content-drafts-v2';
  const SETTINGS_KEY = 'portfolio-content-settings-v2';
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
  const BLOG_CATEGORIES = ['Technical Articles', 'Engineering', 'Current Affairs', 'Movie Reviews', 'Politics', 'Personal Writings'];
  const PROJECT_CATEGORIES = ['Web Development', 'Embedded Systems', 'Engineering Design', 'Electronics', 'Tools', 'Other'];
  const IS_LOCAL_DEMO = Boolean(window.__ADMIN_DEMO__) || ((['localhost', '127.0.0.1'].includes(location.hostname) || location.protocol === 'file:') && new URLSearchParams(location.search).has('demo'));

  const initialToken = safeSessionGet(TOKEN_KEY) || '';

  const state = {
    token: initialToken,
    authMode: initialToken ? 'token' : '',
    user: null,
    view: 'dashboard',
    contentFilter: 'all',
    editorType: 'blog',
    editingItem: null,
    originalSlug: '',
    currentDraftId: '',
    coverFile: null,
    coverDataUrl: '',
    existingImage: '',
    sourceMode: false,
    oauthAvailable: false,
    content: { blog: [], project: [] },
    workflows: [],
    media: [],
    mediaFilter: 'all',
    autosaveTimer: null,
    statusTimer: null,
    confirmAction: null,
    settings: {
      autoPreview: true,
      confirmDelete: true,
      ...readJsonStorage(SETTINGS_KEY, {})
    }
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const el = {
    authView: $('#authView'),
    appView: $('#appView'),
    githubLoginButton: $('#githubLoginButton'),
    oauthHint: $('#oauthHint'),
    loginForm: $('#loginForm'),
    tokenInput: $('#tokenInput'),
    loginStatus: $('#loginStatus'),
    sidebar: $('#sidebar'),
    sidebarOpen: $('#sidebarOpen'),
    sidebarClose: $('#sidebarClose'),
    sidebarBackdrop: $('#sidebarBackdrop'),
    accountAvatar: $('#accountAvatar'),
    accountName: $('#accountName'),
    accountHandle: $('#accountHandle'),
    logoutButton: $('#logoutButton'),
    settingsSignOut: $('#settingsSignOut'),
    pageEyebrow: $('#pageEyebrow'),
    pageTitle: $('#pageTitle'),
    globalSearch: $('#globalSearch'),
    topNewButton: $('#topNewButton'),
    dashboardDate: $('#dashboardDate'),
    recentContentList: $('#recentContentList'),
    workflowList: $('#workflowList'),
    contentLibrary: $('#contentLibrary'),
    contentSearch: $('#contentSearch'),
    contentSort: $('#contentSort'),
    draftLibrary: $('#draftLibrary'),
    clearDraftsButton: $('#clearDraftsButton'),
    mediaGrid: $('#mediaGrid'),
    refreshMediaButton: $('#refreshMediaButton'),
    contentForm: $('#contentForm'),
    editorBackButton: $('#editorBackButton'),
    editorModeLabel: $('#editorModeLabel'),
    editorDocumentTitle: $('#editorDocumentTitle'),
    autosaveStatus: $('#autosaveStatus'),
    saveDraftButton: $('#saveDraftButton'),
    previewButton: $('#previewButton'),
    publishButton: $('#publishButton'),
    publishStatus: $('#publishStatus'),
    documentStateBadge: $('#documentStateBadge'),
    titleInput: $('#titleInput'),
    summaryInput: $('#summaryInput'),
    coverDropzone: $('#coverDropzone'),
    coverInput: $('#coverInput'),
    coverPreview: $('#coverPreview'),
    coverPlaceholder: $('#coverPlaceholder'),
    coverActions: $('#coverActions'),
    replaceCoverButton: $('#replaceCoverButton'),
    removeCoverButton: $('#removeCoverButton'),
    blockFormat: $('#blockFormat'),
    richEditor: $('#richEditor'),
    sourceEditor: $('#sourceEditor'),
    sourceToggle: $('#sourceToggle'),
    wordCount: $('#wordCount'),
    readTime: $('#readTime'),
    characterCount: $('#characterCount'),
    slugInput: $('#slugInput'),
    categoryInput: $('#categoryInput'),
    dateInput: $('#dateInput'),
    tagField: $('#tagField'),
    tagsInput: $('#tagsInput'),
    technologyField: $('#technologyField'),
    technologiesInput: $('#technologiesInput'),
    seoTitleInput: $('#seoTitleInput'),
    seoDescriptionInput: $('#seoDescriptionInput'),
    seoPreviewTitle: $('#seoPreviewTitle'),
    seoPreviewDescription: $('#seoPreviewDescription'),
    demoField: $('#demoField'),
    demoInput: $('#demoInput'),
    githubField: $('#githubField'),
    githubInput: $('#githubInput'),
    canonicalInput: $('#canonicalInput'),
    detailType: $('#detailType'),
    detailSaved: $('#detailSaved'),
    detailCover: $('#detailCover'),
    previewDialog: $('#previewDialog'),
    closePreviewButton: $('#closePreviewButton'),
    previewFrame: $('#previewFrame'),
    previewDevice: $('#previewDevice'),
    previewUrl: $('#previewUrl'),
    confirmDialog: $('#confirmDialog'),
    confirmTitle: $('#confirmTitle'),
    confirmMessage: $('#confirmMessage'),
    confirmActionButton: $('#confirmActionButton'),
    toastStack: $('#toastStack'),
    autoPreviewSetting: $('#autoPreviewSetting'),
    confirmDeleteSetting: $('#confirmDeleteSetting'),
    settingsAccount: $('#settingsAccount'),
    settingsConnectionText: $('#settingsConnectionText')
  };


  function safeSessionGet(key) {
    try { return sessionStorage.getItem(key); } catch { return ''; }
  }

  function safeSessionSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch { /* storage may be unavailable in private/embedded contexts */ }
  }

  function safeSessionRemove(key) {
    try { sessionStorage.removeItem(key); } catch { /* storage may be unavailable in private/embedded contexts */ }
  }

  function readJsonStorage(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJsonStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore storage quota/privacy errors */ }
  }

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function decodeBase64Utf8(value) {
    const binary = atob(String(value).replace(/\s/g, ''));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function encodeBase64Utf8(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function slugify(value = '') {
    return String(value)
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  function parseList(value = '') {
    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
  }

  function formatDate(value, options = {}) {
    if (!value) return 'Not dated';
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...options }).format(date);
  }

  function formatRelativeTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return formatDate(date.toISOString().slice(0, 10));
  }

  function setStatus(element, message = '', type = '') {
    element.textContent = message;
    element.className = `status${type ? ` ${type}` : ''}`;
  }

  function showFloatingStatus(message, type = '') {
    clearTimeout(state.statusTimer);
    setStatus(el.publishStatus, message, type);
    el.publishStatus.classList.add('visible');
    state.statusTimer = setTimeout(() => el.publishStatus.classList.remove('visible'), 5000);
  }

  function toast(title, message = '', type = 'success') {
    const node = document.createElement('div');
    node.className = `toast ${type}`;
    node.innerHTML = `
      <svg><use href="#${type === 'error' ? 'i-close' : 'i-check'}"></use></svg>
      <div><strong>${escapeHtml(title)}</strong>${message ? `<small>${escapeHtml(message)}</small>` : ''}</div>
      <button type="button" aria-label="Dismiss">×</button>`;
    node.querySelector('button').addEventListener('click', () => node.remove());
    el.toastStack.append(node);
    setTimeout(() => node.remove(), 5200);
  }

  async function githubRequest(path, options = {}) {
    if (IS_LOCAL_DEMO && !state.token) throw Object.assign(new Error('GitHub write actions are disabled in local demo mode.'), { status: 403 });
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

  async function authenticate(token, mode = 'token') {
    state.token = String(token || '').trim();
    if (!state.token) throw new Error('Enter a valid GitHub credential.');
    const user = await githubRequest('/user');
    if (String(user.login).toLowerCase() !== OWNER.toLowerCase()) {
      throw new Error(`This studio accepts the ${OWNER} GitHub account only.`);
    }
    const repository = await githubRequest(`/repos/${OWNER}/${REPOSITORY}`);
    const canWrite = repository.permissions?.push || repository.permissions?.admin || repository.permissions?.maintain;
    if (!canWrite) throw new Error('This credential does not have write access to the portfolio repository.');
    state.authMode = mode;
    state.user = user;
    safeSessionSet(TOKEN_KEY, state.token);
    await showStudio(user);
  }

  async function showStudio(user) {
    el.authView.hidden = true;
    el.appView.hidden = false;
    el.accountName.textContent = user.name || 'Nandakumar M';
    el.accountHandle.textContent = `@${user.login}`;
    el.settingsAccount.textContent = `@${user.login}`;
    el.settingsConnectionText.textContent = `Connected through ${state.authMode === 'oauth' ? 'GitHub login' : 'repository token'}.`;
    if (user.avatar_url) {
      el.accountAvatar.src = user.avatar_url;
      el.accountAvatar.hidden = false;
      $('.account-avatar-fallback').hidden = true;
    }
    navigate('dashboard');
    await Promise.allSettled([loadContent(), loadWorkflows()]);
    renderAll();
  }

  function showLogin() {
    state.token = '';
    state.authMode = '';
    state.user = null;
    safeSessionRemove(TOKEN_KEY);
    el.appView.hidden = true;
    el.authView.hidden = false;
    el.tokenInput.value = '';
    setStatus(el.loginStatus);
  }

  async function checkOAuthAvailability() {
    try {
      const response = await fetch('/api/github/oauth/config', { cache: 'no-store' });
      if (!response.ok) throw new Error('OAuth endpoint unavailable');
      const config = await response.json();
      state.oauthAvailable = Boolean(config.enabled);
    } catch {
      state.oauthAvailable = false;
    }
    el.githubLoginButton.classList.toggle('unavailable', !state.oauthAvailable);
    el.oauthHint.hidden = state.oauthAvailable;
    el.oauthHint.textContent = state.oauthAvailable ? '' : 'GitHub login is not configured on this deployment. Token access remains available.';
  }

  function startGitHubLogin() {
    if (!state.oauthAvailable) {
      el.oauthHint.hidden = false;
      return;
    }
    const width = 620;
    const height = 760;
    const left = Math.max(0, (screen.width - width) / 2);
    const top = Math.max(0, (screen.height - height) / 2);
    const popup = window.open('/api/github/oauth/start', 'portfolio-github-login', `popup=yes,width=${width},height=${height},left=${left},top=${top}`);
    if (!popup) setStatus(el.loginStatus, 'Allow pop-ups for this site, then try GitHub login again.', 'error');
    else setStatus(el.loginStatus, 'Complete authorization in the GitHub window…');
  }

  async function loadContent() {
    if (IS_LOCAL_DEMO && window.__ADMIN_DEMO_DATA__) {
      state.content.blog = (window.__ADMIN_DEMO_DATA__.blog || []).map((item) => normalizeItem(item, 'blog'));
      state.content.project = (window.__ADMIN_DEMO_DATA__.project || []).map((item) => normalizeItem(item, 'project'));
      return;
    }
    const stamp = Date.now();
    const [blogResponse, projectResponse] = await Promise.all([
      fetch(`../assets/data/blog.json?v=${stamp}`, { cache: 'no-store' }),
      fetch(`../assets/data/works.json?v=${stamp}`, { cache: 'no-store' })
    ]);
    if (!blogResponse.ok || !projectResponse.ok) throw new Error('Unable to load portfolio content indexes.');
    const [blogs, projects] = await Promise.all([blogResponse.json(), projectResponse.json()]);
    state.content.blog = blogs.map((item) => normalizeItem(item, 'blog'));
    state.content.project = projects.map((item) => normalizeItem(item, 'project'));
  }

  function normalizeItem(item, type) {
    const url = item.url || '';
    const fallbackSlug = url.split('/').pop()?.replace(/\.html$/i, '') || slugify(item.title);
    return {
      ...item,
      type,
      slug: item.slug || fallbackSlug,
      date: item.date || '',
      status: 'live'
    };
  }

  function allContent() {
    return [...state.content.blog, ...state.content.project];
  }

  async function loadWorkflows() {
    if (IS_LOCAL_DEMO && !state.token) {
      state.workflows = [
        { id: 1, name: 'Publish uploaded content', display_title: 'Publish blog: Sample article', status: 'completed', conclusion: 'success', created_at: new Date(Date.now() - 3600000).toISOString(), html_url: '#' },
        { id: 2, name: 'Publish uploaded content', display_title: 'Update content studio', status: 'completed', conclusion: 'success', created_at: new Date(Date.now() - 86400000).toISOString(), html_url: '#' }
      ];
      return;
    }
    try {
      const result = await githubRequest(`/repos/${OWNER}/${REPOSITORY}/actions/runs?per_page=6`);
      state.workflows = result.workflow_runs || [];
    } catch {
      state.workflows = [];
    }
  }

  function renderAll() {
    renderCounts();
    renderDashboard();
    renderContentLibrary();
    renderDrafts();
  }

  function renderCounts() {
    const drafts = getDrafts();
    $('#blogCountBadge').textContent = state.content.blog.length;
    $('#projectCountBadge').textContent = state.content.project.length;
    $('#draftCountBadge').textContent = drafts.length;
    $('#metricBlog').textContent = state.content.blog.length;
    $('#metricProject').textContent = state.content.project.length;
    $('#metricDraft').textContent = drafts.length;
    $('#metricBlogDetail').textContent = state.content.blog.length ? `${state.content.blog[0].category || 'Latest'} · ${formatDate(state.content.blog[0].date)}` : 'No posts yet';
    $('#metricProjectDetail').textContent = state.content.project.length ? `${state.content.project.length} visible on website` : 'No projects yet';
    const latest = state.workflows[0];
    const workflowStatus = latest ? (latest.status === 'completed' ? latest.conclusion : latest.status) : 'Unavailable';
    $('#metricWorkflow').textContent = workflowStatus;
    $('#metricWorkflowDetail').textContent = latest ? formatRelativeTime(latest.created_at) : 'No recent runs';
  }

  function renderDashboard() {
    el.dashboardDate.textContent = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
    const recent = allContent().sort(compareNewest).slice(0, 6);
    el.recentContentList.innerHTML = recent.length ? recent.map((item) => contentRow(item, true)).join('') : emptyInline('No published content found.');
    el.workflowList.innerHTML = state.workflows.length ? state.workflows.slice(0, 5).map(workflowRow).join('') : emptyInline('No workflow activity is available.');
  }

  function compareNewest(a, b) {
    return String(b.date || '').localeCompare(String(a.date || '')) || String(a.title).localeCompare(String(b.title));
  }

  function contentRow(item, compact = false) {
    const image = item.image ? `../${escapeHtml(item.image)}` : '';
    const thumb = image
      ? `<img class="content-thumb" src="${image}" alt="" loading="lazy">`
      : `<span class="content-thumb fallback"><svg><use href="#${item.type === 'blog' ? 'i-file' : 'i-briefcase'}"></use></svg></span>`;
    const identity = `<div class="content-identity">${thumb}<div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category || '')}</small></div></div>`;
    if (compact) {
      return `<div class="content-row" data-type="${item.type}" data-slug="${escapeHtml(item.slug)}">${identity}<span class="type-chip ${item.type}">${item.type === 'blog' ? 'Blog post' : 'Project'}</span><span class="row-date">${formatDate(item.date)}</span></div>`;
    }
    return `<div class="content-row" data-type="${item.type}" data-slug="${escapeHtml(item.slug)}">
      ${identity}
      <span class="type-chip ${item.type}">${item.type === 'blog' ? 'Blog post' : 'Project'}</span>
      <span class="row-date">${formatDate(item.date)}</span>
      <span class="status-chip live">Live</span>
      <div class="row-actions">
        <button class="icon-button" type="button" data-action="edit" title="Edit"><svg><use href="#i-edit"></use></svg></button>
        <button class="icon-button" type="button" data-action="duplicate" title="Duplicate"><svg><use href="#i-copy"></use></svg></button>
        <a class="icon-button" href="../${escapeHtml(item.url || '')}" target="_blank" rel="noopener noreferrer" title="Open live"><svg><use href="#i-external"></use></svg></a>
        <button class="icon-button" type="button" data-action="unpublish" title="Unpublish"><svg><use href="#i-trash"></use></svg></button>
      </div>
    </div>`;
  }

  function workflowRow(run) {
    const statusClass = run.status !== 'completed' ? 'progress' : run.conclusion === 'success' ? 'success' : 'failure';
    const label = run.display_title || run.name || 'Workflow run';
    return `<a class="workflow-item" href="${escapeHtml(run.html_url || '#')}" target="_blank" rel="noopener noreferrer">
      <span class="workflow-dot ${statusClass}"></span>
      <div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(run.name || 'GitHub Actions')}</small></div>
      <time>${escapeHtml(formatRelativeTime(run.created_at))}</time>
    </a>`;
  }

  function emptyInline(message) {
    return `<div class="empty-inline">${escapeHtml(message)}</div>`;
  }

  function renderContentLibrary() {
    const query = String(el.contentSearch.value || '').trim().toLowerCase();
    let items = allContent();
    if (state.contentFilter !== 'all') items = items.filter((item) => item.type === state.contentFilter);
    if (query) {
      items = items.filter((item) => [item.title, item.category, item.description, item.excerpt, ...(item.tags || []), ...(item.technologies || [])].join(' ').toLowerCase().includes(query));
    }
    const sort = el.contentSort.value;
    if (sort === 'title') items.sort((a, b) => String(a.title).localeCompare(String(b.title)));
    else if (sort === 'oldest') items.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
    else items.sort(compareNewest);
    el.contentLibrary.innerHTML = items.length ? items.map((item) => contentRow(item)).join('') : `<div class="empty-state"><svg><use href="#i-search"></use></svg><h3>No matching content</h3><p>Try a different search or content filter.</p></div>`;
  }

  function getDrafts() {
    return readJsonStorage(DRAFT_KEY, []).sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  }

  function renderDrafts() {
    const drafts = getDrafts();
    el.draftLibrary.innerHTML = drafts.length ? drafts.map((draft) => `
      <article class="draft-card" data-draft-id="${escapeHtml(draft.id)}">
        <div class="draft-card-head"><span class="type-chip ${draft.type}">${draft.type === 'blog' ? 'Blog post' : 'Project'}</span><span class="status-chip draft">Draft</span></div>
        <div><h4>${escapeHtml(draft.title || 'Untitled content')}</h4><p>${escapeHtml(draft.summary || 'No summary added yet.')}</p></div>
        <div class="draft-card-footer"><span>Saved ${escapeHtml(formatRelativeTime(draft.savedAt))}</span><div><button class="icon-button small" type="button" data-action="edit-draft" title="Open draft"><svg><use href="#i-edit"></use></svg></button><button class="icon-button small" type="button" data-action="delete-draft" title="Delete draft"><svg><use href="#i-trash"></use></svg></button></div></div>
      </article>`).join('') : `<div class="empty-state"><svg><use href="#i-save"></use></svg><h3>No saved drafts</h3><p>Start a post or project and it will autosave in this browser.</p></div>`;
  }

  function navigate(view, options = {}) {
    state.view = view;
    $$('.app-view').forEach((section) => {
      const active = section.id === `${view}View`;
      section.hidden = !active;
      section.classList.toggle('active-view', active);
    });
    $$('.nav-item').forEach((button) => button.classList.remove('active'));
    const titles = {
      dashboard: ['Workspace', 'Dashboard'],
      content: ['Library', options.filter === 'blog' ? 'Blog posts' : options.filter === 'project' ? 'Projects' : 'All content'],
      drafts: ['Library', 'Drafts'],
      editor: ['Editor', state.editorType === 'blog' ? 'Blog post editor' : 'Project editor'],
      media: ['Assets', 'Media library'],
      settings: ['System', 'Settings']
    };
    const [eyebrow, title] = titles[view] || ['', 'Content Studio'];
    el.pageEyebrow.textContent = eyebrow;
    el.pageTitle.textContent = title;
    if (view === 'content') {
      state.contentFilter = options.filter || state.contentFilter || 'all';
      $$('[data-content-filter]').forEach((button) => button.classList.toggle('active', button.dataset.contentFilter === state.contentFilter));
      renderContentLibrary();
      const navSelector = state.contentFilter === 'blog' ? '[data-view="content"][data-filter-type="blog"]' : state.contentFilter === 'project' ? '[data-view="content"][data-filter-type="project"]' : null;
      if (navSelector) $(navSelector)?.classList.add('active');
    } else if (view !== 'editor') {
      $(`.nav-item[data-view="${view}"]`)?.classList.add('active');
    }
    if (view === 'media') loadMedia();
    if (view === 'drafts') renderDrafts();
    closeSidebar();
  }

  function openSidebar() {
    el.sidebar.classList.add('open');
    el.sidebarBackdrop.hidden = false;
  }

  function closeSidebar() {
    el.sidebar.classList.remove('open');
    el.sidebarBackdrop.hidden = true;
  }

  function setEditorType(type, preserve = false) {
    state.editorType = type;
    $$('[data-editor-type]').forEach((button) => button.classList.toggle('active', button.dataset.editorType === type));
    el.tagField.hidden = type !== 'blog';
    el.technologyField.hidden = type !== 'project';
    el.demoField.hidden = type !== 'project';
    el.githubField.hidden = type !== 'project';
    el.detailType.textContent = type === 'blog' ? 'Blog post' : 'Project';
    el.editorModeLabel.textContent = state.editingItem ? `Editing ${type}` : `New ${type}`;
    el.publishButton.querySelector('span').textContent = state.editingItem ? 'Update' : 'Publish';
    const categories = type === 'blog' ? BLOG_CATEGORIES : PROJECT_CATEGORIES;
    const previous = preserve ? el.categoryInput.value : '';
    el.categoryInput.innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
    if (previous && categories.includes(previous)) el.categoryInput.value = previous;
    if (!preserve) {
      el.summaryInput.placeholder = type === 'blog' ? 'Write a short description for cards and search results' : 'Describe what the project does and why it matters';
    }
    updateEditorDerived();
  }

  function resetEditor() {
    clearTimeout(state.autosaveTimer);
    state.editingItem = null;
    state.originalSlug = '';
    state.currentDraftId = crypto.randomUUID ? crypto.randomUUID() : `draft-${Date.now()}`;
    state.coverFile = null;
    state.coverDataUrl = '';
    state.existingImage = '';
    state.sourceMode = false;
    el.contentForm.reset();
    el.richEditor.innerHTML = '';
    el.sourceEditor.value = '';
    el.sourceEditor.hidden = true;
    el.richEditor.hidden = false;
    el.sourceToggle.classList.remove('active');
    el.sourceToggle.textContent = 'HTML';
    el.dateInput.value = new Date().toLocaleDateString('en-CA');
    el.slugInput.disabled = false;
    el.documentStateBadge.textContent = 'Draft';
    el.editorDocumentTitle.textContent = 'Untitled content';
    el.detailSaved.textContent = 'Not saved';
    setCoverPreview('', '');
    setEditorType('blog');
    updateEditorDerived();
  }

  async function openEditor(type = 'blog', item = null, duplicate = false) {
    resetEditor();
    state.editingItem = duplicate ? null : item;
    state.originalSlug = duplicate ? '' : item?.slug || '';
    setEditorType(type);
    navigate('editor');
    if (!item) {
      el.editorModeLabel.textContent = `New ${type}`;
      el.documentStateBadge.textContent = 'Draft';
      return;
    }
    el.editorModeLabel.textContent = duplicate ? `Duplicate ${type}` : `Editing ${type}`;
    el.documentStateBadge.textContent = duplicate ? 'Draft' : 'Live';
    el.editorDocumentTitle.textContent = duplicate ? `${item.title} copy` : item.title;
    showFloatingStatus('Loading source from GitHub…');
    try {
      const source = await loadSourceDocument(item);
      const parsed = parseSourceDocument(source, type, item);
      const title = duplicate ? `${parsed.title || item.title} Copy` : parsed.title || item.title;
      el.titleInput.value = title;
      el.summaryInput.value = parsed.summary || item.excerpt || item.description || '';
      el.slugInput.value = duplicate ? `${slugify(title)}-copy` : item.slug;
      el.slugInput.disabled = !duplicate;
      el.categoryInput.value = parsed.category || item.category || el.categoryInput.options[0]?.value;
      el.dateInput.value = parsed.date || item.date || new Date().toLocaleDateString('en-CA');
      el.tagsInput.value = (parsed.tags || item.tags || []).join(', ');
      el.technologiesInput.value = (parsed.technologies || item.technologies || []).join(', ');
      el.demoInput.value = parsed.demo || item.demo || '';
      el.githubInput.value = parsed.github || item.github || '';
      el.seoTitleInput.value = parsed.seoTitle || '';
      el.seoDescriptionInput.value = parsed.seoDescription || '';
      el.canonicalInput.value = parsed.canonical || '';
      el.richEditor.innerHTML = parsed.content || '';
      state.existingImage = parsed.image || item.image || '';
      setCoverPreview(state.existingImage ? `../${state.existingImage}` : '', state.existingImage);
      updateEditorDerived();
      setAutosaveState('Loaded', true);
    } catch (error) {
      showFloatingStatus(error.message, 'error');
    }
  }

  async function loadSourceDocument(item) {
    if (IS_LOCAL_DEMO && !state.token) {
      const response = await fetch(`../${item.url}`);
      if (!response.ok) return '';
      return response.text();
    }
    const file = await githubRequest(`/repos/${OWNER}/${REPOSITORY}/contents/${encodePath(item.url)}?ref=${encodeURIComponent(BRANCH)}`);
    return decodeBase64Utf8(file.content);
  }

  function encodePath(value) {
    return String(value).split('/').map(encodeURIComponent).join('/');
  }

  function parseSourceDocument(html, type, fallback) {
    if (!html) return { title: fallback.title, summary: fallback.excerpt || fallback.description, content: '' };
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const meta = (name) => doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || '';
    const root = doc.querySelector('.article-content')?.cloneNode(true);
    if (type === 'project' && root?.firstElementChild?.tagName === 'P') {
      const firstText = root.firstElementChild.textContent.trim();
      const description = meta('project-description') || fallback.description || '';
      if (firstText === description.trim()) root.firstElementChild.remove();
    }
    return type === 'blog' ? {
      title: meta('post-title') || fallback.title,
      category: meta('post-category') || fallback.category,
      date: meta('post-date') || fallback.date,
      summary: meta('post-excerpt') || fallback.excerpt,
      tags: parseList(meta('post-tags')),
      image: normalizeImageMetadata(meta('post-image'), 'blog', fallback.slug),
      seoTitle: doc.querySelector('meta[property="og:title"]')?.content || '',
      seoDescription: doc.querySelector('meta[name="description"]')?.content || '',
      canonical: doc.querySelector('link[rel="canonical"]')?.href || '',
      content: root?.innerHTML.trim() || ''
    } : {
      title: meta('project-title') || fallback.title,
      category: meta('project-category') || fallback.category,
      date: meta('project-date') || fallback.date,
      summary: meta('project-description') || fallback.description,
      technologies: parseList(meta('project-technologies')),
      image: normalizeImageMetadata(meta('project-image'), 'project', fallback.slug),
      demo: meta('project-demo') || fallback.demo || '',
      github: meta('project-github') || fallback.github || '',
      seoTitle: doc.querySelector('meta[property="og:title"]')?.content || '',
      seoDescription: doc.querySelector('meta[name="description"]')?.content || '',
      canonical: doc.querySelector('link[rel="canonical"]')?.href || '',
      content: root?.innerHTML.trim() || ''
    };
  }

  function normalizeImageMetadata(value, type, slug) {
    if (!value) return '';
    if (value.startsWith('assets/')) return value;
    return `assets/images/${type === 'blog' ? 'blog' : 'works'}/${value || `${slug}.jpg`}`;
  }

  function collectEditorValues() {
    if (state.sourceMode) el.richEditor.innerHTML = el.sourceEditor.value;
    return {
      title: el.titleInput.value.trim(),
      slug: slugify(el.slugInput.value || el.titleInput.value),
      summary: el.summaryInput.value.trim(),
      category: el.categoryInput.value,
      date: el.dateInput.value,
      tags: el.tagsInput.value.trim(),
      technologies: el.technologiesInput.value.trim(),
      demo: el.demoInput.value.trim(),
      github: el.githubInput.value.trim(),
      seoTitle: el.seoTitleInput.value.trim(),
      seoDescription: el.seoDescriptionInput.value.trim(),
      canonical: el.canonicalInput.value.trim(),
      content: sanitizeContent(el.richEditor.innerHTML)
    };
  }

  function validateEditor(requireCover = true) {
    const values = collectEditorValues();
    if (!values.title) throw new Error('Add a title.');
    if (!values.slug) throw new Error('Add a valid URL slug.');
    if (!values.summary) throw new Error(state.editorType === 'blog' ? 'Add an excerpt.' : 'Add a project summary.');
    if (!values.category) throw new Error('Choose a category.');
    if (!values.date) throw new Error('Choose a publication date.');
    if (!values.content || !stripHtml(values.content)) throw new Error('Write the page content before publishing.');
    if (requireCover && !state.coverFile && !state.existingImage) throw new Error('Add a cover image.');
    if (state.coverFile && state.coverFile.size > MAX_IMAGE_BYTES) throw new Error('The cover image must be smaller than 8 MB.');
    return values;
  }

  function sanitizeContent(html) {
    const documentValue = new DOMParser().parseFromString(`<div id="content-root">${html}</div>`, 'text/html');
    const root = documentValue.querySelector('#content-root');
    root.querySelectorAll('script, iframe, object, embed, form, input, button, style, link').forEach((node) => node.remove());
    root.querySelectorAll('*').forEach((node) => {
      [...node.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim().toLowerCase();
        if (name.startsWith('on') || value.startsWith('javascript:') || name === 'style') node.removeAttribute(attribute.name);
      });
      if (node.tagName === 'A') {
        node.setAttribute('rel', 'noopener noreferrer');
        if (/^https?:/i.test(node.getAttribute('href') || '')) node.setAttribute('target', '_blank');
      }
    });
    return root.innerHTML.trim();
  }

  function stripHtml(html) {
    return new DOMParser().parseFromString(html, 'text/html').body.textContent.replace(/\s+/g, ' ').trim();
  }

  function updateEditorDerived() {
    const title = el.titleInput.value.trim();
    if (!state.editingItem && el.slugInput.dataset.manual !== 'true') el.slugInput.value = slugify(title);
    el.editorDocumentTitle.textContent = title || `Untitled ${state.editorType === 'blog' ? 'blog post' : 'project'}`;
    const text = stripHtml(state.sourceMode ? el.sourceEditor.value : el.richEditor.innerHTML);
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    el.wordCount.textContent = `${words} word${words === 1 ? '' : 's'}`;
    el.readTime.textContent = `${Math.max(1, Math.ceil(words / 200))} min read`;
    el.characterCount.textContent = `${text.length} characters`;
    el.seoPreviewTitle.textContent = el.seoTitleInput.value.trim() || title || 'Untitled content';
    el.seoPreviewDescription.textContent = el.seoDescriptionInput.value.trim() || el.summaryInput.value.trim() || 'Add a summary to preview the search result description.';
    el.detailCover.textContent = state.coverFile ? 'New image' : state.existingImage ? 'Existing image' : 'Required';
    el.previewUrl.textContent = `nandakumarm.dpdns.org/${state.editorType === 'blog' ? 'blog' : 'works'}/${el.slugInput.value || 'untitled'}.html`;
    scheduleAutosave();
  }

  function scheduleAutosave() {
    if (state.view !== 'editor') return;
    clearTimeout(state.autosaveTimer);
    setAutosaveState('Saving…');
    state.autosaveTimer = setTimeout(() => saveDraft(false), 900);
  }

  function setAutosaveState(label, saved = false) {
    el.autosaveStatus.innerHTML = `<svg><use href="#${saved ? 'i-check' : 'i-refresh'}"></use></svg>${escapeHtml(label)}`;
  }

  function saveDraft(showMessage = true) {
    try {
      const values = collectEditorValues();
      if (!values.title && !values.summary && !stripHtml(values.content)) {
        setAutosaveState('Not saved');
        return;
      }
      const drafts = getDrafts().filter((draft) => draft.id !== state.currentDraftId);
      const draft = {
        id: state.currentDraftId,
        type: state.editorType,
        title: values.title,
        slug: values.slug,
        summary: values.summary,
        category: values.category,
        date: values.date,
        tags: values.tags,
        technologies: values.technologies,
        demo: values.demo,
        github: values.github,
        seoTitle: values.seoTitle,
        seoDescription: values.seoDescription,
        canonical: values.canonical,
        content: values.content,
        existingImage: state.existingImage,
        originalSlug: state.originalSlug,
        editingItem: state.editingItem,
        savedAt: new Date().toISOString()
      };
      drafts.unshift(draft);
      writeJsonStorage(DRAFT_KEY, drafts.slice(0, 30));
      el.detailSaved.textContent = 'Just now';
      setAutosaveState('Saved', true);
      renderCounts();
      if (showMessage) toast('Draft saved', 'Stored in this browser.');
    } catch (error) {
      setAutosaveState('Save failed');
      if (showMessage) toast('Draft not saved', error.message, 'error');
    }
  }

  function openDraft(id) {
    const draft = getDrafts().find((item) => item.id === id);
    if (!draft) return;
    resetEditor();
    state.currentDraftId = draft.id;
    state.editingItem = draft.editingItem || null;
    state.originalSlug = draft.originalSlug || '';
    state.existingImage = draft.existingImage || '';
    setEditorType(draft.type);
    el.titleInput.value = draft.title || '';
    el.slugInput.value = draft.slug || '';
    el.slugInput.disabled = Boolean(state.editingItem && !draft.slug?.endsWith('-copy'));
    el.summaryInput.value = draft.summary || '';
    el.categoryInput.value = draft.category || el.categoryInput.options[0]?.value;
    el.dateInput.value = draft.date || new Date().toLocaleDateString('en-CA');
    el.tagsInput.value = draft.tags || '';
    el.technologiesInput.value = draft.technologies || '';
    el.demoInput.value = draft.demo || '';
    el.githubInput.value = draft.github || '';
    el.seoTitleInput.value = draft.seoTitle || '';
    el.seoDescriptionInput.value = draft.seoDescription || '';
    el.canonicalInput.value = draft.canonical || '';
    el.richEditor.innerHTML = draft.content || '';
    setCoverPreview(state.existingImage ? `../${state.existingImage}` : '', state.existingImage);
    el.documentStateBadge.textContent = state.editingItem ? 'Live edit' : 'Draft';
    navigate('editor');
    updateEditorDerived();
    setAutosaveState('Loaded', true);
  }

  function deleteDraft(id) {
    writeJsonStorage(DRAFT_KEY, getDrafts().filter((draft) => draft.id !== id));
    renderDrafts();
    renderCounts();
    toast('Draft deleted');
  }

  function setCoverPreview(src, label = '') {
    if (src) {
      el.coverPreview.src = src;
      el.coverPreview.hidden = false;
      el.coverPlaceholder.hidden = true;
      el.coverActions.hidden = false;
      el.coverPreview.alt = label ? `Cover preview: ${label}` : 'Cover preview';
    } else {
      el.coverPreview.removeAttribute('src');
      el.coverPreview.hidden = true;
      el.coverPlaceholder.hidden = false;
      el.coverActions.hidden = true;
      el.coverPreview.alt = '';
    }
    updateEditorDerived();
  }

  function selectCover(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
      toast('Unsupported image', 'Use PNG, JPG, WebP or GIF.', 'error');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast('Image is too large', 'Use an image smaller than 8 MB.', 'error');
      return;
    }
    state.coverFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      state.coverDataUrl = String(reader.result);
      setCoverPreview(state.coverDataUrl, file.name);
    };
    reader.readAsDataURL(file);
  }

  function clearCover() {
    state.coverFile = null;
    state.coverDataUrl = '';
    state.existingImage = '';
    el.coverInput.value = '';
    setCoverPreview('', '');
  }

  function imageExtension(file) {
    const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
    return map[file.type] || slugify(file.name.split('.').pop()) || 'jpg';
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Unable to read the selected image.'));
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.readAsDataURL(file);
    });
  }

  function siteHeader(active) {
    const item = (href, label, key) => `<a${active === key ? ' class="active" aria-current="page"' : ''} href="${href}">${label}</a>`;
    return `<header class="site-header glass">
      <a class="brand" href="../index.html" aria-label="Nandakumar M home"><span class="brand-mark">NM</span><span><strong>Nandakumar M</strong><small>Electrical &amp; Electronics Design Engineer</small></span></a>
      <button class="nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false"><span></span><span></span><span></span></button>
      <nav class="site-nav" aria-label="Main navigation">${item('../index.html', 'Home', 'home')}${item('../projects.html', 'Projects', 'projects')}${item('../blog.html', 'Blog', 'blog')}${item('../about.html', 'About', 'about')}</nav>
      <button class="theme-toggle" type="button" aria-label="Toggle dark and light theme"><span class="theme-icon" aria-hidden="true"></span></button>
    </header>`;
  }

  function siteFooter() {
    return `<footer class="site-footer"><p>&copy; <span data-year></span> Nandakumar M.</p><div><a href="mailto:nandakumarmkdpm@gmail.com">Email</a><a href="https://github.com/nandurpm" target="_blank" rel="noopener noreferrer">GitHub</a></div></footer>`;
  }

  function documentShell({ title, description, metadata, canonical, active, body }) {
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${safeDescription}">
  <meta name="author" content="Nandakumar M">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:type" content="article">
  ${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : ''}
${metadata}
  <title>${safeTitle} | Nandakumar M</title>
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
  <div class="site-shell">${siteHeader(active)}<main>${body}</main>${siteFooter()}</div>
  <script src="https://unpkg.com/aos@2.3.1/dist/aos.js"></script>
  <script src="../assets/js/theme.js"></script>
  <script src="../assets/js/main.js"></script>
</body>
</html>`;
  }

  function buildDocument(values, imageMeta, pageImageSrc) {
    const seoTitle = values.seoTitle || values.title;
    const seoDescription = values.seoDescription || values.summary;
    const content = sanitizeContent(values.content);
    if (state.editorType === 'blog') {
      const metadata = `  <meta name="post-title" content="${escapeHtml(values.title)}">
  <meta name="post-slug" content="${escapeHtml(values.slug)}">
  <meta name="post-category" content="${escapeHtml(values.category)}">
  <meta name="post-date" content="${escapeHtml(values.date)}">
  <meta name="post-excerpt" content="${escapeHtml(values.summary)}">
  <meta name="post-tags" content="${escapeHtml(values.tags || '')}">
  <meta name="post-image" content="${escapeHtml(imageMeta)}">`;
      const body = `<article class="blog-article">
        <header class="article-header"><p class="eyebrow"><a href="../blog.html">← Back to Blog</a></p><h1>${escapeHtml(values.title)}</h1><div class="article-meta"><time datetime="${escapeHtml(values.date)}">${escapeHtml(formatDate(values.date))}</time><span>${escapeHtml(values.category)}</span></div><img src="${escapeHtml(pageImageSrc)}" alt="${escapeHtml(values.title)}" class="article-image"></header>
        <div class="article-content">${content}</div>
        <footer class="article-footer"><a class="btn ghost" href="../blog.html">← Back to all posts</a></footer>
      </article>`;
      return documentShell({ title: seoTitle, description: seoDescription, metadata, canonical: values.canonical, active: 'blog', body });
    }
    const buttons = [
      values.demo ? `<a class="btn primary" href="${escapeHtml(values.demo)}" target="_blank" rel="noopener noreferrer">Open live project</a>` : '',
      values.github ? `<a class="btn ghost" href="${escapeHtml(values.github)}" target="_blank" rel="noopener noreferrer">View source</a>` : ''
    ].filter(Boolean).join('');
    const metadata = `  <meta name="project-title" content="${escapeHtml(values.title)}">
  <meta name="project-slug" content="${escapeHtml(values.slug)}">
  <meta name="project-category" content="${escapeHtml(values.category)}">
  <meta name="project-date" content="${escapeHtml(values.date)}">
  <meta name="project-description" content="${escapeHtml(values.summary)}">
  <meta name="project-technologies" content="${escapeHtml(values.technologies || '')}">
  <meta name="project-image" content="${escapeHtml(imageMeta)}">
  <meta name="project-demo" content="${escapeHtml(values.demo || '')}">
  <meta name="project-github" content="${escapeHtml(values.github || '')}">`;
    const body = `<article class="blog-article">
      <header class="article-header"><p class="eyebrow"><a href="../projects.html">← Back to Projects</a></p><h1>${escapeHtml(values.title)}</h1><div class="article-meta"><time datetime="${escapeHtml(values.date)}">${escapeHtml(formatDate(values.date))}</time><span>${escapeHtml(values.category)}</span></div><img src="${escapeHtml(pageImageSrc)}" alt="${escapeHtml(values.title)}" class="article-image"></header>
      <div class="article-content"><p>${escapeHtml(values.summary)}</p>${content}</div>
      ${buttons ? `<footer class="article-footer"><div class="button-row">${buttons}</div></footer>` : ''}
    </article>`;
    return documentShell({ title: seoTitle, description: seoDescription, metadata, canonical: values.canonical, active: 'projects', body });
  }

  function previewDocument() {
    try {
      const values = validateEditor(false);
      const folder = state.editorType === 'blog' ? 'blog' : 'works';
      let imageMeta = state.existingImage;
      let pageImageSrc = state.existingImage ? `../${state.existingImage}` : '';
      if (state.coverFile) {
        const imageName = `${values.slug}.${imageExtension(state.coverFile)}`;
        imageMeta = imageName;
        pageImageSrc = state.coverDataUrl;
      }
      if (!pageImageSrc) pageImageSrc = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="100%" height="100%" fill="#122338"/></svg>');
      const html = buildDocument(values, imageMeta || `assets/images/${folder}/${values.slug}.jpg`, pageImageSrc);
      el.previewFrame.srcdoc = html;
      if (!el.previewDialog.open) el.previewDialog.showModal();
    } catch (error) {
      showFloatingStatus(error.message, 'error');
    }
  }

  async function commitChanges(changes, message, attempt = 0) {
    const reference = await githubRequest(`/repos/${OWNER}/${REPOSITORY}/git/ref/heads/${encodeURIComponent(BRANCH)}`);
    const headSha = reference.object.sha;
    const commit = await githubRequest(`/repos/${OWNER}/${REPOSITORY}/git/commits/${headSha}`);
    const tree = [];
    for (const change of changes) {
      if (change.delete) {
        tree.push({ path: change.path, mode: '100644', type: 'blob', sha: null });
        continue;
      }
      const blob = await githubRequest(`/repos/${OWNER}/${REPOSITORY}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({ content: change.content, encoding: change.encoding || 'utf-8' })
      });
      tree.push({ path: change.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const nextTree = await githubRequest(`/repos/${OWNER}/${REPOSITORY}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({ base_tree: commit.tree.sha, tree })
    });
    const nextCommit = await githubRequest(`/repos/${OWNER}/${REPOSITORY}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({ message, tree: nextTree.sha, parents: [headSha] })
    });
    try {
      await githubRequest(`/repos/${OWNER}/${REPOSITORY}/git/refs/heads/${encodeURIComponent(BRANCH)}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: nextCommit.sha, force: false })
      });
      return nextCommit;
    } catch (error) {
      if (attempt === 0 && [409, 422].includes(error.status)) return commitChanges(changes, message, 1);
      throw error;
    }
  }

  async function publishContent() {
    const values = validateEditor(true);
    const type = state.editorType;
    const uploadFolder = type === 'blog' ? 'blog' : 'projects';
    const imageFolder = type === 'blog' ? 'blog' : 'works';
    let imageMeta = state.existingImage;
    let pageImageSrc = state.existingImage ? `../${state.existingImage}` : '';
    const changes = [];
    if (state.coverFile) {
      const imageName = `${values.slug}.${imageExtension(state.coverFile)}`;
      imageMeta = imageName;
      pageImageSrc = `../assets/images/${imageFolder}/${imageName}`;
      changes.push({ path: `uploads/${uploadFolder}/${imageName}`, content: await readFileAsBase64(state.coverFile), encoding: 'base64' });
    }
    const html = buildDocument(values, imageMeta, pageImageSrc);
    changes.unshift({ path: `uploads/${uploadFolder}/${values.slug}.html`, content: html, encoding: 'utf-8' });
    el.publishButton.disabled = true;
    showFloatingStatus('Uploading content to GitHub…');
    try {
      const commit = await commitChanges(changes, `${state.editingItem ? 'Update' : 'Upload'} ${type}: ${values.title}`);
      removeCurrentDraft();
      toast(state.editingItem ? 'Update submitted' : 'Publish submitted', `GitHub Actions started from ${commit.sha.slice(0, 7)}.`);
      showFloatingStatus('Uploaded. GitHub Actions is publishing the page.', 'success');
      await loadWorkflows();
      renderCounts();
      setTimeout(() => navigate('dashboard'), 900);
    } catch (error) {
      if (error.status === 401) showLogin();
      showFloatingStatus(error.message, 'error');
      toast('Publishing failed', error.message, 'error');
    } finally {
      el.publishButton.disabled = false;
    }
  }

  function removeCurrentDraft() {
    writeJsonStorage(DRAFT_KEY, getDrafts().filter((draft) => draft.id !== state.currentDraftId));
    renderDrafts();
  }

  async function unpublishItem(item) {
    if (IS_LOCAL_DEMO && !state.token) {
      state.content[item.type] = state.content[item.type].filter((entry) => entry.slug !== item.slug);
      renderAll();
      toast('Content removed in demo mode');
      return;
    }
    const dataPath = item.type === 'blog' ? 'assets/data/blog.json' : 'assets/data/works.json';
    showFloatingStatus(`Unpublishing ${item.title}…`);
    try {
      const dataFile = await githubRequest(`/repos/${OWNER}/${REPOSITORY}/contents/${encodePath(dataPath)}?ref=${encodeURIComponent(BRANCH)}`);
      const items = JSON.parse(decodeBase64Utf8(dataFile.content));
      const filtered = items.filter((entry) => {
        const entrySlug = entry.slug || String(entry.url || '').split('/').pop()?.replace(/\.html$/i, '');
        return entrySlug !== item.slug;
      });
      const changes = [{ path: dataPath, content: `${JSON.stringify(filtered, null, 2)}\n`, encoding: 'utf-8' }];
      try {
        await githubRequest(`/repos/${OWNER}/${REPOSITORY}/contents/${encodePath(item.url)}?ref=${encodeURIComponent(BRANCH)}`);
        changes.push({ path: item.url, delete: true });
      } catch (error) {
        if (error.status !== 404) throw error;
      }
      await commitChanges(changes, `Unpublish ${item.type}: ${item.title}`);
      state.content[item.type] = state.content[item.type].filter((entry) => entry.slug !== item.slug);
      renderAll();
      showFloatingStatus('Content unpublished.', 'success');
      toast('Content unpublished', 'The page and listing entry were removed.');
    } catch (error) {
      showFloatingStatus(error.message, 'error');
      toast('Unable to unpublish', error.message, 'error');
    }
  }

  function askConfirmation({ title, message, actionLabel = 'Confirm', action }) {
    state.confirmAction = action;
    el.confirmTitle.textContent = title;
    el.confirmMessage.textContent = message;
    el.confirmActionButton.textContent = actionLabel;
    el.confirmDialog.showModal();
  }

  async function loadMedia() {
    el.mediaGrid.innerHTML = `<div class="empty-state surface"><svg><use href="#i-image"></use></svg><h3>Loading media</h3><p>Images will appear here after GitHub responds.</p></div>`;
    try {
      if (IS_LOCAL_DEMO && !state.token) {
        const unique = new Map();
        allContent().filter((item) => item.image).forEach((item) => unique.set(item.image, { name: item.image.split('/').pop(), path: item.image, download_url: `../${item.image}`, type: item.type }));
        state.media = [...unique.values()];
      } else {
        const [blog, projects] = await Promise.all([
          githubRequest(`/repos/${OWNER}/${REPOSITORY}/contents/assets/images/blog?ref=${encodeURIComponent(BRANCH)}`),
          githubRequest(`/repos/${OWNER}/${REPOSITORY}/contents/assets/images/works?ref=${encodeURIComponent(BRANCH)}`)
        ]);
        state.media = [
          ...blog.filter((file) => file.type === 'file').map((file) => ({ ...file, type: 'blog' })),
          ...projects.filter((file) => file.type === 'file').map((file) => ({ ...file, type: 'project' }))
        ].filter((file) => /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name));
      }
      renderMedia();
    } catch (error) {
      el.mediaGrid.innerHTML = `<div class="empty-state surface"><svg><use href="#i-close"></use></svg><h3>Media unavailable</h3><p>${escapeHtml(error.message)}</p></div>`;
    }
  }

  function renderMedia() {
    const items = state.mediaFilter === 'all' ? state.media : state.media.filter((item) => item.type === state.mediaFilter);
    el.mediaGrid.innerHTML = items.length ? items.map((item) => `
      <article class="media-card">
        <img src="${escapeHtml(item.download_url || `../${item.path}`)}" alt="" loading="lazy">
        <div class="media-card-body"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.path)}</small><div class="media-card-actions"><button class="button secondary" type="button" data-copy-path="${escapeHtml(item.path)}">Copy path</button><a class="button soft" href="${escapeHtml(item.download_url || `../${item.path}`)}" target="_blank" rel="noopener noreferrer">Open</a></div></div>
      </article>`).join('') : `<div class="empty-state surface"><svg><use href="#i-image"></use></svg><h3>No images found</h3><p>This folder does not contain supported image files.</p></div>`;
  }

  function handleFormatCommand(button) {
    const command = button.dataset.command;
    const value = button.dataset.value || null;
    el.richEditor.focus();
    if (command === 'createLink') {
      const url = prompt('Enter the link URL');
      if (!url) return;
      document.execCommand('createLink', false, url);
    } else if (command === 'formatBlock') {
      document.execCommand('formatBlock', false, value);
    } else {
      document.execCommand(command, false, value);
    }
    updateEditorDerived();
  }

  function toggleSourceMode() {
    state.sourceMode = !state.sourceMode;
    if (state.sourceMode) {
      el.sourceEditor.value = el.richEditor.innerHTML;
      el.richEditor.hidden = true;
      el.sourceEditor.hidden = false;
      el.sourceToggle.classList.add('active');
      el.sourceToggle.textContent = 'Visual';
      el.sourceEditor.focus();
    } else {
      el.richEditor.innerHTML = sanitizeContent(el.sourceEditor.value);
      el.sourceEditor.hidden = true;
      el.richEditor.hidden = false;
      el.sourceToggle.classList.remove('active');
      el.sourceToggle.textContent = 'HTML';
      el.richEditor.focus();
    }
    updateEditorDerived();
  }

  function findItem(type, slug) {
    return state.content[type]?.find((item) => item.slug === slug);
  }

  function setupEvents() {
    el.githubLoginButton.addEventListener('click', startGitHubLogin);
    window.addEventListener('message', async (event) => {
      if (event.origin !== location.origin || event.data?.type !== 'portfolio-github-oauth') return;
      if (event.data.error) {
        setStatus(el.loginStatus, event.data.error, 'error');
        return;
      }
      setStatus(el.loginStatus, 'Verifying GitHub access…');
      try {
        await authenticate(event.data.token, 'oauth');
        setStatus(el.loginStatus);
      } catch (error) {
        state.token = '';
        safeSessionRemove(TOKEN_KEY);
        setStatus(el.loginStatus, error.message, 'error');
      }
    });
    el.loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = el.loginForm.querySelector('button');
      button.disabled = true;
      setStatus(el.loginStatus, 'Checking repository access…');
      try {
        await authenticate(el.tokenInput.value, 'token');
        setStatus(el.loginStatus);
      } catch (error) {
        state.token = '';
        safeSessionRemove(TOKEN_KEY);
        setStatus(el.loginStatus, error.message, 'error');
      } finally {
        button.disabled = false;
      }
    });
    [el.logoutButton, el.settingsSignOut].forEach((button) => button.addEventListener('click', showLogin));
    el.sidebarOpen.addEventListener('click', openSidebar);
    el.sidebarClose.addEventListener('click', closeSidebar);
    el.sidebarBackdrop.addEventListener('click', closeSidebar);

    $$('[data-view]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.view, { filter: button.dataset.filterType || 'all' })));
    $$('[data-new]').forEach((button) => button.addEventListener('click', () => openEditor(button.dataset.new || 'blog')));
    $$('[data-content-filter]').forEach((button) => button.addEventListener('click', () => {
      state.contentFilter = button.dataset.contentFilter;
      $$('[data-content-filter]').forEach((entry) => entry.classList.toggle('active', entry === button));
      renderContentLibrary();
    }));
    el.contentSearch.addEventListener('input', renderContentLibrary);
    el.contentSort.addEventListener('change', renderContentLibrary);
    el.globalSearch.addEventListener('input', () => {
      el.contentSearch.value = el.globalSearch.value;
      if (el.globalSearch.value.trim()) navigate('content', { filter: 'all' });
      renderContentLibrary();
    });

    el.contentLibrary.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]');
      if (!action) return;
      const row = action.closest('[data-type][data-slug]');
      const item = findItem(row.dataset.type, row.dataset.slug);
      if (!item) return;
      if (action.dataset.action === 'edit') openEditor(item.type, item);
      if (action.dataset.action === 'duplicate') openEditor(item.type, item, true);
      if (action.dataset.action === 'unpublish') {
        const execute = () => unpublishItem(item);
        if (state.settings.confirmDelete) askConfirmation({ title: `Unpublish “${item.title}”?`, message: 'The listing and public HTML page will be removed. The cover image will remain in the media library.', actionLabel: 'Unpublish', action: execute });
        else execute();
      }
    });

    el.draftLibrary.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      const card = event.target.closest('[data-draft-id]');
      if (!button || !card) return;
      if (button.dataset.action === 'edit-draft') openDraft(card.dataset.draftId);
      if (button.dataset.action === 'delete-draft') deleteDraft(card.dataset.draftId);
    });
    el.clearDraftsButton.addEventListener('click', () => askConfirmation({ title: 'Clear all drafts?', message: 'All locally saved drafts in this browser will be removed.', actionLabel: 'Clear drafts', action: () => { writeJsonStorage(DRAFT_KEY, []); renderDrafts(); renderCounts(); toast('Drafts cleared'); } }));

    $$('[data-editor-type]').forEach((button) => button.addEventListener('click', () => {
      if (state.editingItem) return toast('Content type is locked', 'Duplicate the item to create it as another type.', 'error');
      setEditorType(button.dataset.editorType, true);
    }));
    el.titleInput.addEventListener('input', updateEditorDerived);
    el.summaryInput.addEventListener('input', updateEditorDerived);
    el.slugInput.addEventListener('input', () => {
      el.slugInput.dataset.manual = el.slugInput.value ? 'true' : 'false';
      el.slugInput.value = slugify(el.slugInput.value);
      updateEditorDerived();
    });
    [el.categoryInput, el.dateInput, el.tagsInput, el.technologiesInput, el.demoInput, el.githubInput, el.seoTitleInput, el.seoDescriptionInput, el.canonicalInput].forEach((input) => input.addEventListener('input', updateEditorDerived));
    el.richEditor.addEventListener('input', updateEditorDerived);
    el.sourceEditor.addEventListener('input', updateEditorDerived);
    el.blockFormat.addEventListener('change', () => {
      el.richEditor.focus();
      document.execCommand('formatBlock', false, el.blockFormat.value);
      updateEditorDerived();
    });
    $$('.editor-toolbar [data-command]').forEach((button) => button.addEventListener('click', () => handleFormatCommand(button)));
    el.sourceToggle.addEventListener('click', toggleSourceMode);

    const openFilePicker = () => el.coverInput.click();
    el.coverDropzone.addEventListener('click', (event) => {
      if (event.target.closest('#removeCoverButton')) return;
      if (event.target.closest('#replaceCoverButton') || !state.coverFile && !state.existingImage) openFilePicker();
    });
    el.coverDropzone.addEventListener('keydown', (event) => {
      if (['Enter', ' '].includes(event.key)) { event.preventDefault(); openFilePicker(); }
    });
    el.coverInput.addEventListener('change', () => selectCover(el.coverInput.files[0]));
    ['dragenter', 'dragover'].forEach((name) => el.coverDropzone.addEventListener(name, (event) => { event.preventDefault(); el.coverDropzone.classList.add('dragging'); }));
    ['dragleave', 'drop'].forEach((name) => el.coverDropzone.addEventListener(name, (event) => { event.preventDefault(); el.coverDropzone.classList.remove('dragging'); }));
    el.coverDropzone.addEventListener('drop', (event) => selectCover(event.dataTransfer.files[0]));
    el.replaceCoverButton.addEventListener('click', (event) => { event.stopPropagation(); openFilePicker(); });
    el.removeCoverButton.addEventListener('click', (event) => { event.stopPropagation(); clearCover(); });

    el.saveDraftButton.addEventListener('click', () => saveDraft(true));
    el.previewButton.addEventListener('click', previewDocument);
    el.editorBackButton.addEventListener('click', () => navigate('content', { filter: state.editorType }));
    el.contentForm.addEventListener('submit', (event) => { event.preventDefault(); publishContent(); });

    $$('[data-inspector-tab]').forEach((button) => button.addEventListener('click', () => {
      $$('[data-inspector-tab]').forEach((entry) => entry.classList.toggle('active', entry === button));
      $$('[data-inspector-panel]').forEach((panel) => { panel.hidden = panel.dataset.inspectorPanel !== button.dataset.inspectorTab; panel.classList.toggle('active', !panel.hidden); });
    }));

    el.closePreviewButton.addEventListener('click', () => el.previewDialog.close());
    $$('[data-preview-size]').forEach((button) => button.addEventListener('click', () => {
      $$('[data-preview-size]').forEach((entry) => entry.classList.toggle('active', entry === button));
      el.previewDevice.className = `preview-device ${button.dataset.previewSize}`;
    }));
    el.previewDialog.addEventListener('click', (event) => { if (event.target === el.previewDialog) el.previewDialog.close(); });

    el.confirmDialog.addEventListener('close', async () => {
      if (el.confirmDialog.returnValue === 'confirm' && state.confirmAction) await state.confirmAction();
      state.confirmAction = null;
    });

    $$('.media-filters [data-media-filter]').forEach((button) => button.addEventListener('click', () => {
      state.mediaFilter = button.dataset.mediaFilter;
      $$('.media-filters [data-media-filter]').forEach((entry) => entry.classList.toggle('active', entry === button));
      renderMedia();
    }));
    el.refreshMediaButton.addEventListener('click', loadMedia);
    el.mediaGrid.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-copy-path]');
      if (!button) return;
      await navigator.clipboard.writeText(button.dataset.copyPath);
      toast('Path copied', button.dataset.copyPath);
    });

    el.autoPreviewSetting.checked = Boolean(state.settings.autoPreview);
    el.confirmDeleteSetting.checked = Boolean(state.settings.confirmDelete);
    el.autoPreviewSetting.addEventListener('change', () => { state.settings.autoPreview = el.autoPreviewSetting.checked; writeJsonStorage(SETTINGS_KEY, state.settings); });
    el.confirmDeleteSetting.addEventListener('change', () => { state.settings.confirmDelete = el.confirmDeleteSetting.checked; writeJsonStorage(SETTINGS_KEY, state.settings); });
  }

  async function initialize() {
    setupEvents();
    resetEditor();
    await checkOAuthAvailability();
    if (IS_LOCAL_DEMO && !state.token) {
      state.authMode = 'demo';
      state.user = { login: OWNER, name: 'Nandakumar M', avatar_url: '' };
      await showStudio(state.user);
      return;
    }
    if (state.token) {
      try {
        await authenticate(state.token, 'token');
      } catch {
        showLogin();
      }
    }
  }

  initialize();
})();
