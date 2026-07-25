import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'dhanam.webTheme';
const ThemeContext = createContext(null);

const systemIsDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system');
  const [systemDark, setSystemDark] = useState(systemIsDark);
  const isDark = mode === 'dark' || (mode === 'system' && systemDark);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemDark(event.matches);
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  }, [isDark]);

  const setMode = (nextMode) => {
    const normalized = ['light', 'dark', 'system'].includes(nextMode) ? nextMode : 'system';
    localStorage.setItem(STORAGE_KEY, normalized);
    setModeState(normalized);
  };

  const value = useMemo(() => ({ mode, isDark, setMode }), [mode, isDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
