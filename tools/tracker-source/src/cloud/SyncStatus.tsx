import { useEffect, useState } from 'react';
import { useEnvelope } from '../store';
import { useCloud } from './sync';
import { cloudPlan, equal } from './model';

export function useSyncSummary() {
  const env = useEnvelope(),
    cloud = useCloud();
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const change = () => setOnline(navigator.onLine);
    window.addEventListener('online', change);
    window.addEventListener('offline', change);
    return () => {
      window.removeEventListener('online', change);
      window.removeEventListener('offline', change);
    };
  }, []);
  const linked = !!env.sync && env.sync.ownerId === cloud.session?.user.id;
  const pending = linked && !equal(cloudPlan(env.data), env.sync!.base);
  const status = cloud.error
    ? 'Sync needs attention'
    : !online
      ? 'Offline'
      : cloud.review
        ? 'Review conflicts'
        : cloud.busy
          ? 'Synchronizing…'
          : pending
            ? 'Changes pending'
            : cloud.status;
  const timestamp = linked ? env.sync?.lastSyncAt : undefined;
  return { status, pending, linked, timestamp, error: cloud.error, online };
}
export function SyncStatusDetails() {
  const s = useSyncSummary();
  return (
    <div className="sync-status-details" aria-label="Cloud sync details" role="status">
      <div>
        <small>Cloud status</small>
        <strong>{s.status}</strong>
      </div>
      <div>
        <small>Last successful sync</small>
        <strong>
          {s.timestamp ? new Date(s.timestamp).toLocaleString('en-IN') : 'Not yet synced'}
        </strong>
      </div>
      <div>
        <small>Upload queue</small>
        <strong>
          {!s.linked
            ? 'Connect your account'
            : s.pending
              ? 'Pending changes to upload'
              : 'No pending changes'}
        </strong>
      </div>
      {s.error && <p className="unfavourable">{s.error}</p>}
    </div>
  );
}
