import { Platform, useColorScheme } from 'react-native';
import { usePreferences } from './state/PreferencesContext';

export const lightColors = {
  background: '#F7F8FA', surface: '#FFFFFF', surfaceRaised: '#FFFFFF', text: '#18212F',
  textMuted: '#5C6878', border: '#DCE1E8', primary: '#087F72', primarySoft: '#DDF5F1',
  accent: '#B86600', danger: '#B42318', dangerSoft: '#FEE4E2', success: '#067647',
  warning: '#A15C00', overlay: 'rgba(17,24,39,.56)',
};

export const darkColors = {
  background: '#0B1220', surface: '#111B2C', surfaceRaised: '#172338', text: '#F4F7FB',
  textMuted: '#AFBAC9', border: '#2B3A50', primary: '#5EEAD4', primarySoft: '#123B3A',
  accent: '#FBBF24', danger: '#FDA29B', dangerSoft: '#4B1F24', success: '#6CE9A6',
  warning: '#FEC84B', overlay: 'rgba(0,0,0,.7)',
};

export type AppColors = typeof lightColors;

export function useAppTheme() {
  const system = useColorScheme();
  const { themeMode } = usePreferences();
  const dark = themeMode === 'dark' || (themeMode === 'system' && system === 'dark');
  return { colors: dark ? darkColors : lightColors, dark };
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 10, md: 16, lg: 24, round: 999 };

export const typography = {
  family: Platform.select({
    web: 'Lato, sans-serif',
    default: 'Lato',
  }),
  medium: 'Lato',
  bold: 'LatoBold',
  black: 'LatoBlack',
};
