import { WEB_APP } from '../web-mode';
import { CloudButton } from '../cloud/CloudPanel';
import { RangeControl } from '../components/RangeControl';
import { motion } from 'framer-motion';
import { BackupStatus } from '../components/BackupStatus';
import { version } from '../../package.json';
import { useState } from 'react';
import { Sun, Moon, Monitor, FolderOpen, History, RotateCcw, Shield, Info } from 'lucide-react';
import { store, usePlan, useEnvelope, useSaveStatus } from '../store';
import { freshPlan } from '../domain/defaults';
import { APP_NAME } from '../domain/types';
import { PageHead, Section, Toggle, Field, Badge, useUi, Modal } from '../components/UI';
import { displayDate } from '../domain/dates';
export const palettes = [
  { id: 'violet', name: 'Lavender', color: '#6255df' },
  { id: 'ocean', name: 'Ocean', color: '#238bc3' },
  { id: 'emerald', name: 'Emerald', color: '#129c7e' },
  { id: 'rose', name: 'Rose', color: '#ce5482' },
  { id: 'sunset', name: 'Sunset', color: '#d67436' },
  { id: 'indigo', name: 'Midnight', color: '#4867c4' },
];
const compact = (v: unknown) =>
  v === undefined ? '(empty)' : typeof v === 'object' ? JSON.stringify(v) : String(v);
