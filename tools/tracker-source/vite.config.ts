import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    {
      name: 'public-web-seed',
      enforce: 'pre',
      resolveId(source, importer) {
        if (
          mode === 'web' &&
          source === './seed.json' &&
          importer?.replaceAll('\\', '/').endsWith('/domain/defaults.ts')
        )
          return path.resolve('src/domain/web-seed.json');
      },
    },
    {
      name: 'development-csp',
      transformIndexHtml(html) {
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
}));
