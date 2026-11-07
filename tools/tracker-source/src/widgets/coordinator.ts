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
    const c = context(), access = widgetAccess(c);
    const value = { epoch, sequence: ++sequence, ...access,
      ...(access.access === 'ready' ? { snapshot: widgetSummary(c, now()) } : {}) };
    void transport.updateWidgets(value).catch(failed);
    deliver();
  };
  const consume = async () => {
    try {
      const result = await transport.consumeWidgetAction();
      if (stopped) return;
      pending = widgetAction(result.action) ?? pending;
      publish();
    } catch { failed(); }
  };
  const start = async () => {
    try {
      const result = await transport.beginWidgets();
      if (stopped) return;
      epoch = result.epoch;
      publish();
      await consume();
    } catch { failed(); }
  };
  return { start, publish, consume, stop: () => { stopped = true; pending = null; } };
}
