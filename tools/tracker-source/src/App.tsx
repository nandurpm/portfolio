import { listenForAndroidBack, exitAndroid, applySystemBarTheme } from './native-ui';
import { closeTopDialog, handleBack } from './navigation';
import { sync, useCloud } from './cloud/sync';
import { CloudButton, CloudGate } from './cloud/CloudPanel';
import { WEB_APP } from './web-mode';
import { WebAccess } from './cloud/WebAccess';
import { Component, lazy, Suspense, useEffect, useState, useRef, type ReactNode } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  LayoutDashboard,
  ReceiptText,
  ChartNoAxesCombined,
  WalletCards,
  Landmark,
  FileDown,
  Settings as SettingsIcon,
  Undo2,
  Redo2,
  Sun,
  Moon,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react';
import { store, usePlan, useEnvelope, useSaveStatus } from './store';
import { APP_NAME } from './domain/types';
import { cumulative, progress } from './domain/calculate';
import { today, monthsBetween } from './domain/dates';
import { RangeControl } from './components/RangeControl';
import { UiProvider, useUi, Modal } from './components/UI';
import Dashboard from './pages/Dashboard';
const Entries = lazy(() => import('./pages/Entries')),
  Budget = lazy(() => import('./pages/Budget')),
  Loan = lazy(() => import('./pages/Loan')),
  Forecast = lazy(() => import('./pages/Forecast')),
  Reports = lazy(() => import('./pages/Reports')),
  Settings = lazy(() => import('./pages/Settings'));
