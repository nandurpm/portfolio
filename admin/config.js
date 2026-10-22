/*
 * FILE: config.js
 * FILE PURPOSE: Public Content Studio configuration for deployment-safe values such as the optional GitHub OAuth client ID.
 */

window.CONTENT_STUDIO_CONFIG = Object.freeze({
  owner: 'nandurpm',
  repository: 'portfolio',
  branch: 'main',
  siteUrl: 'https://nandakumarm.dpdns.org',
  // Enable only on a host that actually executes functions/api/github/oauth.
  serverOAuth: false,
  githubClientId: ''
});
