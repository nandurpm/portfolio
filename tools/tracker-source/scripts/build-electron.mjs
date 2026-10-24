import { build } from 'esbuild';
import path from 'node:path';
const plugins = process.argv.includes('--release')
  ? [
      {
        name: 'empty-release-template',
        setup(builder) {
          builder.onResolve({ filter: /^\.\/seed\.json$/ }, (args) => {
            if (args.importer.replaceAll('\\', '/').endsWith('/domain/defaults.ts'))
              return { path: path.resolve('src/domain/web-seed.json') };
            return undefined;
          });
        },
      },
    ]
  : [];
await build({
  entryPoints: ['electron/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: 'dist-electron/main.cjs',
  format: 'cjs',
  external: ['electron'],
  sourcemap: true,
  plugins,
});
await build({
  entryPoints: ['electron/preload.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: 'dist-electron/preload.cjs',
  format: 'cjs',
  external: ['electron'],
  sourcemap: true,
  plugins,
});
