import { useEffect, useState } from 'react';
import { useGoogleAuth, startGoogleSignIn, cancelGoogleSignIn } from './google';
import { supabase } from './client';
import { sync, useCloud } from './sync';
import { useEnvelope } from '../store';
import { Modal, useUi } from '../components/UI';
import { WEB_APP } from '../web-mode';
const summary = (value: unknown) =>
  value === undefined
    ? 'Deleted'
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);
export function CloudPanel() {
  const google = useGoogleAuth();
  const c = useCloud(),
    env = useEnvelope(),
    { toast, confirm } = useUi();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [choices, setChoices] = useState<('local' | 'remote')[]>([]);
  useEffect(() => setChoices([]), [c.review]);
  async function auth(mode: 'signin' | 'signup') {
    if (busy || c.busy || google.pending) return;
    setBusy(true);
    setError('');
    try {
      const r =
        mode === 'signin'
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({ email: email.trim(), password });
      if (r.error) throw r.error;
      setPassword('');
      if (mode === 'signup' && !r.data.session)
        toast(
          'Check your email to confirm your account, then return here and sign in. If no email arrives, your project may need email-delivery configuration.',
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  const blocked = busy || c.busy || google.pending;
  return (
    <div className="cloud-panel">
      <h2>{WEB_APP ? 'Your private tracker' : 'One plan. Phone and Windows.'}</h2>
      <p className="muted">
        {WEB_APP
          ? 'Sign in with the same email and password you use in the Windows or Android app. Then open your existing cloud plan.'
          : 'Sign in with the same app account on both devices. Local entries remain available offline; synchronization resumes when connected.'}
      </p>
      {(error || c.error || google.error) && (
        <div className="callout error" role="alert">
          {error || c.error || google.error}
        </div>
      )}
      {c.session ? (
        <>
          <p>
            Signed in as <strong>{c.session.user.email}</strong>
          </p>
          {c.locked ? (
            <div className="callout error">
              This device is linked to another account. Sign out and use the account originally
              linked to this financial plan.
            </div>
          ) : (
            <>
              <p>
                <strong>{c.status}</strong>
                {env.sync?.lastSyncAt &&
                  ` · Last change synced ${new Date(env.sync.lastSyncAt).toLocaleString('en-IN')}`}
              </p>
              {c.initial !== undefined && (
                <div className="initial-sync">
                  <h3>Connect this device</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Plan</th>
                        <th>Entries</th>
                        <th>Categories</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>This device</td>
                        <td>{env.data.entries.length}</td>
                        <td>{env.data.categories.length}</td>
                      </tr>
                      <tr>
                        <td>Cloud</td>
                        <td>{c.initial?.data.entries.length ?? 0}</td>
                        <td>{c.initial?.data.categories.length ?? 0}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p>
                    {WEB_APP
                      ? c.initial
                        ? 'Open the plan already synced by your app. Your browser will use the same income, expenses, budgets and loans.'
                        : 'No cloud plan is available for this account yet. Open the Windows app, sign in with this account and finish syncing, then select Sync now here.'
                      : 'Your local plan is backed up before linking. Choose the source deliberately; uploading this device replaces the cloud financial plan.'}
                  </p>
                  <div className="entry-kind">
                    {c.initial && (
                      <button
                        className="button"
                        disabled={blocked}
                        onClick={() => void action(() => sync.connect('cloud'))}
                      >
                        Use cloud plan on this device
                      </button>
                    )}
                    {!WEB_APP && (
                      <button
                        className="button secondary"
                        disabled={blocked}
                        onClick={() =>
                          void action(async () => {
                            if (
                              !c.initial ||
                              (await confirm(
                                'Upload this device’s plan?',
                                `The cloud currently has ${c.initial.data.entries.length} entries. Replace it with this device’s ${env.data.entries.length} entries and budget?`,
                                true,
                                'Upload device plan',
                              ))
                            )
                              await sync.connect('device');
                          })
                        }
                      >
                        {c.initial
                          ? 'Upload device plan instead'
                          : 'Enable sync & upload this device'}
                      </button>
                    )}
                    {WEB_APP && !c.initial && (
                      <button
                        className="button secondary"
                        disabled={blocked}
                        onClick={() =>
                          void action(async () => {
                            sync.retryInitial();
                            await sync.run();
                          })
                        }
                      >
                        Sync now
                      </button>
                    )}
                  </div>
                </div>
              )}
              {c.review && (
                <div className="sync-review">
                  <h3>Choose which edits to keep</h3>
                  <p>
                    Different records merge automatically. These values changed on both devices.
                    Both versions are preserved until you decide.
                  </p>
                  {c.review.conflicts.map((v, i) => (
                    <div className="sync-conflict" key={i}>
                      <strong>
                        {v.path[0] === 'entries'
                          ? `Transaction: ${env.data.entries.find((e) => e.id === v.path[1])?.description || 'Edited or deleted record'} · ${String(v.path.at(-1)).replace(/([A-Z])/g, ' $1')}`
                          : v.path[0] === 'categories'
                            ? `Category: ${env.data.categories.find((c) => c.id === v.path[1])?.name || 'Edited category'} · ${String(v.path.at(-1))}`
                            : v.path.join(' → ').replace(/([A-Z])/g, ' $1') ||
                              'Whole plan — combined edits could not be validated'}
                      </strong>
                      <label>
                        <input
                          type="radio"
                          name={`conflict-${i}`}
                          checked={choices[i] === 'local'}
                          onChange={() =>
                            setChoices((x) => Object.assign([...x], { [i]: 'local' }))
                          }
                        />{' '}
                        Keep this device<pre>{summary(v.local)}</pre>
                      </label>
                      <label>
                        <input
                          type="radio"
                          name={`conflict-${i}`}
                          checked={choices[i] === 'remote'}
                          onChange={() =>
                            setChoices((x) => Object.assign([...x], { [i]: 'remote' }))
                          }
                        />{' '}
                        Keep cloud<pre>{summary(v.remote)}</pre>
                      </label>
                    </div>
                  ))}
                  <button
                    className="button"
                    disabled={blocked || !c.review.conflicts.every((_, i) => !!choices[i])}
                    onClick={() => void action(() => sync.resolve(choices))}
                  >
                    Apply selected versions
                  </button>
                </div>
              )}
              {c.initial === undefined && !c.review && (
                <button className="button" disabled={blocked} onClick={() => void sync.run()}>
                  {c.busy ? 'Synchronizing…' : 'Sync now'}
                </button>
              )}
            </>
          )}
          <button
            className="button secondary"
            disabled={blocked}
            onClick={() => void action(() => sync.signOut())}
          >
            {WEB_APP ? 'Sign out & clear this browser' : 'Sign out on this device'}
          </button>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void auth('signin');
          }}
        >
          {!WEB_APP && (
            <button
              type="button"
              className="button secondary google-signin"
              disabled={blocked}
              onClick={() => void startGoogleSignIn()}
            >
              <span aria-hidden="true" className="google-letter">
                G
              </span>
              {google.pending ? 'Waiting for Google…' : 'Continue with Google'}
            </button>
          )}
          {google.pending && (
            <div className="callout">
              <p>Finish signing in in your browser, then return here.</p>
              <button
                type="button"
                className="button secondary"
                onClick={() => void cancelGoogleSignIn()}
              >
                Cancel Google sign-in
              </button>
            </div>
          )}
          <p className="muted">
            {WEB_APP ? 'Use your app email and password' : 'Or use email and password'}
          </p>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <div className="entry-kind">
            <button className="button" disabled={blocked}>
              Sign in
            </button>
            {!WEB_APP && (
              <button
                type="button"
                className="button secondary"
                disabled={blocked || !email || password.length < 8}
                onClick={() => void auth('signup')}
              >
                Create app account
              </button>
            )}
          </div>
          <p className="footnote">
            {WEB_APP
              ? 'Use your existing app account. Sign-out removes this tracker’s local financial copies from the browser after your changes have synced.'
              : 'Your Supabase dashboard account is separate from this app login. Create an app account once, then use it on both devices. Never enter the database password here.'}
          </p>
        </form>
      )}
    </div>
  );
}
export function CloudButton() {
  const c = useCloud(),
    [open, setOpen] = useState(false);
  return (
    <>
      <button className="button secondary cloud-button" onClick={() => setOpen(true)}>
        Cloud: {c.status}
      </button>
      {open && (
        <Modal title="Account & cloud sync" onClose={() => setOpen(false)} wide>
          <CloudPanel />
        </Modal>
      )}
    </>
  );
}
export function CloudGate() {
  return (
    <main className="cloud-gate">
      <div className="cloud-gate-card">
        <img src="./icon.svg" alt="" width="64" height="64" />
        <CloudPanel />
      </div>
    </main>
  );
}
