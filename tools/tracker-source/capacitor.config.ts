import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.nandakumar.savingsexpensetracker',
  appName: 'Savings and Expense Tracker',
  webDir: 'dist',
  // Bridge calls can contain financial summaries or secure-session payloads.
  loggingBehavior: 'none',
  server: { androidScheme: 'https', cleartext: false },
  // MainActivity owns all Android system/keyboard insets; never add a second CSS inset.
  plugins: { SystemBars: { insetsHandling: 'disable' } },
  android: { allowMixedContent: false, webContentsDebuggingEnabled: false },
};
export default config;
