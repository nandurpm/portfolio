import { cachedLoader } from "./page-loader";
import { userError } from './domain/user-error';
import {
  listenForAndroidBack,
  exitAndroid,
  applySystemBarTheme,
} from "./native-ui";
import { closeTopDialog, handleBack } from "./navigation";
import { sync, useCloud } from "./cloud/sync";
import { CloudButton, CloudGate } from "./cloud/CloudPanel";
import { WEB_APP } from "./web-mode";
import { WebAccess } from "./cloud/WebAccess";
import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import confetti from "canvas-confetti";
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
  Plus,
  CircleDollarSign,
} from "lucide-react";
import { store, usePlan, useEnvelope, useSaveStatus } from "./store";
import { APP_NAME } from "./domain/types";
import { errorMessage } from "./domain/user-errors";
import { cumulative, progress } from "./domain/calculate";
import { today, monthsBetween, daysIn, inRange } from "./domain/dates";
import { RangeControl } from "./components/RangeControl";
import { ReleaseUpdate } from "./components/ReleaseUpdate";
import { UiProvider, useUi, Modal } from "./components/UI";
import { playMilestoneSound, triggerMilestoneHaptic, triggerActionFeedback } from "./celebrations";
import { themePresets } from "./theme-presets";
import { AndroidMore } from './components/AndroidMore';
import { ShortcutHelp } from "./components/ShortcutHelp";
import { startAndroidWidgets } from './widgets/android-widgets';
const pageLoaders = {
  dashboard: cachedLoader(() => import("./pages/Dashboard")),
  androidDashboard: cachedLoader(() => import("./pages/AndroidDashboard222")),
  accounts: cachedLoader(() => import("./pages/Accounts")),
  employment: cachedLoader(() => import("./pages/Employment")),
  entries: cachedLoader(() => import("./pages/Entries")),
  budget: cachedLoader(() => import("./pages/Budget")),
  loan: cachedLoader(() => import("./pages/Loan")),
  forecast: cachedLoader(() => import("./pages/Forecast")),
  reports: cachedLoader(() => import("./pages/Reports")),
  balances: cachedLoader(() => import("./pages/Balances")),
  settings: cachedLoader(() => import("./pages/Settings")),
};
const preloadPage = (page: string) => {
  const key = page === 'dashboard' && window.desktop?.platform === 'android' ? 'androidDashboard' : page;
  const loader = pageLoaders[key as keyof typeof pageLoaders];
  if (loader) void loader().catch(() => { /* Navigation can retry a failed speculative import. */ });
};
const Dashboard = lazy(pageLoaders.dashboard), AndroidDashboard = lazy(pageLoaders.androidDashboard),
  Accounts = lazy(pageLoaders.accounts), Employment = lazy(pageLoaders.employment),
  Entries = lazy(pageLoaders.entries), Budget = lazy(pageLoaders.budget), Loan = lazy(pageLoaders.loan),
  Forecast = lazy(pageLoaders.forecast), Reports = lazy(pageLoaders.reports),
  Balances = lazy(pageLoaders.balances), Settings = lazy(pageLoaders.settings);
