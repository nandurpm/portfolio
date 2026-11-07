import { widgetAccess, widgetAction, widgetSummary, type WidgetAction, type WidgetContext,
  type WidgetAccess, type WidgetSnapshot } from '../domain/widget-summary';

export interface WidgetTransport {
  beginWidgets(): Promise<{ epoch: number }>;
  updateWidgets(value: { epoch: number; sequence: number; owner: string; access: WidgetAccess;
    snapshot?: WidgetSnapshot }): Promise<void>;
  consumeWidgetAction(): Promise<{ action: string | null }>;
}

/** Native rejects old epochs/sequences so delayed bridge calls cannot restore another user's data. */
export function widgetCoordinator(transport: WidgetTransport, context: () => WidgetContext,
  open: (action: WidgetAction) => void, now = () => new Date(), failed = () => {}) {
  let epoch: number | undefined, sequence = 0, stopped = false;
  let lastSent = '';
  let cached: { plan: WidgetContext['plan']; owner: string; day: string; snapshot: WidgetSnapshot } | undefined;
  let pending: WidgetAction | null = null;
  const deliver = () => {
    if (pending && widgetAccess(context()).access === 'ready') {
      const action = pending;
      pending = null;
      open(action); // Navigation only. Saving still requires the existing validated form.
    }
  };
  const publish = () => {
    if (stopped || epoch === undefined) return;
    const c = context(), access = widgetAccess(c), date = now();
    const day = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (access.access !== 'ready') cached = undefined;
    else if (!cached || cached.plan !== c.plan || cached.owner !== access.owner || cached.day !== day ||
      date.getTime() - cached.snapshot.updatedAt >= 300_000 || date.getTime() < cached.snapshot.updatedAt) {
      // Plans are immutable in the store. Auth/sync status notifications need no
      // repeated ledger traversal or preference writes when financial data is unchanged.
      cached = { plan: c.plan, owner: access.owner, day, snapshot: widgetSummary(c, date) };
    }
    const snapshot = cached ? { ...cached.snapshot, offline: !c.online, syncPending: c.syncPending } : undefined;
    const payload = { ...access, ...(snapshot ? { snapshot } : {}) };
    const signature = JSON.stringify(payload);
    if (signature !== lastSent) {
      lastSent = signature;
      void transport.updateWidgets({ epoch, sequence: ++sequence, ...payload }).catch(() => { lastSent = ''; failed(); });
    }
    deliver();
  };
  const consume = async () => {
    try {
      const result = await transport.consumeWidgetAction();
      if (stopped) return;
      pending = widgetAction(result.action) ?? pending;
      if (pending === 'refresh') cached = undefined;
      publish();
    } catch { failed(); }
  };
  const start = async () => {
    try {
      const result = await transport.beginWidgets();
      if (stopped) return;
      epoch = result.epoch;
      lastSent = ''; cached = undefined;
      publish();
      await consume();
    } catch { failed(); }
  };
  return { start, publish, consume, stop: () => { stopped = true; pending = null; } };
}
