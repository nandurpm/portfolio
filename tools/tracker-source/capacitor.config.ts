import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.nandakumar.savingsexpensetracker',
  appName: 'Savings and Expense Tracker',
  webDir: 'dist',
  server: { androidScheme: 'https', cleartext: false },
  // MainActivity owns all Android system/keyboard insets; never add a second CSS inset.
  plugins: { SystemBars: { insetsHandling: 'disable' } },
  android: { allowMixedContent: false, webContentsDebuggingEnabled: false },
};
export default config;
