const SYNC_REQUEST_TIMEOUT_MS = 20_000;
const TIMEOUT_MESSAGE =
  "Cloud sync timed out. Local changes are retained. Check your connection and try again.";

/**
 * Scope the deadline to one cloud request, not to disk writes or the entire
 * sync operation. A timed-out save is ambiguous: it might have committed.
 * Leave revision, mutation identity, and local data untouched here.
 */
export async function withSyncDeadline<T>(
  request: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs = SYNC_REQUEST_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        reject(new Error(TIMEOUT_MESSAGE));
        controller.abort();
      }, timeoutMs);
    });
    return await Promise.race([request(controller.signal), deadline]);
  } finally {
    clearTimeout(timeout);
  }
}