const pages = [
  { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
  { id: "entries", name: "Daily Entries", icon: ReceiptText },
  { id: "accounts", name: "Accounts & transactions", icon: CircleDollarSign },
  { id: "budget", name: "Budget & Plan", icon: WalletCards },
  { id: "loan", name: "Loan & Closure", icon: Landmark },
  { id: "employment", name: "Salary & PF", icon: Landmark },
  { id: "balances", name: "Balances & provisions", icon: WalletCards },
  {
    id: "forecast",
    name: "Forecast & Month-by-month",
    icon: ChartNoAxesCombined,
  },
  { id: "reports", name: "Reports & Export/Import", icon: FileDown },
  { id: "settings", name: "Settings", icon: SettingsIcon },
];
class Boundary extends Component<{ children: ReactNode }, { error: string }> {
  override state = { error: "" };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  override render() {
    if (this.state.error)
      return (
        <div className="fatal">
          <h1>We couldn’t open this screen.</h1>
          <p>{errorMessage(this.state.error)} Reload the app if the problem continues.</p>
          <button
            onClick={() =>
              void navigator.clipboard
                .writeText(this.state.error)
                .catch(() => {})
            }
          >
            Copy error details
          </button>
          <p>Your saved data remains on this device.</p>
          <button onClick={() => location.reload()}>Reload app</button>
        </div>
      );
    return this.props.children;
  }
}
export function Shell() {
  const cloud = useCloud();
  const p = usePlan(),
    env = useEnvelope(),
    [status, warning] = useSaveStatus(),
    { toast } = useUi(),
    [page, setPage] = useState("dashboard"),
    [more, setMore] = useState(false),
    [shortcutHelp, setShortcutHelp] = useState(false),
    [quickAdd, setQuickAdd] = useState(false),
    [entryKind, setEntryKind] = useState<"Income" | "Expense">("Expense"),
    [collapsed, setCollapsed] = useState(false),
    [loading, setLoading] = useState(true),
    [tick, setTick] = useState(0);
  const pageRef = useRef(page);
  pageRef.current = page;
  const androidMore = more && window.desktop?.platform === 'android';
  const [navigationSection, setNavigationSection] = useState<string | undefined>();
  const [widgetEntry, setWidgetEntry] = useState<{ kind: 'Income' | 'Expense'; sequence: number }>();
  const navigate = (next: string, section?: string) => {
    preloadPage(next);
    setPage(next);
    setMore(false);
    setNavigationSection(section);
    document.querySelector(".main-scroll")?.scrollTo(0, 0);
    document.querySelector(".workspace")?.scrollTo(0, 0);
  };
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        for (const key of ['entries', 'accounts', 'budget'] as const) {
          if (cancelled) break;
          try { await pageLoaders[key](); } catch { /* Keep current screen usable offline. */ }
        }
      })();
    }, 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [loading]);
  // Wait for lazy screen content before focusing a More-card destination.
  // This changes presentation only; the destination retains all of its existing handlers.
  useEffect(() => {
    if (!navigationSection) return;
    const main = document.querySelector('.main-scroll');
    if (!main) return;
    const focusSection = () => {
      const heading = Array.from(main.querySelectorAll<HTMLElement>('h2')).find(
        item => item.textContent?.trim() === navigationSection,
      );
      if (!heading) return false;
      heading.tabIndex = -1;
      heading.scrollIntoView({ block: 'start' });
      heading.focus({ preventScroll: true });
      setNavigationSection(undefined);
      return true;
    };
    if (focusSection()) return;
    const observer = new MutationObserver(() => { if (focusSection()) observer.disconnect(); });
    observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [page, navigationSection]);
  useEffect(
    () =>
      listenForAndroidBack(() => {
        void handleBack({
          page: pageRef.current,
          closeDialog: closeTopDialog,
          dashboard: () => navigate("dashboard"),
          flush: () => store.flush(),
          exit: exitAndroid,
        }).catch((e) =>
          toast(userError(e), true),
        );
      }),
    [],
  );
  const recovery = status === "Recovery needed";
  const current = pages.find((x) => x.id === page)!;
  const Home = window.desktop?.platform === 'android' ? AndroidDashboard : Dashboard;
  useEffect(() => {
    document.title = `${current.name} · Tracker`;
  }, [current.name]);
  useEffect(() => {
    const widgets = startAndroidWidgets(action => {
      if (action === 'refresh') { navigate('dashboard'); return; }
      const kind = action === 'income' ? 'Income' : 'Expense';
      setEntryKind(kind);
      setWidgetEntry(previous => ({ kind, sequence: (previous?.sequence ?? 0) + 1 }));
      navigate('entries');
    });
    void store
      .load()
      .then(() => sync.start())
      .catch((e) => toast(userError(e), true))
      .finally(() => { setLoading(false); widgets?.ready(); });
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    const off = window.desktop?.onBeforeClose(() => store.flush());
    return () => {
      clearInterval(timer);
      sync.stop();
      widgets?.stop();
      off?.();
    };
  }, []);
  useEffect(() => {
    const dark =
      p.settings.theme === "dark" ||
      (p.settings.theme === "system" &&
        matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    // Set the palette before computing native bar colours and cache it for the next first paint.
    document.documentElement.dataset.palette = p.settings.palette;
    try {
      localStorage.setItem("tracker-theme", p.settings.theme);
      localStorage.setItem("tracker-palette", p.settings.palette);
    } catch {
      /* Optional UI preference. */
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#1d2134" : "#ffffff");
    void applySystemBarTheme(dark, {
      topColor: getComputedStyle(document.documentElement)
        .getPropertyValue("--surface")
        .trim(),
      bottomColor: getComputedStyle(document.documentElement)
        .getPropertyValue("--sidebar-b")
        .trim(),
    }).catch((e) => console.warn("System bar style:", e));
    document.documentElement.dataset.animations = String(p.settings.animations);
    document.documentElement.dataset.animationIntensity = p.settings.animationIntensity ?? "balanced";
    const media = matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if (p.settings.theme === "system") {
        document.documentElement.dataset.theme = media.matches
          ? "dark"
          : "light";
        document
          .querySelector('meta[name="theme-color"]')
          ?.setAttribute("content", media.matches ? "#1d2134" : "#ffffff");
        void applySystemBarTheme(media.matches, {
          topColor: getComputedStyle(document.documentElement)
            .getPropertyValue("--surface")
            .trim(),
          bottomColor: getComputedStyle(document.documentElement)
            .getPropertyValue("--sidebar-b")
            .trim(),
        }).catch((e) => console.warn("System bar style:", e));
      }
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [p.settings.theme, p.settings.palette, p.settings.animations, p.settings.animationIntensity]);
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
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShortcutHelp((open) => !open);
        return;
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const preset = themePresets.find((item) => item.shortcut === e.key);
        if (preset) {
          e.preventDefault();
          store.change(`Apply ${preset.name} theme`, (d) => {
            d.settings.palette = preset.palette;
            d.settings.animationIntensity = preset.intensity;
            d.settings.celebrationStyle = preset.style;
          });
          toast(`${preset.name} theme applied`);
          return;
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if ((e.target as HTMLElement).closest('[role="dialog"]')) return;
        e.preventDefault();
        try {
          if (e.shiftKey) store.redo();
          else store.undo();
        } catch (err) {
          toast(userError(err), true);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        try {
          store.redo();
        } catch (err) {
          toast(userError(err), true);
        }
      }
      if (e.ctrlKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setPage("entries");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
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
    store.change("Celebrate savings milestone", (d) => {
      d.celebrated.push(...all);
    });
    void confetti({
      particleCount:
        p.settings.animationIntensity === "subtle"
          ? 55
          : p.settings.animationIntensity === "expressive"
            ? 160
            : 100,
      spread:
        p.settings.celebrationStyle === "ring"
          ? 360
          : p.settings.celebrationStyle === "cascade"
            ? 48
            : 70,
      startVelocity: p.settings.celebrationStyle === "cascade" ? 24 : 32,
      origin: { y: p.settings.celebrationStyle === "cascade" ? 0.1 : 0.35 },
      colors: ["#6255df", "#20b69c", "#ffbd59"],
      disableForReducedMotion: true,
    });
    playMilestoneSound(p.settings.celebrationSound === true);
    triggerMilestoneHaptic(p.settings.haptics === true);
    toast("A savings milestone reached. Keep the progress going!");
  }, [
    p,
    loading,
    recovery,
    tick,
    toast,
    cloud.locked,
    cloud.review,
    cloud.initial,
    p.settings.animationIntensity,
    p.settings.celebrationSound,
    p.settings.celebrationStyle,
    p.settings.haptics,
  ]);
  useEffect(() => {
    if (loading || recovery || !window.desktop?.notify || cloud.locked || cloud.review || cloud.initial !== undefined) return;
    const date = today();
    if (!inRange(date, p.settings.planStart, p.settings.planEnd)) return;
    const hour = new Date().getHours();
    const day = Number(date.slice(8, 10));
    const enabled = p.settings.reminders;
    const items: [keyof typeof enabled, boolean, string][] = [
      ['salary', enabled.salary && day === Math.min(p.settings.salaryDay, daysIn(date.slice(0, 7))) && hour >= 9, 'Salary is expected today. Add it to Daily Entries when received.'],
      ['emi', enabled.emi && [...p.loan.rows, ...(p.additionalLoans ?? []).flatMap((loan) => loan.rows)].some((row) => row.dueDate === date && !row.paid && (p.settings.mode !== 'Early closure' || row.month <= p.settings.closureMonth)) && hour >= 8, 'Your EMI is due today. Keep the money ready before salary arrives.'],
      ['recharge', enabled.recharge && p.categories.some((c) => (c.id === 'mobile' || c.name.toLowerCase().includes('recharge')) && c.active && c.timing === 'Fixed day' && (!c.months.length || c.months.includes(Number(date.slice(5, 7)))) && c.day === day && !p.entries.some((entry) => entry.categoryId === c.id && entry.date === date)) && hour >= 9, 'Mobile recharge is due today.'],
      ['missing', enabled.missing && hour >= 21 && !p.entries.some((entry) => entry.date === date), 'No entries recorded today. Take a moment to update your expenses.'],
    ];
    for (const [key, show, body] of items) {
      const storageKey = `tracker-reminder-${key}-${date}`;
      if (show && localStorage.getItem(storageKey) !== 'sent') {
        localStorage.setItem(storageKey, 'sent');
        void window.desktop.notify(APP_NAME, body).then(() => triggerActionFeedback('reminder', p.settings.haptics !== false)).catch(() => {});
      }
    }
  }, [p, tick, loading, recovery, cloud.locked, cloud.review, cloud.initial]);
  if (!loading && (cloud.locked || cloud.review || cloud.initial !== undefined))
    return <CloudGate />;
  return (
    <MotionConfig reducedMotion={p.settings.animations ? "user" : "always"}>
      <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{current.name} screen</div>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
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
                className={page === x.id ? "active" : ""}
                aria-current={page === x.id ? "page" : undefined}
                onPointerEnter={() => preloadPage(x.id)}
                onFocus={() => preloadPage(x.id)}
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
                {cloud.session?.user.email?.slice(0, 1).toUpperCase() ?? "P"}
              </div>
              <div>
                <strong>
                  {cloud.session?.user.email ?? "Personal finance"}
                </strong>
                <span>Personal finance</span>
              </div>
              <button
                className="icon-button"
                aria-label="Collapse sidebar"
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? (
                  <PanelLeftOpen size={18} />
                ) : (
                  <PanelLeftClose size={18} />
                )}
              </button>
            </div>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar" inert={androidMore}>
            <strong className="phone-title">
              {
                (
                  {
                    dashboard: "Home",
                    entries: "Entries",
                    accounts: "Accounts",
                    budget: "Budget",
                    loan: "Loan",
                    forecast: "Forecast",
                    reports: "Reports",
                    settings: "Settings",
                    balances: "Balances",
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
                onClick={() => navigate("settings")}
              >
                <SettingsIcon size={21} />
              </button>
              <fieldset disabled={recovery} className="edit-controls">
                <RangeControl compact />
              </fieldset>
              {(!WEB_APP || status !== "Saved locally") && (
                <span
                  className={`save-indicator ${status === "Save failed" ? "failed" : ""}`}
                >
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
                    toast(userError(e), true);
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
                    toast(userError(e), true);
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
                  store.change("Toggle theme", (d) => {
                    d.settings.theme =
                      document.documentElement.dataset.theme === "dark"
                        ? "light"
                        : "dark";
                  })
                }
              >
                {p.settings.theme === "dark" ? (
                  <Sun size={18} />
                ) : (
                  <Moon size={18} />
                )}
              </button>
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className="main-scroll" data-page={page} inert={androidMore}>
            <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {current.name} page opened
            </div>
            {warning && (
              <div className="callout error" role="alert">
                {warning}
                {status === "Save failed" && (
                  <button
                    className="button secondary"
                    onClick={() =>
                      void store
                        .retrySave()
                        .catch((e) => toast(userError(e), true))
                    }
                  >
                    Retry save
                  </button>
                )}
              </div>
            )}
            <fieldset
              disabled={recovery && page !== "reports"}
              className="edit-controls"
              aria-label="Screen controls"
            >
              {/* Mount the selected screen immediately; never wait for an outgoing fade. */}
                <motion.div
                  key={page}
                  // Keep large report pages outside a persistent transform/composited
                  // layer: translating/scaling the whole page can hurt scrolling.
                  initial={p.settings.animations ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{ duration: p.settings.animations ? 0.12 : 0 }}
                >
                  <Suspense
                    fallback={
                      <div className="screen-loading">
                        <span className="spinner" />
                        Opening {current.name}…
                      </div>
                    }
                  >
                    {page === "dashboard" ? (
                      <Home
                        navigate={navigate}
                        addEntry={(kind) => {
                          setEntryKind(kind);
                          setPage("entries");
                        }}
                      />
                    ) : page === "entries" ? (
                      <Entries initialKind={entryKind} widgetEntry={widgetEntry} />
                    ) : page === "accounts" ? (
                      <Accounts />
                    ) : page === "employment" ? (
                      <Employment />
                    ) : page === "budget" ? (
                      <Budget />
                    ) : page === "loan" ? (
                      <Loan />
                    ) : page === "forecast" ? (
                      <Forecast />
                    ) : page === "balances" ? (
                      <Balances />
                    ) : page === "reports" ? (
                      <Reports />
                    ) : (
                      <Settings navigate={navigate} />
                    )}
                  </Suspense>
                </motion.div>
            </fieldset>
            <details className="tracker-glossary">
              <summary>Financial terms explained</summary>
              <dl>
                <dt>Provision</dt><dd>Money reserved for a future recurring bill; not a payment.</dd>
                <dt>Contract balance</dt><dd>The estimated amount remaining under the loan repayment schedule.</dd>
                <dt>Cash cushion</dt><dd>The minimum cash buffer you prefer to keep available.</dd>
                <dt>Report through</dt><dd>The last date included when counting actual transactions.</dd>
                <dt>Closure headroom</dt><dd>Estimated cash remaining after a proposed loan closure and cash cushion.</dd>
                <dt>Reconciliation</dt><dd>Comparing recorded transactions against your bank or cash statement.</dd>
              </dl>
            </details>
            <footer className="app-footer">
              <span>{APP_NAME}</span>
              <span>
                {monthsBetween(p.settings.planStart, p.settings.planEnd).length}{" "}
                months in your plan · All amounts in INR
              </span>
            </footer>
          </main>
        </div>
        <nav className="phone-nav" aria-label="Phone navigation">
          {[
            { id: "dashboard", name: "Home", icon: LayoutDashboard },
            { id: "entries", name: "Transactions", icon: ReceiptText },
            { id: "accounts", name: "Accounts", icon: CircleDollarSign },
            { id: "budget", name: "Budget", icon: WalletCards },
          ].map((x) => (
            <button
              key={x.id}
              aria-current={page === x.id ? "page" : undefined}
              onPointerEnter={() => preloadPage(x.id)}
              onFocus={() => preloadPage(x.id)}
              onClick={() => navigate(x.id)}
            >
              <x.icon size={22} />
              <span>{x.name}</span>
            </button>
          ))}
          <button
            aria-label="More screens"
            aria-expanded={more}
            aria-current={
              ["loan", "employment", "forecast", "balances", "reports", "settings"].includes(page)
                ? "page"
                : undefined
            }
            onClick={() => setMore(true)}
          >
            <MoreHorizontal size={22} />
            <span>More</span>
          </button>
        </nav>
        {page !== "dashboard" && !androidMore && <button type="button" className="mobile-quick-add" aria-label="Add income or expense" aria-expanded={quickAdd} onClick={() => setQuickAdd(true)}><Plus size={20} aria-hidden="true" /> Add</button>}
        {quickAdd && (
          <Modal title="Add a transaction" onClose={() => setQuickAdd(false)}>
            <div className="phone-menu">
              <button className="button" onClick={() => { setEntryKind("Expense"); navigate("entries"); setQuickAdd(false); }}>Add expense</button>
              <button className="button secondary" onClick={() => { setEntryKind("Income"); navigate("entries"); setQuickAdd(false); }}>Add income</button>
            </div>
          </Modal>
        )}
        {androidMore && <AndroidMore
          onClose={() => setMore(false)}
          navigate={navigate}
          canUndo={!recovery && !!env.undo.length}
          canRedo={!recovery && !!env.redo.length}
          undo={() => { try { store.undo(); } catch (e) { toast(userError(e), true); } }}
          redo={() => { try { store.redo(); } catch (e) { toast(userError(e), true); } }}
        />}
        {more && !androidMore && (
          <Modal title="More screens & tools" onClose={() => setMore(false)}>
            <div className="phone-menu">
              <p>Loans &amp; EMI · Salary &amp; PF · Forecast · Reports &amp; backup · Settings, sync &amp; help</p>
              <button className="button secondary" onClick={() => navigate('accounts')}>Reconciliation, transfers &amp; account activity</button>
              <button className="button secondary" onClick={() => navigate('balances')}>Provisions &amp; reserves</button>
              <button className="button secondary" onClick={() => navigate('accounts')}>Financial position &amp; net worth</button>
              {pages
                .filter((x) =>
                  ["loan", "employment", "forecast", "balances", "reports", "settings"].includes(x.id),
                )
                .map((x) => (
                  <button
                    key={x.id}
                    className="button secondary"
                    onPointerEnter={() => preloadPage(x.id)}
              onFocus={() => preloadPage(x.id)}
              onClick={() => navigate(x.id)}
                  >
                    <x.icon size={22} />
                    {x.name}
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
                      toast(userError(e), true);
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
                      toast(userError(e), true);
                    }
                  }}
                >
                  <Redo2 size={19} />
                  Redo
                </button>
              </div>
              <p className="muted">
                {(!WEB_APP || status !== "Saved locally") && <>{status} · </>}
                Your plan range and appearance are in Settings.
              </p>
            </div>
          </Modal>
        )}
        {shortcutHelp && <ShortcutHelp onClose={() => setShortcutHelp(false)} />}
        <AnimatePresence>
          {loading && (
            <motion.div
              className="splash"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
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
        {!WEB_APP && <ReleaseUpdate />}
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
