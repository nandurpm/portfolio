import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { getBuildInfo } from './build-info.mjs';
import cloudConfig from './src/cloud/config.json';
const endpoint = new URL(cloudConfig.url);
if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password)
  throw Error('Use a valid HTTPS Supabase URL.');
export default defineConfig(({ command, mode }) => {
  const info = getBuildInfo(mode);
  return {
    define: { __TRACKER_BUILD_INFO__: JSON.stringify(info) },
    plugins: [
      {
        name: 'tracker-build-manifest',
        async writeBundle(options) {
          if (mode !== 'web') return;
          const root = path.resolve(options.dir ?? 'dist-web');
          const files: Record<string, string> = {};
          async function walk(dir: string) {
            for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
              const full = path.join(dir, entry.name);
              if (entry.isDirectory()) await walk(full);
              else {
                const relative = path.relative(root, full).replaceAll('\\', '/');
                if (relative !== 'build.json')
                  files[relative] = createHash('sha256')
                    .update(await fs.readFile(full))
                    .digest('hex');
              }
            }
          }
          await walk(root);
          await fs.writeFile(
            path.join(root, 'build.json'),
            JSON.stringify({ ...info, requiresSignIn: true, route: '/track/', files }, null, 2) +
              '\n',
          );
        },
      },
      react(),
      {
        name: 'public-web-seed',
        enforce: 'pre',
        resolveId(source, importer) {
          if (
            (mode === 'web' || mode === 'release') &&
            source === './seed.json' &&
            importer?.replaceAll('\\', '/').endsWith('/domain/defaults.ts')
          )
            return path.resolve('src/domain/web-seed.json');
          return null;
        },
      },
      {
        name: 'development-csp',
        transformIndexHtml(html) {
          html = html.replace(
            '__TRACKER_CONNECT_SRC__',
            `${endpoint.origin} wss://${endpoint.host}`,
          );
          if (mode === 'web')
            html = html.replace(
              '<head>',
              '<head>\n<meta name="robots" content="noindex,nofollow,noarchive" />',
            );
          return command === 'serve'
            ? html
                .replace("connect-src 'self'", "connect-src 'self' ws://127.0.0.1:5173")
                .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
            : html;
        },
      },
    ],
    base: mode === 'web' ? '/track/' : './',
    server: { port: 5173, strictPort: true },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: { manualChunks: { charts: ['recharts'], motion: ['framer-motion'] } },
      },
    },
  };
});
