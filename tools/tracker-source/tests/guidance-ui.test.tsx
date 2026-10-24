import { beforeEach, describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { freshPlan } from '../src/domain/defaults';
import { cloudPlan } from '../src/cloud/model';
const state = vi.hoisted(() => ({ plan: null as any, env: null as any, cloud: null as any }));
vi.mock('../src/store', () => ({
  usePlan: () => state.plan,
  useEnvelope: () => state.env,
  useSaveStatus: () => ['Saved locally', '', '', '2026-11-01', ''],
  store: {},
}));
vi.mock('../src/cloud/sync', () => ({ useCloud: () => state.cloud }));
vi.mock('../src/web-mode', () => ({ WEB_APP: true }));
import { SyncStatusDetails } from '../src/cloud/SyncStatus';
import { BackupStatus } from '../src/components/BackupStatus';
import { BudgetAlerts, MonthlyChecklist } from '../src/components/MoneyGuidance';
beforeEach(() => {
  vi.stubGlobal('navigator', { onLine: true });
  state.plan = freshPlan();
  Object.assign(state.plan.settings, {
    planStart: '2026-11',
    planEnd: '2026-12',
    selectedMonth: '2026-11',
    reportDate: '2026-11-15',
    liveDate: false,
  });
  state.plan.entries = [];
  state.plan.loan.rows = [];
  state.plan.additionalLoans = [];
  state.plan.overrides = {};
  state.plan.categories = [
    {
      id: 'food',
      name: 'Food',
      role: 'regular',
      group: 'Living',
      amount: 100,
      timing: 'Daily',
      day: 1,
      active: true,
      months: [],
      note: '',
    },
  ];
  state.env = {
    data: state.plan,
    sync: {
      ownerId: 'test-owner',
      lastSyncAt: '2026-11-01T06:00:00Z',
      base: cloudPlan(state.plan),
    },
  };
  state.cloud = {
    session: { user: { id: 'test-owner' } },
    status: 'Up to date',
    busy: false,
    error: '',
    review: null,
  };
});
describe('guidance and sync UI', () => {
  it('replaces local save information with account sync details on the website', () => {
    const html = renderToStaticMarkup(<BackupStatus />);
    expect(html).toContain('Last successful sync');
    expect(html).toContain('No pending changes');
    expect(html).not.toContain('Saved locally');
    expect(html).not.toContain('Last saved locally');
  });
  it('never reports up to date when financial changes are pending', () => {
    state.plan.settings.opening = 123;
    const html = renderToStaticMarkup(<SyncStatusDetails />);
    expect(html).toContain('Changes pending');
    expect(html).toContain('Pending changes to upload');
    expect(html).not.toContain('Up to date');
  });
  it('reports offline and errors without claiming upload success', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(renderToStaticMarkup(<SyncStatusDetails />)).toContain('Offline');
    state.cloud.error = 'Connection needs attention';
    expect(renderToStaticMarkup(<SyncStatusDetails />)).toContain('Sync needs attention');
  });
  it('renders category warning amounts and leaves missing checklist records unconfirmed', () => {
    state.plan.entries = [
      {
        id: 'a',
        date: '2026-11-12',
        categoryId: 'food',
        amount: 80,
        payment: 'Cash',
        description: 'Test',
        notes: '',
      },
    ];
    expect(renderToStaticMarkup(<BudgetAlerts />)).toContain('80% warning');
    state.plan.entries = [];
    const html = renderToStaticMarkup(<MonthlyChecklist />);
    expect(html).toContain('No entries');
    expect(html).not.toContain('Payment recorded');
  });
});
