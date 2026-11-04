import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Delay costly chart DOM/SVG until the section is near the scroll viewport.
 * The content stays fully available: no disclosure button and no unmount while scrolling.
 */
export function NearViewport({
  children,
  minHeight = 260,
}: {
  children: ReactNode;
  minHeight?: number;
}) {
  const target = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (ready) return;
    const element = target.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px', threshold: 0 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ready]);

  return (
    <div ref={target} className="near-viewport" data-ready={ready ? 'true' : 'false'}>
      {ready ? (
        children
      ) : (
        <div
          className="near-viewport-placeholder"
          style={{ minHeight }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
