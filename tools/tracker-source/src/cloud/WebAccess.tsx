import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from './client';
import { sync, useCloud } from './sync';
import { CloudGate } from './CloudPanel';
import { store } from '../store';
import { TrackerLoading } from './TrackerLoading';

/** No dashboard or financial records mount until Auth verifies this browser's session. */
export function WebAccess({ children }: { children: ReactNode }) {
  const cloud = useCloud();
  const token = cloud.session?.access_token;
  const [initializing, setInitializing] = useState(true);
  const [startupError, setStartupError] = useState(false);
  const [verified, setVerified] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) setStartupError(true);
    }, 20000);
    void store
      .load()
      .then(() => sync.start())
      .then(() => {
        if (!active) return;
        window.clearTimeout(timeout);
        setStartupError(false);
        setInitializing(false);
      })
      .catch(() => {
        if (!active) return;
        window.clearTimeout(timeout);
        setStartupError(true);
        setInitializing(false);
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, []);
  useEffect(() => {
    let active = true;
    setVerified('');
    setError('');
    if (token) {
      void supabase.auth
        .getUser(token)
        .then(({ data, error }) => {
          if (!active) return;
          if (error || !data.user || data.user.id !== cloud.session?.user.id)
            setError(
              'Please sign in again to open your tracker. An internet connection is required.',
            );
          else setVerified(token);
        })
        .catch(() => {
          if (active) setError('Could not verify sign-in. Check your connection and try again.');
        });
    }
    return () => {
      active = false;
    };
  }, [token, retry, cloud.session?.user.id]);
  if (initializing || startupError) return <TrackerLoading failed={startupError} />;
  // Password recovery stays isolated from the financial dashboard until completed.
  if (new URLSearchParams(window.location.search).get('recovery') === '1')
    return <CloudGate />;
  if (
    !token ||
    verified !== token ||
    cloud.locked ||
    cloud.initial !== undefined ||
    store.get().sync?.ownerId !== cloud.session?.user.id
  ) {
    return (
      <CloudGate
        notice={
          error && (
            <div className="callout error" role="alert">
              {error}{' '}
              <button className="button secondary" onClick={() => setRetry((n) => n + 1)}>
                Retry verification
              </button>
            </div>
          )
        }
      />
    );
  }
  return children;
}
