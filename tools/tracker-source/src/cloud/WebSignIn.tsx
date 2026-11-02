import { useEffect, useRef, useState, type FormEvent } from 'react';
import './web-signin.css';

interface Props {
  email: string;
  password: string;
  busy: boolean;
  error: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  onSignIn: () => void;
  onForgotPassword: () => void;
  onCopyErrorDetails: () => void;
}

/** Presentation only: CloudPanel retains the existing account authentication. */
export function WebSignIn({
  email,
  password,
  busy,
  error,
  setEmail,
  setPassword,
  onSignIn,
  onForgotPassword,
  onCopyErrorDetails,
}: Props) {
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const emailInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const emailError = !email.trim()
    ? 'Enter your email address.'
    : emailInput.current?.validity.typeMismatch
      ? 'Enter a valid email address.'
      : '';
  const passwordError = !password
    ? 'Enter your password.'
    : password.length < 8
      ? 'Use your app password (at least 8 characters).'
      : '';
  const authError = /fetch|network|load failed/i.test(error)
    ? 'We couldn’t sign you in. Check your connection and try again.'
    : error;
  useEffect(() => {
    document.title = 'Sign in · Savings Tracker';
    return () => {
      document.title = 'Savings Tracker';
    };
  }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setTouched({ email: true, password: true });
    if (emailError) {
      emailInput.current?.focus();
      return;
    }
    if (passwordError) {
      passwordInput.current?.focus();
      return;
    }
    onSignIn();
  }
  return (
    <section className="web-signin" aria-labelledby="signin-title">
      <header className="web-signin-heading">
        <p className="signin-eyebrow">YOUR PERSONAL FINANCE WORKSPACE</p>
        <h1 id="signin-title">
          Sign in to your
          <br className="signin-title-break" /> Savings Tracker
        </h1>
        <p id="signin-description">
          Use the same email address and password you use in the Windows or Android app to access
          your synced savings, expenses and loan data.
        </p>
      </header>
      <form noValidate onSubmit={submit} aria-describedby="signin-description" aria-busy={busy}>
        <div className="signin-field">
          <label htmlFor="signin-email">Email address</label>
          <input
            ref={emailInput}
            id="signin-email"
            name="email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="email"
            required
            readOnly={busy}
            value={email}
            aria-invalid={touched.email && !!emailError}
            aria-describedby={touched.email && emailError ? 'signin-email-error' : undefined}
            onBlur={() => setTouched((state) => ({ ...state, email: true }))}
            onChange={(event) => setEmail(event.target.value)}
          />
          <p className="signin-field-error" id="signin-email-error" aria-live="polite">
            {touched.email && emailError}
          </p>
        </div>
        <div className="signin-field">
          <label htmlFor="signin-password">Password</label>
          <div className="signin-password-wrap">
            <input
              ref={passwordInput}
              id="signin-password"
              name="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              required
              minLength={8}
              readOnly={busy}
              value={password}
              aria-invalid={touched.password && !!passwordError}
              aria-describedby={
                touched.password && passwordError ? 'signin-password-error' : undefined
              }
              onBlur={() => setTouched((state) => ({ ...state, password: true }))}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              className="signin-show"
              type="button"
              disabled={busy}
              aria-label={show ? 'Hide password' : 'Show password'}
              aria-pressed={show}
              aria-controls="signin-password"
              onClick={() => setShow((value) => !value)}
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="signin-field-error" id="signin-password-error" aria-live="polite">
            {touched.password && passwordError}
          </p>
        </div>
        {authError && (
          <p className="signin-auth-error" id="signin-auth-error" role="alert">
            {authError}
            <button type="button" className="text-button" onClick={onCopyErrorDetails}>Copy error details</button>
          </p>
        )}
        <button className="text-button" type="button" disabled={busy} onClick={onForgotPassword}>Forgot password?</button>
        <button
          className="button signin-submit"
          type="submit"
          disabled={busy}
          aria-describedby={authError ? 'signin-auth-error' : undefined}
        >
          {busy && <span className="signin-spinner" aria-hidden="true" />}
          <span>{busy ? 'Signing in…' : 'Sign in'}</span>
          {!busy && <span aria-hidden="true">→</span>}
        </button>
        <p className="signin-progress" role="status" aria-live="polite">
          {busy ? 'Signing in. Please wait.' : ''}
        </p>
      </form>
      <footer className="signin-trust">
        <p>
          Your existing app account is used for synchronization. Signing out removes the locally
          cached financial data from this browser after changes have synced.
        </p>
        <nav aria-label="Tracker information">
          <a href="../savings-tracker-privacy.html">Privacy</a>
          <a href="../savings-tracker-privacy.html#data-and-sync">Data and sync</a>
          <a href="../savings-tracker.html#tracker-support">Help</a>
        </nav>
      </footer>
    </section>
  );
}
