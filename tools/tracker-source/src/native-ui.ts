import { App } from '@capacitor/app';
import {
  Capacitor,
  SystemBars,
  SystemBarsStyle,
  SystemBarType,
  registerPlugin,
} from '@capacitor/core';

export function listenForAndroidBack(back: () => void): () => void {
  if (Capacitor.getPlatform() !== 'android') return () => {};
  const handle = App.addListener('backButton', back);
  return () => {
    void handle.then((h) => h.remove());
  };
}
export const exitAndroid = () => App.exitApp();

const windowLayout = registerPlugin<{
  setBarBackgrounds(colors: { topColor: string; bottomColor: string }): Promise<void>;
}>('TrackerNative');
export async function applySystemBarTheme(
  dark: boolean,
  colors?: { topColor: string; bottomColor: string },
) {
  if (Capacitor.getPlatform() !== 'android') return;
  // Native safe-area bands use the same colors as the app header and bottom navigation.
  await SystemBars.setStyle({
    bar: SystemBarType.StatusBar,
    style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
  });
  await SystemBars.setStyle({ bar: SystemBarType.NavigationBar, style: SystemBarsStyle.Dark });
  const bands = colors ?? { topColor: dark ? '#1d2134' : '#ffffff', bottomColor: '#6857c7' };
  const expand = (hex: string) =>
    hex.replace(/^#([a-f0-9])([a-f0-9])([a-f0-9])$/i, '#$1$1$2$2$3$3');
  await windowLayout.setBarBackgrounds({
    topColor: expand(bands.topColor),
    bottomColor: expand(bands.bottomColor),
  });
}
