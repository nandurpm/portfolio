import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import './inter-woff2.css';
import { installMobile } from './mobile';
import './styles.css';
import './dashboard-controls.css';
import { WEB_APP } from './web-mode';
// Bridge installation still precedes callback setup; render only after all
// prerequisites succeed. Fetch independent UI/CSS modules concurrently.
const nativeReady = installMobile().then(async () => {
  if (Capacitor.isNativePlatform()) {
    const { installGoogleCallbacks } = await import('./cloud/google');
    await installGoogleCallbacks();
  }
});
void Promise.all([
  nativeReady,
  import('./App'),
  Capacitor.getPlatform() === 'android' ? import('./android-v222.css').then(() => import('./android-simple.css')) : Promise.resolve(),
])
  .then(([, { default: App }]) => {
    ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
  })
  .catch((error: unknown) => {
    if (WEB_APP) {
      window.dispatchEvent(new Event('tracker:startup-failed'));
      return;
    }
    const root = document.getElementById('root')!;
    root.replaceChildren();
    const box = document.createElement('main');
    box.className = 'startup-recovery';
    const title = document.createElement('h1');
    title.textContent = 'Your saved data is safe';
    const copy = document.createElement('p');
    copy.textContent = 'The app could not open its private storage. No existing file was replaced. Restart the app and try again.';
    const detail = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Technical details';
    const message = document.createElement('pre'); message.textContent = error instanceof Error ? error.message : String(error);
    detail.append(summary, message);
    const retry = document.createElement('button'); retry.textContent = 'Retry'; retry.onclick = () => location.reload();
    box.append(title, copy, retry, detail); root.append(box);
  });
