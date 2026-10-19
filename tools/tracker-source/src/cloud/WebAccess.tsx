import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from './client';
import { sync, useCloud } from './sync';
import { CloudGate } from './CloudPanel';
import { store } from '../store';

/** No dashboard or financial records mount until Auth verifies this browser's session. */
export function WebAccess({ children }: { children: ReactNode }) {
  const cloud = useCloud();
  const token = cloud.session?.access_token;
  const [verified, setVerified] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    void store
      .load()
      .then(() => sync.start())
      .catch((e) => setError(String(e)));
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
  if (
    !token ||
    verified !== token ||
    cloud.locked ||
    cloud.initial !== undefined ||
    store.get().sync?.ownerId !== cloud.session?.user.id
  ) {
    return (
      <>
        {error && (
          <div className="callout error" role="alert">
            {error}{' '}
            <button className="button secondary" onClick={() => setRetry((n) => n + 1)}>
              Retry verification
            </button>
          </div>
        )}
        <CloudGate />
      </>
    );
  }
  return children;
}
