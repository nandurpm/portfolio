/** Share imports between intent preloading and React.lazy; failed speculative loads may retry. */
export function cachedLoader<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => {
    if (!pending) pending = load().catch(error => { pending = undefined; throw error; });
    return pending;
  };
}
