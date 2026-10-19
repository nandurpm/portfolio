import ReactDOM from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import { installMobile } from './mobile';
import './styles.css';
void installMobile()
  .then(async () => {
    const { installGoogleCallbacks } = await import('./cloud/google');
    await installGoogleCallbacks();
    const { default: App } = await import('./App');
    ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
  })
  .catch(() => {
    document.getElementById('root')!.textContent =
      'Could not open secure app storage. Restart the app; your existing files have not been replaced.';
  });
