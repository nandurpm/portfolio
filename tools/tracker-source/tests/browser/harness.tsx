import { addInstallmentLoan, saveInstallmentPayment } from '../../src/domain/installments';
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
fixture.data.settings.planEnd = '2034-12';
fixture.data.settings.viewStart = '2026-11';
fixture.data.settings.viewEnd = '2034-12';
delete fixture.data.settings.displayRangeVersion;
const phone = addInstallmentLoan(fixture.data, {
  name: 'Test phone EMI',
  principal: 1000,
  monthlyEmi: 100,
  tenure: 12,
  firstDueDate: '2026-11-05',
  note: 'Synthetic fixture only',
});
saveInstallmentPayment(fixture.data, phone.id, phone.rows[0]!.id, '2026-10-20', 100);
localStorage.setItem('savings-expence-v1', JSON.stringify(fixture));
// Never contact Supabase or accept a real account session from this fixture.
sync.start = async () => {};
sync.stop = () => {};
sync.run = async () => {};
void store.load().then(() => {
  // Browser-only simulation of the Android presentation branch, never native I/O.
  if (new URLSearchParams(location.search).has('android')) {
    window.desktop = {
      platform: 'android',
      load: async () => ({ envelope: fixture, dataPath: 'synthetic-browser-only' }),
      save: async (envelope) => { localStorage.setItem('savings-expence-v1', JSON.stringify(envelope)); },
      saveFile: async () => { throw Error('Native file export is not simulated'); },
      openFile: async () => null,
      chooseBackupFolder: async () => null,
      backup: async () => 'synthetic-browser-only',
      storageStatus: async () => ({ lastSavedAt: '', lastBackupAt: '' }),
      openDataFolder: async () => {},
      notify: async () => {},
      pdf: async () => null,
      version: async () => '2.2.1',
      onBeforeClose: () => () => {},
    };
    document.documentElement.dataset.platform = 'android';
  }
  return (
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <UiProvider>
      <Shell />
    </UiProvider>,
  ));
});
