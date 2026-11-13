import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Mount optional charts when close to the viewport. Core balances and forms
 * render immediately; observing a chart never changes plan or sync state. */
export function DeferredContent({ children }: { children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!host.current || typeof IntersectionObserver === 'undefined') {
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setReady(true);
        observer.disconnect();
      }
    }, { rootMargin: '100px' });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={host} data-deferred-content={ready ? 'ready' : 'waiting'}
    aria-busy={!ready} style={ready ? undefined : { minHeight: 220 }}>
    {ready ? children : <p className="muted" role="status">Loading charts…</p>}
  </div>;
}
