// Development-only fixture. Not an Auth/RLS test and not a production build entrypoint.
import ReactDOM from 'react-dom/client';
import { Shell } from '../../src/App';
import { UiProvider } from '../../src/components/UI';
import { store } from '../../src/store';
import { sync } from '../../src/cloud/sync';
import { financialFixture } from '../fixtures/financial';
import '../../src/styles.css';
const fixture = financialFixture();
fixture.data.settings.animations = false;
localStorage.setItem('savings-expence-v1', JSON.stringify(fixture));
// Never contact Supabase or accept a real account session from this fixture.
sync.start = async () => {};
sync.stop = () => {};
sync.run = async () => {};
void store.load().then(() =>
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <UiProvider>
      <Shell />
    </UiProvider>,
  ),
);
