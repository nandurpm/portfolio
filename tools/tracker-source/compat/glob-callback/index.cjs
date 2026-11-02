'use strict';
const modern = require('glob-modern');
const { braceExpand } = require('minimatch');

// Only legacy glob 7 consumers are redirected here. Every filesystem match is
// performed by patched glob 14; no old matcher or regex internals are retained.
const patterns = (pattern, options) =>
  [pattern].flat().flatMap((value) => (options.nobrace ? [value] : braceExpand(value, options)));
const finish = (matches, options) => {
  const result = options.nounique ? matches : [...new Set(matches)];
  return options.nosort ? result : result.sort();
};
function sync(pattern, options = {}) {
  if (!options.nonull) return finish(modern.globSync(pattern, options), options);
  return finish(
    patterns(pattern, options).flatMap((value) => {
      const matches = modern.globSync(value, { ...options, nobrace: true });
      return matches.length ? matches : [value];
    }),
    options,
  );
}
async function matches(pattern, options) {
  if (!options.nonull) return finish(await modern.glob(pattern, options), options);
  const groups = await Promise.all(
    patterns(pattern, options).map(async (value) => {
      const found = await modern.glob(value, { ...options, nobrace: true });
      return found.length ? found : [value];
    }),
  );
  return finish(groups.flat(), options);
}
function glob(pattern, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (options?.sync) return sync(pattern, options);
  // Also turn synchronous validation errors into Node-style callback errors.
  const result = Promise.resolve().then(() => matches(pattern, options || {}));
  if (typeof callback !== 'function') return result;
  result.then(
    (value) => callback(null, value),
    (error) => callback(error),
  );
}
Object.assign(glob, modern);
module.exports = glob;
module.exports.glob = glob;
module.exports.sync = sync;
// Preserve named exports for ESM consumers, using the upstream implementations.
module.exports.globSync = modern.globSync;
module.exports.hasMagic = (pattern, options = {}) =>
  modern.hasMagic(pattern, { ...options, magicalBraces: true });
module.exports.Glob = modern.Glob;
module.exports.globStream = modern.globStream;
module.exports.globStreamSync = modern.globStreamSync;
module.exports.globIterate = modern.globIterate;
module.exports.globIterateSync = modern.globIterateSync;
module.exports.escape = modern.escape;
module.exports.unescape = modern.unescape;
