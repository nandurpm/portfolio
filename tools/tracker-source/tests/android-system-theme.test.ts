import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({platform:'android',style:vi.fn().mockResolvedValue(undefined),backgrounds:vi.fn().mockResolvedValue(undefined)}));
vi.mock('@capacitor/core',()=>({
 Capacitor:{getPlatform:()=>mocks.platform},SystemBars:{setStyle:mocks.style},
 SystemBarsStyle:{Dark:'DARK',Light:'LIGHT'},SystemBarType:{StatusBar:'status',NavigationBar:'navigation'},
}));
vi.mock('@capacitor/app',()=>({App:{exitApp:vi.fn(),addListener:vi.fn()}}));
vi.mock('../src/native-tracker',()=>({native:{setBarBackgrounds:mocks.backgrounds}}));
import {applySystemBarTheme} from '../src/native-ui';
beforeEach(()=>{vi.clearAllMocks();mocks.platform='android';});
describe('Android native system-bar theme',()=>{
 it.each([[false,'LIGHT','#ffffff'],[true,'DARK','#20263e']] as const)('uses matching navigation background/icon contrast for dark=%s',async(dark,style,bottomColor)=>{
  await applySystemBarTheme(dark);
  expect(mocks.style).toHaveBeenCalledWith({bar:'navigation',style});
  expect(mocks.backgrounds).toHaveBeenCalledWith({topColor:dark?'#1d2134':'#ffffff',bottomColor});
 });
 it('preserves supplied native band colors and expands short hex values',async()=>{
  await applySystemBarTheme(false,{topColor:'#fff',bottomColor:'#abc'});
  expect(mocks.backgrounds).toHaveBeenCalledWith({topColor:'#ffffff',bottomColor:'#aabbcc'});
 });
 it('does not call the Android bridge on web or Windows',async()=>{
  mocks.platform='web';await applySystemBarTheme(false);
  expect(mocks.style).not.toHaveBeenCalled();expect(mocks.backgrounds).not.toHaveBeenCalled();
 });
});
