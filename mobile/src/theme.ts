export const lightColors = {
  background: '#EEF1F8',
  surface: '#FCFCFF',
  surfaceMuted: '#F4F5FA',
  text: '#182033',
  textMuted: '#697086',
  textSoft: '#98A2B3',
  border: '#E0E3EE',
  primary: '#4F46E5',
  primaryDark: '#3730A3',
  primarySoft: '#EEF2FF',
  positive: '#047857',
  positiveSoft: '#ECFDF3',
  negative: '#BE123C',
  negativeSoft: '#FFF1F2',
  violet: '#7C3AED',
  violetSoft: '#F5F3FF',
  cyan: '#087E8B',
  cyanSoft: '#ECFEFF',
  amber: '#B45309',
  amberSoft: '#FFFBEB',
  backdrop: '#111827',
  nav: '#FCFCFF',
  input: '#FFFFFF',
  card: 'rgba(252,252,255,0.94)',
  divider: '#F0F2F5',
  gradient: ['#F5F2FF', '#EDF3FA', '#ECF8F5'] as const,
};

export type ThemeColors = {
  [Key in Exclude<keyof typeof lightColors, 'gradient'>]: string;
} & {
  gradient: readonly [string, string, string];
};

export const darkColors: ThemeColors = {
  background: '#0D1220',
  surface: '#151B2C',
  surfaceMuted: '#1B2235',
  text: '#F4F6FC',
  textMuted: '#A7B0C4',
  textSoft: '#778198',
  border: '#293249',
  primary: '#818CF8',
  primaryDark: '#C7D2FE',
  primarySoft: '#252A52',
  positive: '#5EE0A0',
  positiveSoft: '#12372C',
  negative: '#FB7185',
  negativeSoft: '#3B1824',
  violet: '#B69AF8',
  violetSoft: '#2D2048',
  cyan: '#66D9E8',
  cyanSoft: '#12353B',
  amber: '#FBBF69',
  amberSoft: '#382A15',
  backdrop: '#080B13',
  nav: '#121827',
  input: '#1A2133',
  card: 'rgba(21,27,44,0.96)',
  divider: '#252E43',
  gradient: ['#121529', '#101827', '#102621'] as const,
};

// Kept as the light palette for non-rendering helpers and legacy imports.
export const colors = lightColors;

// Keep typography aligned with the existing web application's Tailwind theme.
export const typography = {
  fontFamily: 'Trebuchet MS',
} as const;

export const shadow = {
  shadowColor: '#30356B',
  shadowOffset: { width: 0, height: 7 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
};
