# Legacy glob API adapter

This private npm workspace is **not an upstream glob release**. Its explicit
`14.0.3-compat.1` version identifies the local adapter. All matching/traversal is
delegated to the registry alias `glob-modern` → official `glob@14.0.3`; optional
brace expansion uses official `minimatch@11.0.4`. Both packages remain pinned and
integrity-checked in the root lockfile. No glob 7 implementation is included.

Only `archiver-utils@<4` and `rimraf@<3` are redirected to this workspace. They
need the callable CommonJS callback API and `.sync` / `.hasMagic`. Public modern
exports are forwarded too. The adapter preserves sorting, exclusions, `nonull`,
brace expansion, dotfile handling and callback errors. It propagates AbortSignal
to the patched engine; it does not restore legacy minimatch regex internals.

Why an adapter: forcing minimatch 11 below glob 7 produces a runtime error when
old glob accesses removed private `_glob` properties. Forcing glob 14 directly
breaks callable callback consumers. `npm audit` alone detects neither API break.
A local workspace with a real prerelease version and scoped semver overrides
also avoids npm's consumer-relative `file:` override resolution problems.

`npm run test:dependencies` exercises the actual archive, Excel, cleanup/glob and
Electron packaging consumers. Remove the adapter and its scoped overrides once
upstream ExcelJS/archive and legacy cleanup consumers migrate to modern glob.
Do not point the alias at this workspace or update its version merely to silence
an audit: upgrade and validate the underlying upstream implementation.
