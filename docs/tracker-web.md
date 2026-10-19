# Tracker route

The manually entered /track address redirects to /track/. It is not linked in menus or added to the sitemap. Robots and response metadata request no indexing; these are not access controls.

The web app requires the existing Supabase app account (email/password). Auth verifies the current user before financial screens mount, and database RLS permits only that user's plan. A fresh browser can download the existing cloud plan; it cannot upload its empty starting plan. Sign-out returns immediately to the account gate. Browser storage retains a local copy; use a trusted browser and sign out on shared computers.

The public source at tools/tracker-source contains a zero-valued template only. No personal budget fixture, account session, Android signing key, password, native installer or financial backup is published.

The Build private tracker route workflow installs pinned dependencies, builds the dedicated web mode, and commits track/ assets. Cloudflare Workers Builds deploys the updated static assets from main. Existing portfolio pages and sitemap remain unchanged. scripts/stage-tracker.mjs copies only the generated public build. Local build: npm ci --ignore-scripts and npm run build:web inside tools/tracker-source, then node scripts/stage-tracker.mjs at the repository root.