const pages = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'entries', name: 'Daily Entries', icon: ReceiptText },
  { id: 'budget', name: 'Budget & Plan', icon: WalletCards },
  { id: 'loan', name: 'Loan & Closure', icon: Landmark },
  { id: 'forecast', name: 'Forecast & Month-by-month', icon: ChartNoAxesCombined },
  { id: 'reports', name: 'Reports & Export/Import', icon: FileDown },
  { id: 'settings', name: 'Settings', icon: SettingsIcon },
];
class Boundary extends Component<{ children: ReactNode }, { error: string }> {
  override state = { error: '' };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  override render() {
    if (this.state.error)
      return (
        <div className="fatal">
          <h1>We couldn’t open this screen.</h1>
          <p>{this.state.error}</p>
          <p>Your saved data remains on this device.</p>
          <button onClick={() => location.reload()}>Reload app</button>
        </div>
      );
    return this.props.children;
  }
}
function Shell() {
  const cloud = useCloud();
  const p = usePlan(),
    env = useEnvelope(),
    [status, warning] = useSaveStatus(),
    { toast } = useUi(),
    [page, setPage] = useState('dashboard'),
    [more, setMore] = useState(false),
    [entryKind, setEntryKind] = useState<'Income' | 'Expense'>('Expense'),
    [collapsed, setCollapsed] = useState(false),
    [loading, setLoading] = useState(true),
    [tick, setTick] = useState(0);
  const pageRef = useRef(page);
  pageRef.current = page;
  const navigate = (next: string) => {
    setPage(next);
    setMore(false);
    document.querySelector('.main-scroll')?.scrollTo(0, 0);
    document.querySelector('.workspace')?.scrollTo(0, 0);
  };
  useEffect(
    () =>
      listenForAndroidBack(() => {
        void handleBack({
          page: pageRef.current,
          closeDialog: closeTopDialog,
          dashboard: () => navigate('dashboard'),
          flush: () => store.flush(),
          exit: exitAndroid,
        }).catch((e) => toast(`Please save before exiting: ${String(e)}`, true));
      }),
    [],
  );
  const recovery = status === 'Recovery needed';
  const current = pages.find((x) => x.id === page)!;
  useEffect(() => {
    void store
      .load()
      .then(() => sync.start())
      .catch((e) => toast(String(e), true))
      .finally(() => setLoading(false));
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    const off = window.desktop?.onBeforeClose(() => store.flush());
    return () => {
      clearInterval(timer);
      sync.stop();
      off?.();
    };
  }, []);
  useEffect(() => {
    const dark =
      p.settings.theme === 'dark' ||
      (p.settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.palette = p.settings.palette;
    void applySystemBarTheme(dark, {
      topColor: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim(),
      bottomColor: getComputedStyle(document.documentElement)
        .getPropertyValue('--sidebar-b')
        .trim(),
    }).catch((e) => console.warn('System bar style:', e));
    document.documentElement.dataset.palette = p.settings.palette;
    document.documentElement.dataset.animations = String(p.settings.animations);
    const media = matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (p.settings.theme === 'system') {
        document.documentElement.dataset.theme = media.matches ? 'dark' : 'light';
        void applySystemBarTheme(media.matches, {
          topColor: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim(),
          bottomColor: getComputedStyle(document.documentElement)
            .getPropertyValue('--sidebar-b')
            .trim(),
        }).catch((e) => console.warn('System bar style:', e));
      }
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [p.settings.theme, p.settings.palette, p.settings.animations]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (cloud.locked || cloud.review || cloud.initial !== undefined) return;
      if (
        e.isComposing ||
        (e.target instanceof HTMLElement &&
          e.target.closest(
            'input,textarea,select,[contenteditable]:not([contenteditable="false"])',
          ))
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if ((e.target as HTMLElement).closest('[role="dialog"]')) return;
        e.preventDefault();
        try {
          if (e.shiftKey) store.redo();
          else store.undo();
        } catch (err) {
          toast(String(err), true);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        try {
          store.redo();
        } catch (err) {
          toast(String(err), true);
        }
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setPage('entries');
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [toast, cloud.locked, cloud.review, cloud.initial]);
  useEffect(() => {
    if (
      loading ||
      recovery ||
      cloud.locked ||
      cloud.review ||
      cloud.initial !== undefined ||
      !p.settings.animations
    )
      return;
    const actual = cumulative(p).actual.savings,
      achieved = [10000, 25000, 50000, 100000, 200000]
        .filter((n) => actual >= n && !p.celebrated.includes(`savings-${n}`))
        .map((n) => `savings-${n}`);
    const completed = progress(p, today())
      .filter(
        (r) =>
          r.month < today().slice(0, 7) &&
          r.actual &&
          r.actual.savings >= r.plan.savings &&
          !p.celebrated.includes(`month-${r.month}`),
      )
      .map((r) => `month-${r.month}`);
    const all = [...achieved, ...completed];
    if (!all.length) return;
    store.change('Celebrate savings milestone', (d) => {
      d.celebrated.push(...all);
    });
    void confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.35 },
      colors: ['#6255df', '#20b69c', '#ffbd59'],
      disableForReducedMotion: true,
    });
    toast('A savings milestone reached. Keep the progress going!');
  }, [p, loading, recovery, tick, toast, cloud.locked, cloud.review, cloud.initial]);
  if (!loading && (cloud.locked || cloud.review || cloud.initial !== undefined))
    return <CloudGate />;
  return (
    <MotionConfig reducedMotion={p.settings.animations ? 'user' : 'always'}>
      <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <aside className="sidebar">
          <div className="brand">
            <img src="./icon.svg" alt="" />
            <span>
              Savings and
              <br />
              Expense Tracker
            </span>
          </div>
          <div className="sidebar-label">YOUR WORKSPACE</div>
          <nav aria-label="Main navigation">
            {pages.map((x) => (
              <button
                key={x.id}
                className={page === x.id ? 'active' : ''}
                onClick={() => {
                  navigate(x.id);
                }}
                title={x.name}
              >
                <x.icon size={20} />
                <span>{x.name}</span>
                {page === x.id && <span className="nav-dot" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="privacy-card">
              <ShieldCheck size={22} />
              <div>
                <strong>Made for your peace of mind</strong>
                <p>Local first. Private account sync when enabled.</p>
              </div>
            </div>
            <div className="profile">
              <div className="avatar">
                {cloud.session?.user.email?.slice(0, 1).toUpperCase() ?? 'P'}
              </div>
              <div>
                <strong>{cloud.session?.user.email ?? 'Personal finance'}</strong>
                <span>Personal finance</span>
              </div>
              <button
                className="icon-button"
                aria-label="Collapse sidebar"
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
            </div>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <strong className="phone-title">
              {
                (
                  {
                    dashboard: 'Home',
                    entries: 'Entries',
                    budget: 'Budget',
                    loan: 'Loan',
                    forecast: 'Forecast',
                    reports: 'Reports',
                    settings: 'Settings',
                  } as Record<string, string>
                )[page]
              }
            </strong>
            <div className="breadcrumbs">
              <span>Personal workspace</span>
              <ChevronRight size={14} />
              <strong>{current.name}</strong>
            </div>
            <div className="top-actions">
              <CloudButton />
              <button
                className="icon-button phone-settings"
                aria-label="Open Settings"
                onClick={() => navigate('settings')}
              >
                <SettingsIcon size={21} />
              </button>
              <fieldset disabled={recovery} className="edit-controls">
                <RangeControl compact />
              </fieldset>
              {(!WEB_APP || status !== 'Saved locally') && (
                <span className={`save-indicator ${status === 'Save failed' ? 'failed' : ''}`}>
                  <Check size={14} />
                  {status}
                </span>
              )}
              <button
                className="icon-button"
                aria-label="Undo"
                title="Undo · Ctrl+Z"
                disabled={recovery || !env.undo.length}
                onClick={() => {
                  try {
                    store.undo();
                  } catch (e) {
                    toast(String(e), true);
                  }
                }}
              >
                <Undo2 size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Redo"
                title="Redo · Ctrl+Y"
                disabled={recovery || !env.redo.length}
                onClick={() => {
                  try {
                    store.redo();
                  } catch (e) {
                    toast(String(e), true);
                  }
                }}
              >
                <Redo2 size={18} />
              </button>
              <button
                className="icon-button theme-switch"
                aria-label="Toggle light and dark theme"
                disabled={recovery}
                onClick={() =>
                  store.change('Toggle theme', (d) => {
                    d.settings.theme =
                      document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
                  })
                }
              >
                {p.settings.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </header>
          <main className="main-scroll">
            {warning && (
              <div className="callout error" role="alert">
                {warning}
                {status === 'Save failed' && (
                  <button
                    className="button secondary"
                    onClick={() => void store.retrySave().catch((e) => toast(String(e), true))}
                  >
                    Retry save
                  </button>
                )}
              </div>
            )}
            <fieldset
              disabled={recovery && page !== 'reports'}
              className="edit-controls"
              aria-label="Screen controls"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={page}
                  initial={p.settings.animations ? { opacity: 0, y: 12 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={p.settings.animations ? { opacity: 0 } : undefined}
                  transition={{ duration: p.settings.animations ? 0.16 : 0 }}
                >
                  <Suspense
                    fallback={
                      <div className="screen-loading">
                        <span className="spinner" />
                        Opening {current.name}…
                      </div>
                    }
                  >
                    {page === 'dashboard' ? (
                      <Dashboard
                        navigate={navigate}
                        addEntry={(kind) => {
                          setEntryKind(kind);
                          setPage('entries');
                        }}
                      />
                    ) : page === 'entries' ? (
                      <Entries initialKind={entryKind} />
                    ) : page === 'budget' ? (
                      <Budget />
                    ) : page === 'loan' ? (
                      <Loan />
                    ) : page === 'forecast' ? (
                      <Forecast />
                    ) : page === 'reports' ? (
                      <Reports />
                    ) : (
                      <Settings navigate={navigate} />
                    )}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </fieldset>
            <footer className="app-footer">
              <span>{APP_NAME}</span>
              <span>
                {monthsBetween(p.settings.planStart, p.settings.planEnd).length} months in your plan
                · All amounts in INR
              </span>
            </footer>
          </main>
        </div>
        <nav className="phone-nav" aria-label="Phone navigation">
          {[
            { id: 'dashboard', name: 'Home', icon: LayoutDashboard },
            { id: 'entries', name: 'Entries', icon: ReceiptText },
            { id: 'budget', name: 'Budget', icon: WalletCards },
            { id: 'forecast', name: 'Forecast', icon: ChartNoAxesCombined },
          ].map((x) => (
            <button
              key={x.id}
              aria-current={page === x.id ? 'page' : undefined}
              onClick={() => navigate(x.id)}
            >
              <x.icon size={22} />
              <span>{x.name}</span>
            </button>
          ))}
          <button
            aria-label="More screens"
            aria-expanded={more}
            aria-current={['loan', 'reports', 'settings'].includes(page) ? 'page' : undefined}
            onClick={() => setMore(true)}
          >
            <MoreHorizontal size={22} />
            <span>More</span>
          </button>
        </nav>
        {more && (
          <Modal title="More screens & tools" onClose={() => setMore(false)}>
            <div className="phone-menu">
              {pages
                .filter((x) => ['loan', 'reports', 'settings'].includes(x.id))
                .map((x) => (
                  <button key={x.id} className="button secondary" onClick={() => navigate(x.id)}>
                    <x.icon size={22} />
                    {x.id === 'loan'
                      ? 'Loan & Closure'
                      : x.id === 'reports'
                        ? 'Reports & Export/Import'
                        : 'Settings'}
                  </button>
                ))}
              <div className="phone-menu-actions">
                <button
                  className="button secondary"
                  disabled={recovery || !env.undo.length}
                  onClick={() => {
                    try {
                      store.undo();
                    } catch (e) {
                      toast(String(e), true);
                    }
                  }}
                >
                  <Undo2 size={19} />
                  Undo
                </button>
                <button
                  className="button secondary"
                  disabled={recovery || !env.redo.length}
                  onClick={() => {
                    try {
                      store.redo();
                    } catch (e) {
                      toast(String(e), true);
                    }
                  }}
                >
                  <Redo2 size={19} />
                  Redo
                </button>
              </div>
              <p className="muted">{status} · Your plan range and appearance are in Settings.</p>
            </div>
          </Modal>
        )}
        <AnimatePresence>
          {loading && (
            <motion.div className="splash" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <motion.img
                src="./icon.svg"
                alt=""
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              />
              <h1>{APP_NAME}</h1>
              <p>Your money. A clearer picture.</p>
              <span className="spinner" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
export default function App() {
  return (
    <Boundary>
      <UiProvider>
        {WEB_APP ? (
          <WebAccess>
            <Shell />
          </WebAccess>
        ) : (
          <Shell />
        )}
      </UiProvider>
    </Boundary>
  );
}
