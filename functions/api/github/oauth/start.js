const COOKIE_PATH = '/api/github/oauth';

function randomUrlSafe(bytes = 32) {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return base64Url(buffer);
}

function base64Url(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

async function sha256(value) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
}

function secureCookie(name, value, maxAge = 600) {
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=${COOKIE_PATH}; HttpOnly; Secure; SameSite=Lax`;
}

function errorPage(message, status = 500) {
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><title>GitHub login</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07111f;color:#edf5ff;font:16px system-ui}.card{max-width:480px;margin:24px;padding:28px;border:1px solid #29415b;border-radius:18px;background:#0e1c2e}p{color:#9fb1c7;line-height:1.6}</style></head><body><div class="card"><h1>GitHub login unavailable</h1><p>${String(message).replace(/[<>&]/g, '')}</p></div></body></html>`, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return errorPage('OAuth environment variables have not been configured for this deployment.', 503);
  }

  const requestUrl = new URL(request.url);
  const origin = env.SITE_ORIGIN || requestUrl.origin;
  const callbackUrl = `${origin.replace(/\/$/, '')}/api/github/oauth/callback`;
  const state = randomUrlSafe(32);
  const verifier = randomUrlSafe(64);
  const challenge = base64Url(await sha256(verifier));

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', callbackUrl);
  authorizeUrl.searchParams.set('scope', 'public_repo read:user');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('code_challenge', challenge);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('allow_signup', 'false');
  authorizeUrl.searchParams.set('prompt', 'select_account');

  const headers = new Headers({
    Location: authorizeUrl.toString(),
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff'
  });
  headers.append('Set-Cookie', secureCookie('portfolio_oauth_state', state));
  headers.append('Set-Cookie', secureCookie('portfolio_oauth_verifier', verifier));
  return new Response(null, { status: 302, headers });
}
