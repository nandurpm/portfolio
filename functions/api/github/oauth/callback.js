const COOKIE_PATH = '/api/github/oauth';

function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
      const index = part.indexOf('=');
      const name = index >= 0 ? part.slice(0, index) : part;
      const value = index >= 0 ? part.slice(index + 1) : '';
      return [name, decodeURIComponent(value)];
    })
  );
}

function clearCookie(name) {
  return `${name}=; Max-Age=0; Path=${COOKIE_PATH}; HttpOnly; Secure; SameSite=Lax`;
}

function popupResponse(origin, payload, status = 200) {
  const safeOrigin = JSON.stringify(origin).replaceAll('<', '\\u003c');
  const safePayload = JSON.stringify({ type: 'portfolio-github-oauth', ...payload }).replaceAll('<', '\\u003c');
  const isError = Boolean(payload.error);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>GitHub login</title>
  <style>
    :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 15% 0%,rgba(69,185,255,.16),transparent 28rem),#07111f;color:#edf5ff;font:15px Inter,system-ui,sans-serif}.card{width:min(440px,calc(100% - 30px));padding:30px;border:1px solid rgba(148,174,204,.24);border-radius:20px;background:#0e1c2e;box-shadow:0 28px 80px rgba(0,0,0,.38);text-align:center}.mark{width:52px;height:52px;display:grid;place-items:center;margin:0 auto 18px;border-radius:15px;background:${isError ? 'rgba(255,107,122,.12)' : 'linear-gradient(135deg,#61c8ff,#35dca1)'};color:${isError ? '#ff8996' : '#031522'};font-weight:900}h1{margin:0;font-size:1.35rem}p{margin:10px 0 0;color:#91a5bf;line-height:1.6}</style>
</head>
<body>
  <main class="card"><div class="mark">${isError ? '!' : '✓'}</div><h1>${isError ? 'GitHub login failed' : 'GitHub connected'}</h1><p>${isError ? 'Return to Content Studio and try again.' : 'You can close this window. Content Studio will continue automatically.'}</p></main>
  <script>
    const targetOrigin = ${safeOrigin};
    const payload = ${safePayload};
    if (window.opener) {
      window.opener.postMessage(payload, targetOrigin);
      setTimeout(() => window.close(), 500);
    }
  </script>
</body>
</html>`;
  const headers = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff'
  });
  headers.append('Set-Cookie', clearCookie('portfolio_oauth_state'));
  headers.append('Set-Cookie', clearCookie('portfolio_oauth_verifier'));
  return new Response(html, { status, headers });
}

async function githubJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `GitHub request failed (${response.status}).`);
  return data;
}

export async function onRequestGet({ request, env }) {
  const requestUrl = new URL(request.url);
  const origin = env.SITE_ORIGIN || requestUrl.origin;
  const callbackUrl = `${origin.replace(/\/$/, '')}/api/github/oauth/callback`;
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const code = requestUrl.searchParams.get('code');
  const returnedState = requestUrl.searchParams.get('state');
  const oauthError = requestUrl.searchParams.get('error_description') || requestUrl.searchParams.get('error');

  if (oauthError) return popupResponse(origin, { error: oauthError }, 400);
  if (!code || !returnedState || !cookies.portfolio_oauth_state || returnedState !== cookies.portfolio_oauth_state) {
    return popupResponse(origin, { error: 'The OAuth state check failed. Start the login again.' }, 400);
  }
  if (!cookies.portfolio_oauth_verifier) {
    return popupResponse(origin, { error: 'The OAuth verifier is missing or expired.' }, 400);
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return popupResponse(origin, { error: 'OAuth environment variables are not configured.' }, 503);
  }

  try {
    const token = await githubJson('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl,
        code_verifier: cookies.portfolio_oauth_verifier
      })
    });
    if (!token.access_token) throw new Error(token.error_description || token.error || 'GitHub did not return an access token.');

    const apiHeaders = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token.access_token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    };
    const user = await githubJson('https://api.github.com/user', { headers: apiHeaders });
    const owner = env.GITHUB_OWNER || 'nandurpm';
    const repository = env.GITHUB_REPOSITORY || 'portfolio';
    if (String(user.login).toLowerCase() !== owner.toLowerCase()) {
      throw new Error(`This Content Studio accepts the ${owner} GitHub account only.`);
    }
    const repo = await githubJson(`https://api.github.com/repos/${owner}/${repository}`, { headers: apiHeaders });
    const canWrite = repo.permissions?.push || repo.permissions?.admin || repo.permissions?.maintain;
    if (!canWrite) throw new Error('The authorized GitHub account does not have repository write access.');

    return popupResponse(origin, {
      token: token.access_token,
      user: { login: user.login, name: user.name, avatar_url: user.avatar_url }
    });
  } catch (error) {
    return popupResponse(origin, { error: error.message || 'GitHub login failed.' }, 400);
  }
}
