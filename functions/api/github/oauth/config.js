/*
 * FILE: config.js
 * FILE PURPOSE: Deployment configuration reader for the GitHub OAuth integration; secrets remain in runtime environment variables.
 */

/** Return browser-safe OAuth availability and repository coordinates. */
export async function onRequestGet({ env }) {
  const enabled = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
  return Response.json(
    {
      enabled,
      provider: 'github',
      owner: env.GITHUB_OWNER || 'nandurpm',
      repository: env.GITHUB_REPOSITORY || 'portfolio'
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff'
      }
    }
  );
}
