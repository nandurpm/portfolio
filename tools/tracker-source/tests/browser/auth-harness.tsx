// All requests are intercepted by tests. No real credential or production user is used.
import ReactDOM from 'react-dom/client';
import { financialFixture } from '../fixtures/financial';
import { cloudPlan } from '../../src/cloud/model';
import '../../src/styles.css';
const owner = '11111111-1111-4111-8111-111111111111',
  other = '22222222-2222-4222-8222-222222222222';
const mode = new URLSearchParams(location.search).get('mode');
const fixture = financialFixture();
fixture.sync = {
  ownerId: owner,
  base: cloudPlan(fixture.data),
  revision: 1,
  lastSyncAt: new Date().toISOString(),
};
localStorage.setItem('savings-expence-v1', JSON.stringify(fixture));
const user = {
  id: mode === 'wrong-owner' ? other : owner,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'synthetic@example.invalid',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
};
const token = [
  btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
  btoa(JSON.stringify({ sub: user.id, exp: 4102444800, role: 'authenticated' })),
  'synthetic-signature',
].join('.');
if (mode !== 'signed-out')
  sessionStorage.setItem(
    'tracker-auth-v1',
    JSON.stringify({
      access_token: token,
      refresh_token: 'synthetic-refresh',
      expires_at: 4102444800,
      expires_in: 2000000000,
      token_type: 'bearer',
      user,
    }),
  );
void (async () => {
  const [{ WebAccess }, { UiProvider }, { sync }] = await Promise.all([
    import('../../src/cloud/WebAccess'),
    import('../../src/components/UI'),
    import('../../src/cloud/sync'),
  ]);
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <UiProvider>
      <WebAccess>
        <main>
          <h1>Synthetic protected workspace</h1>
          <button onClick={() => void sync.signOut()}>Synthetic sign out</button>
        </main>
      </WebAccess>
    </UiProvider>,
  );
})();
