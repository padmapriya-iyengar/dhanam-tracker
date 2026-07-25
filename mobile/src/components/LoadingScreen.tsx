import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../theme';
import { useTheme } from '../ThemeContext';

export function LoadingScreen({ label = 'Loading Dhanam…' }: { label?: string }) {
  const { colors: theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.logo, { backgroundColor: theme.primary }]}><Text style={styles.logoText}>D</Text></View>
      <ActivityIndicator size="small" color={theme.primary} />
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: colors.background },
  logo: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  logoText: { ...typography, color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  label: { ...typography, color: colors.textMuted, fontSize: 14 },
});
