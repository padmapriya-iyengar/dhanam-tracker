import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { darkColors, lightColors, ThemeColors } from './theme';

export type ThemeMode = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'dhanam.themeMode';

type ThemeValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeValue | null>(null);

async function readMode(): Promise<ThemeMode> {
  const value = Platform.OS === 'web'
    ? globalThis.localStorage?.getItem(STORAGE_KEY)
    : await SecureStore.getItemAsync(STORAGE_KEY);
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

async function writeMode(mode: ThemeMode) {
  if (Platform.OS === 'web') globalThis.localStorage?.setItem(STORAGE_KEY, mode);
  else await SecureStore.setItemAsync(STORAGE_KEY, mode);
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, updateMode] = useState<ThemeMode>('system');
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark' | 'unspecified' | undefined>(Appearance.getColorScheme() || undefined);

  useEffect(() => {
    readMode().then(updateMode).catch(() => updateMode('system'));
    const subscription = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme || undefined));
    return () => subscription.remove();
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const value = useMemo<ThemeValue>(() => ({
    mode,
    isDark,
    colors: isDark ? darkColors : lightColors,
    async setMode(next) {
      updateMode(next);
      await writeMode(next);
    },
  }), [isDark, mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
