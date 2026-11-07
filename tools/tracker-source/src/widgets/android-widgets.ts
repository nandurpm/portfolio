import { Capacitor } from '@capacitor/core';
import { native } from '../native-tracker';
import { store } from '../store';
import { sync } from '../cloud/sync';
import { widgetCoordinator } from './coordinator';
import type { WidgetAction } from '../domain/widget-summary';

export function startAndroidWidgets(open: (action: WidgetAction) => void) {
  if (Capacitor.getPlatform() !== 'android') return;
  let loading = true;
  const coordinator = widgetCoordinator(native, () => {
    const env = store.get(), cloud = sync.get();
    return {
      plan: env.data, planOwner: env.sync?.ownerId, userId: cloud.session?.user.id,
      loading, locked: cloud.locked,
      needsAttention: !!cloud.review || cloud.initial !== undefined || ['Recovery needed', 'Save failed'].includes(store.status()[0]),
      online: navigator.onLine, syncPending: !!cloud.error || cloud.busy ||
        (!!cloud.session && cloud.status !== 'Up to date'),
    };
  }, action => {
    open(action);
    if (action === 'refresh') void sync.run().finally(coordinator.publish);
  }, () => new Date(), () => {
    // Never log the financial snapshot, owner or session.
    console.warn('Home-screen widget refresh unavailable. Reopen the app to retry.');
  });
  const offStore = store.subscribe(coordinator.publish), offCloud = sync.subscribe(coordinator.publish);
  const listener = native.addListener('trackerWidgetAction', () => { void coordinator.consume(); });
  const visible = () => { if (!document.hidden) { coordinator.publish(); void coordinator.consume(); } };
  document.addEventListener('visibilitychange', visible);
  window.addEventListener('online', coordinator.publish);
  window.addEventListener('offline', coordinator.publish);
  // Calendar changes while the app stays open; Android handles cached rendering when closed.
  const timer = setInterval(() => { if (!document.hidden) coordinator.publish(); }, 60_000);
  void coordinator.start();
  return {
    ready() { loading = false; coordinator.publish(); },
    stop() {
      coordinator.stop(); offStore(); offCloud(); clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('online', coordinator.publish);
      window.removeEventListener('offline', coordinator.publish);
      void listener.then(handle => handle.remove()).catch(() => {});
    },
  };
}
