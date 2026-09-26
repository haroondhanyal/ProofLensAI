import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { WorkspacePalette } from './palette';

export type ThemeName = 'Light' | 'Ocean' | 'Dark' | 'Gray' | 'High contrast';
const KEY = 'prooflens.mobile.theme';
const THEMES: ThemeName[] = ['Light', 'Ocean', 'Dark', 'Gray', 'High contrast'];

export async function readThemePreference(): Promise<ThemeName | null> {
  try {
    const value = Platform.OS === 'web'
      ? (typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY))
      : await SecureStore.getItemAsync(KEY);
    return value && THEMES.includes(value as ThemeName) ? value as ThemeName : null;
  } catch {
    return null;
  }
}

export async function writeThemePreference(theme: ThemeName): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, theme);
    } else {
      await SecureStore.setItemAsync(KEY, theme);
    }
  } catch {
    // Theme persistence is best effort; the current session still uses the selected theme.
  }
}

export function getThemePalette(theme: ThemeName): WorkspacePalette {
  return {
    Light: { bg:'#f7f9fa',surface:'#ffffff',text:'#192b3d',accent:'#286c8b',border:'#e7ecee' },
    Ocean: { bg:'#eaf5f7',surface:'#f4fbfc',text:'#17354a',accent:'#116f83',border:'#bdd9df' },
    Dark: { bg:'#111820',surface:'#1c2731',text:'#edf2f7',accent:'#75c9e7',border:'#3b4652' },
    Gray: { bg:'#242a33',surface:'#303844',text:'#e5ebf1',accent:'#a5c9e7',border:'#49515e' },
    'High contrast': { bg:'#ffffff',surface:'#ffffff',text:'#000000',accent:'#0037a5',border:'#111111' },
  }[theme];
}
