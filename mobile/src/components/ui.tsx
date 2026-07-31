import { PropsWithChildren, ReactElement, ReactNode } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet,
  RefreshControlProps, TextInputProps, View, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { AlertCircle, Inbox, RefreshCw, WifiOff } from 'lucide-react-native';
import { radius, spacing, typography, useAppTheme } from '../theme';
import { Text, TextInput } from './Typography';

export function Screen({ children, scroll = true, style, refreshControl }: PropsWithChildren<{ scroll?: boolean; style?: ViewStyle; refreshControl?: ReactElement<RefreshControlProps> }>) {
  const { colors } = useAppTheme();
  const body = scroll
    ? <ScrollView keyboardShouldPersistTaps="handled" refreshControl={refreshControl} contentContainerStyle={[styles.content, style]}>{children}</ScrollView>
    : <View style={[styles.content, { flex: 1 }, style]}>{children}</View>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{body}</KeyboardAvoidingView>
  </SafeAreaView>;
}

export function Title({ children, subtitle }: PropsWithChildren<{ subtitle?: string }>) {
  const { colors } = useAppTheme();
  return <View style={{ gap: 6 }}>
    <Text accessibilityRole="header" allowFontScaling style={[styles.title, { color: colors.text }]}>{children}</Text>
    {!!subtitle && <Text allowFontScaling style={[styles.body, { color: colors.textMuted }]}>{subtitle}</Text>}
  </View>;
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const { colors } = useAppTheme();
  return <View style={{ gap: 7 }}>
    <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    <TextInput
      accessibilityLabel={label}
      placeholderTextColor={colors.textMuted}
      style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border }]}
      {...props}
    />
    {!!error && <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>{error}</Text>}
  </View>;
}

export function Button({ label, onPress, variant = 'primary', disabled, icon, compact = false, align = 'center' }: {
  label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; icon?: ReactNode; compact?: boolean; align?: 'left' | 'center';
}) {
  const { colors } = useAppTheme();
  const background = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.dangerSoft : colors.surface;
  const color = variant === 'primary' ? (colors.primary === '#5EEAD4' ? '#052E2B' : '#FFFFFF') : variant === 'danger' ? colors.danger : colors.text;
  return <Pressable
    accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
    onPress={() => { Haptics.selectionAsync(); onPress(); }}
    style={({ pressed }) => [styles.button, compact && styles.compactButton, align === 'left' && styles.leftButton, { backgroundColor: background, borderColor: variant === 'secondary' ? colors.border : background, opacity: disabled ? .45 : pressed ? .8 : 1 }]}
  >
    {icon}<Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.buttonText, compact && styles.compactButtonText, align === 'left' && styles.leftButtonText, { color }]}>{label}</Text>
  </Pressable>;
}

export function Card({ children }: PropsWithChildren) {
  const { colors } = useAppTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>;
}

export function StateView({ kind, title, message, actionLabel, onAction }: {
  kind: 'loading' | 'empty' | 'error' | 'offline'; title?: string; message?: string; actionLabel?: string; onAction?: () => void;
}) {
  const { colors } = useAppTheme();
  const Icon = kind === 'offline' ? WifiOff : kind === 'empty' ? Inbox : AlertCircle;
  return <View accessible accessibilityRole={kind === 'error' ? 'alert' : 'summary'} style={styles.state}>
    {kind === 'loading' ? <ActivityIndicator size="large" color={colors.primary} /> : <Icon size={34} color={kind === 'error' ? colors.danger : colors.textMuted} />}
    <Text style={[styles.stateTitle, { color: colors.text }]}>{title || (kind === 'loading' ? 'Loading…' : kind === 'empty' ? 'Nothing here yet' : kind === 'offline' ? 'You are offline' : 'Something went wrong')}</Text>
    {!!message && <Text style={[styles.stateMessage, { color: colors.textMuted }]}>{message}</Text>}
    {!!onAction && <Button label={actionLabel || 'Try again'} onPress={onAction} variant="secondary" icon={<RefreshCw size={16} color={colors.text} />} />}
  </View>;
}

export const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1 },
  title: { fontFamily: typography.black, fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -.5 },
  body: { fontFamily: typography.family, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: typography.bold, fontSize: 14, fontWeight: '700' },
  input: { fontFamily: typography.family, minHeight: 52, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 15, fontSize: 16 },
  error: { fontFamily: typography.family, fontSize: 13, lineHeight: 18 },
  button: { minHeight: 46, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  buttonText: { fontFamily: typography.bold, fontSize: 14, fontWeight: '700' },
  leftButton: { justifyContent: 'flex-start' },
  leftButtonText: { flex: 1, textAlign: 'left' },
  compactButton: { minHeight: 44, paddingHorizontal: 6 },
  compactButtonText: { fontSize: 13 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md },
  state: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  stateTitle: { fontFamily: typography.bold, fontSize: 19, fontWeight: '700', textAlign: 'center' },
  stateMessage: { fontFamily: typography.family, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 330 },
});
