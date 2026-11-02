import ReactDOM from 'react-dom/client';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import { installMobile } from './mobile';
import './styles.css';
import { WEB_APP } from './web-mode';
import { Capacitor } from '@capacitor/core';
void installMobile()
  .then(async () => {
    if (Capacitor.isNativePlatform()) {
      const { installGoogleCallbacks } = await import('./cloud/google');
      await installGoogleCallbacks();
    }
    const { default: App } = await import('./App');
    ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
  })
  .catch(() => {
    if (WEB_APP) {
      window.dispatchEvent(new Event('tracker:startup-failed'));
      return;
    }
    document.getElementById('root')!.textContent =
      'Could not open secure app storage. Restart the app; your existing files have not been replaced.';
  });