export default function Settings({ navigate }: { navigate: (page: string) => void }) {
  const p = usePlan(),
    env = useEnvelope(),
    s = p.settings,
    { toast, confirm } = useUi(),
    [history, setHistory] = useState(false),
    [animationPreview, setAnimationPreview] = useState(0),
    [search, setSearch] = useState(''),
    [status, , dataPath] = useSaveStatus();
  function toggle(name: 'animations' | 'autoStart' | 'tray', v: boolean) {
    store.change(`Change ${name}`, (d) => {
      d.settings[name] = v;
    });
  }
  return (
    <>
      <PageHead
        eyebrow="SETTINGS"
        title="Make it feel like you."
        description="Personalise the app. Your preferences stay on this device."
      />
      <Section title="Appearance" caption="Choose a look that makes checking your money feel good.">
        <div className="appearance">
          <div>
            <h3>Theme</h3>
            <div className="theme-options">
              {(
                [
                  ['light', 'Light', Sun],
                  ['dark', 'Dark', Moon],
                  ['system', 'System', Monitor],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  className={s.theme === id ? 'selected' : ''}
                  onClick={() =>
                    store.change('Change theme', (d) => {
                      d.settings.theme = id;
                    })
                  }
                >
                  <Icon size={23} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3>Colour palette</h3>
            <div className="palette-options">
              {palettes.map((c) => (
                <button
                  key={c.id}
                  aria-label={`${c.name} palette`}
                  className={s.palette === c.id ? 'selected' : ''}
                  onClick={() =>
                    store.change('Change palette', (d) => {
                      d.settings.palette = c.id;
                    })
                  }
                >
                  <span style={{ background: c.color }} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Toggle
          label="Animations & celebrations"
          hint="Page transitions, number counters, chart animations and milestone confetti"
          checked={s.animations}
          onChange={(v) => toggle('animations', v)}
        />
        <div className="animation-preview">
          <motion.div
            key={animationPreview}
            className="animation-token"
            aria-hidden="true"
            animate={
              s.animations && animationPreview > 0
                ? { rotate: [0, -15, 15, 0], scale: [1, 1.18, 1], y: [0, -12, 0] }
                : { rotate: 0, scale: 1, y: 0 }
            }
            transition={{ duration: 0.8 }}
          >
            ₹
          </motion.div>
          <div>
            <strong>{s.animations ? 'Animations are on' : 'Animations are off'}</strong>
            <p className="footnote">
              Preview the motion. Chart transitions play when values or the selected month change.
            </p>
          </div>
          <button
            className="button secondary"
            disabled={!s.animations}
            onClick={() => setAnimationPreview((n) => n + 1)}
          >
            Preview animations
          </button>
        </div>
        <Field label="Display date format">
          <select
            value={s.dateFormat}
            onChange={(e) =>
              store.change('Change date format', (d) => {
                d.settings.dateFormat = e.target.value as typeof s.dateFormat;
              })
            }
          >
            <option>dd-MMM-yyyy</option>
            <option>dd/MM/yyyy</option>
            <option>yyyy-MM-dd</option>
          </select>
        </Field>
      </Section>
      <Section
        title="Account & cloud sync"
        caption="Use the same app account on Windows and Android. Only your financial plan is shared; appearance and device preferences remain local."
      >
        <CloudButton />
      </Section>
      <Section
        title="Your plan"
        caption="Salary rules and opening savings are managed in Budget & Plan. The plan range can also be changed here."
        action={<RangeControl />}
      >
        <button className="button secondary" onClick={() => navigate('budget')}>
          Open Budget &amp; Plan
        </button>
      </Section>
      {window.desktop?.platform !== 'android' && (
        <Section
          title="Reminders & desktop behaviour"
          caption="Windows notifications run while the app is open or in the tray. Enable start at login to keep them available after a restart."
        >
          {(
            [
              ['salary', 'Salary day', 'Remind from 9 am on the salary day'],
              ['emi', 'EMI day', 'Remind from 8 am for unpaid scheduled EMIs'],
              ['recharge', 'Recharge day', 'Remind from 9 am on the recharge category’s day'],
              ['missing', 'No entries today', 'Remind at or after 9 pm if nothing is entered'],
            ] as const
          ).map(([key, label, hint]) => (
            <Toggle
              key={key}
              label={label}
              hint={hint}
              checked={s.reminders[key]}
              onChange={(v) =>
                store.change(`Toggle ${label.toLowerCase()} reminder`, (d) => {
                  d.settings.reminders[key] = v;
                })
              }
            />
          ))}
          <Toggle
            checked={s.autoStart}
            onChange={(v) => toggle('autoStart', v)}
            label="Start with Windows"
            hint="Available after installation; opens quietly in the background"
          />
          <Toggle
            checked={s.tray}
            onChange={(v) => toggle('tray', v)}
            label="Keep running in the tray"
            hint="Closing the window hides it. Use the tray menu to quit and create an exit backup."
          />
          {!window.desktop && (
            <p className="callout">
              Desktop notifications, auto-start and tray controls take effect in the installed
              Electron app.
            </p>
          )}
        </Section>
      )}
      {window.desktop?.platform === 'android' && (
        <p className="callout">
          Phone data stays in private app storage. Changed data is backed up when the app moves to
          the background; unchanged copies are skipped. Use Reports → Export full backup to save a
          copy in a folder you choose.
        </p>
      )}
      <Section
        title={WEB_APP ? 'Data & backups' : 'Local storage & backups'}
        caption={
          WEB_APP
            ? 'Account sync connects your devices. Use Reports to export a complete backup.'
            : 'Local storage works offline. Optional cloud sync connects your devices.'
        }
      >
        {!WEB_APP && (
          <div className="storage-info">
            <Shield size={28} />
            <div>
              <strong>{status}</strong>
              <code>{dataPath}</code>
            </div>
            <Badge tone="income">{env.sync ? 'Private sync' : 'Local only'}</Badge>
          </div>
        )}
        <BackupStatus />
        {window.desktop?.platform !== 'android' && (
          <Field label="Additional backup folder">
            <input
              readOnly
              value={s.backupFolder || 'Default: app data / backups'}
              aria-label="Backup folder"
            />
          </Field>
        )}
        {window.desktop?.platform !== 'android' && (
          <div className="backup-actions">
            <button
              className="button secondary"
              disabled={!window.desktop}
              onClick={async () => {
                try {
                  const folder = await window.desktop!.chooseBackupFolder();
                  if (folder)
                    store.change('Change backup folder', (d) => {
                      d.settings.backupFolder = folder;
                    });
                } catch (e) {
                  toast(String(e), true);
                }
              }}
            >
              <FolderOpen size={17} />
              Choose backup folder
            </button>
            <button
              className="button secondary"
              disabled={!s.backupFolder}
              onClick={() =>
                store.change('Use default backup folder', (d) => {
                  d.settings.backupFolder = '';
                })
              }
            >
              Use default folder
            </button>
            <button
              className="button secondary"
              disabled={!window.desktop}
              onClick={() => void window.desktop!.openDataFolder()}
            >
              <FolderOpen size={17} />
              Open data folder
            </button>
          </div>
        )}
        <button className="button secondary" onClick={() => setHistory(true)}>
          <History size={17} />
          Change history ({env.audit.length})
        </button>
      </Section>
      <Section title="About" caption={APP_NAME}>
        <div className="about">
          <img src="./icon.svg" alt="Piggy bank and rupee app icon" />
          <div>
            <h3>{APP_NAME}</h3>
            <p>
              Version {version} ·{' '}
              {window.desktop?.platform === 'android'
                ? 'Android'
                : window.desktop
                  ? 'Windows app'
                  : 'Browser preview'}
            </p>
            <p>Source plan: {p.source.filename}</p>
            <p>
              Calculation difference resolved from the workbook: closure uses closing cash, releases
              the next EMI reserve, and retains “Insufficient cash”, “Below cushion” and “Meets
              cushion”.
            </p>
          </div>
          <Info size={22} />
        </div>
      </Section>
      <Section
        title="Start fresh"
        caption="This resets settings, budgets and transactions to the original workbook plan. Undo and change history remain available."
      >
        <button
          className="button danger-quiet"
          onClick={async () => {
            if (
              await confirm(
                'Reset your plan?',
                'Your current data will be replaced with the original workbook defaults. Export a full backup first if you want a separate copy.',
                true,
                'Reset plan',
              )
            ) {
              store.change('Reset to original workbook plan', (d) => {
                Object.assign(d, freshPlan());
              });
              toast('Original plan restored. Undo is available.');
            }
          }}
        >
          <RotateCcw size={17} />
          Reset plan data
        </button>
      </Section>
      {history && (
        <Modal title="Full change history" onClose={() => setHistory(false)} wide>
          <input
            className="history-search"
            aria-label="Search history"
            placeholder="Search changes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="history-list">
            {[...env.audit]
              .reverse()
              .filter((a) =>
                `${a.label} ${JSON.stringify(a.changes)}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((a) => (
                <details key={a.id}>
                  <summary>
                    <div>
                      <strong>{a.label}</strong>
                      <small>
                        {displayDate(a.at.slice(0, 10), s.dateFormat)} ·{' '}
                        {new Date(a.at).toLocaleTimeString('en-IN')} · {a.changes.length} change(s)
                      </small>
                    </div>
                  </summary>
                  <div className="history-changes">
                    {a.changes.map((c, i) => (
                      <div key={i}>
                        <code>{c.path.join(' → ')}</code>
                        <span>
                          {compact(c.before)} <b>→</b> {compact(c.after)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="button small secondary"
                    onClick={async () => {
                      if (
                        await confirm(
                          'Revert this change?',
                          'Its inverse changes will be applied to the current plan. Review the fields above; later edits to those fields can be overwritten.',
                        )
                      )
                        try {
                          store.revert(a.id);
                          toast('Change reverted.');
                        } catch (e) {
                          toast(`Cannot safely revert: ${String(e)}`, true);
                        }
                    }}
                  >
                    Revert this change
                  </button>
                </details>
              ))}
            {!env.audit.length && (
              <p className="muted">Your changes will appear here with their old and new values.</p>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
