// A shared stack makes nested confirmations dismiss in visual order on Escape / Android Back.
const dialogs: { token: symbol; close: () => void }[] = [];
export function registerDialog(close: () => void) {
  const item = { token: Symbol(), close };
  dialogs.push(item);
  return () => {
    const index = dialogs.indexOf(item);
    if (index >= 0) dialogs.splice(index, 1);
  };
}
export function closeTopDialog(): boolean {
  const dialog = dialogs.at(-1);
  if (!dialog) return false;
  dialog.close();
  return true;
}
export function isTopDialog(close: () => void): boolean {
  return dialogs.at(-1)?.close === close;
}

export async function handleBack(actions: {
  page: string;
  closeDialog: () => boolean;
  dashboard: () => void;
  flush: () => Promise<unknown>;
  exit: () => Promise<void>;
}): Promise<'dialog' | 'dashboard' | 'exit'> {
  if (actions.closeDialog()) return 'dialog';
  if (actions.page !== 'dashboard') {
    actions.dashboard();
    return 'dashboard';
  }
  await actions.flush(); // A failed save prevents exiting.
  await actions.exit();
  return 'exit';
}
