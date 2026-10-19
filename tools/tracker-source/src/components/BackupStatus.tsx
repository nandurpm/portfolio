import { useState } from 'react';
import { store, useSaveStatus } from '../store';
import { displayDate } from '../domain/dates';
import { useUi } from './UI';

export function BackupStatus({ compact = false }: { compact?: boolean }) {
  const [status, , , saved, backup] = useSaveStatus();
  const [busy, setBusy] = useState(false);
  const { toast } = useUi();
  const stamp = (value: string | undefined) => {
    if (!value) return 'Not yet recorded';
    const d = new Date(value);
    return `${displayDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  };
  return (
    <div
      className={`backup-status ${compact ? 'compact' : ''}`}
      aria-label="Save and backup status"
    >
      <div>
        <span>Last saved locally</span>
        <strong>{stamp(saved)}</strong>
      </div>
      <div>
        <span>Last backup</span>
        <strong>{window.desktop ? stamp(backup) : 'Desktop app only'}</strong>
      </div>
      <button
        className="button secondary"
        disabled={!window.desktop || busy || status === 'Recovery needed'}
        onClick={async () => {
          setBusy(true);
          try {
            await store.backup();
            toast(
              window.desktop?.platform === 'android'
                ? 'Backup ready. Unchanged copies are skipped; the latest 10 distinct snapshots are kept.'
                : 'Backup created. The latest 10 copies are retained.',
            );
          } catch (error) {
            toast(`Backup failed: ${String(error)}`, true);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Backing up…' : 'Back up now'}
      </button>
      {!compact && (
        <p className="footnote">
          {window.desktop?.platform === 'android'
            ? 'Every change auto-saves. Changed data is backed up when you leave the app. Unchanged copies are skipped, keeping your last ten distinct snapshots. Export a JSON copy before uninstalling.'
            : 'Every change auto-saves. Windows backs up on exit and keeps ten copies. In tray mode, use Quit to exit. Back up now creates a copy immediately.'}
        </p>
      )}
    </div>
  );
}
