import { PropsWithChildren, ReactNode, useMemo } from 'react';
import {
  ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { shadow, ThemeColors, typography } from '../theme';
import { useTheme } from '../ThemeContext';
import { Text, TextInput } from './Typography';

export const today = () => new Date().toISOString().slice(0, 10);

export function money(value: number, currency = 'AED') {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-AE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);
}

export function Page({ children, refreshing = false, onRefresh }: PropsWithChildren<{ refreshing?: boolean; onRefresh?: () => void }>) {
  const { colors, isDark } = useTheme(); const ui = useUi();
  return <View style={ui.pageRoot}>
    <LinearGradient colors={[...colors.gradient]} locations={[0, .52, 1]} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={[ui.glowTop, isDark && { opacity: .4 }]} />
    <View pointerEvents="none" style={[ui.glowBottom, isDark && { opacity: .35 }]} />
    <ScrollView keyboardShouldPersistTaps="handled" style={ui.scroll} contentContainerStyle={ui.page} refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}>{children}</ScrollView>
  </View>;
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  const ui = useUi();
  return <View style={ui.titleRow}><View style={{ flex: 1 }}><Text style={ui.title}>{title}</Text>{subtitle ? <Text style={ui.subtitle}>{subtitle}</Text> : null}</View>{action}</View>;
}

export function Card({ children }: PropsWithChildren) { const ui = useUi(); return <View style={ui.card}>{children}</View>; }

export function Field({ label, value, onChangeText, placeholder, keyboardType, multiline, secureTextEntry }: any) {
  const { colors } = useTheme(); const ui = useUi();
  return <View style={ui.field}><Text style={ui.label}>{label}</Text><TextInput value={String(value ?? '')} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textSoft} keyboardType={keyboardType} multiline={multiline} secureTextEntry={secureTextEntry} style={[ui.input, multiline && ui.textarea]} /></View>;
}

export type Option = { label: string; value: string; color?: string };
export function Choice({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (value: string) => void }) {
  const ui = useUi();
  return <View style={ui.field}><Text style={ui.label}>{label}</Text><View style={ui.choices}>{options.map(option => <Pressable key={option.value} onPress={() => onChange(option.value)} style={[ui.choice, value === option.value && ui.choiceActive]}>{option.color ? <View style={[ui.dot, { backgroundColor: option.color }]} /> : null}<Text style={[ui.choiceText, value === option.value && ui.choiceTextActive]}>{option.label}</Text></Pressable>)}</View></View>;
}

export function Button({ label, onPress, tone = 'primary', disabled = false }: { label: string; onPress: () => void; tone?: 'primary' | 'secondary' | 'danger'; disabled?: boolean }) {
  const ui = useUi();
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [ui.button, tone === 'secondary' && ui.buttonSecondary, tone === 'danger' && ui.buttonDanger, (pressed || disabled) && { opacity: .65 }]}><Text style={[ui.buttonText, tone === 'secondary' && ui.buttonSecondaryText]}>{label}</Text></Pressable>;
}

export function Empty({ text }: { text: string }) { const ui = useUi(); return <Text style={ui.empty}>{text}</Text>; }
export function ErrorBox({ message }: { message: string }) { const ui = useUi(); return message ? <Text style={ui.error}>{message}</Text> : null; }
export function Busy({ label = 'Loading…' }: { label?: string }) { const { colors } = useTheme(); const ui = useUi(); return <View style={ui.busy}><ActivityIndicator color={colors.primary} /><Text style={ui.muted}>{label}</Text></View>; }

export function Sheet({ visible, title, onClose, children }: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  const { colors } = useTheme(); const ui = useUi();
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><View style={ui.sheet}><View style={ui.sheetHeader}><Text style={ui.sheetTitle}>{title}</Text><Pressable onPress={onClose} style={ui.close}><X size={20} color={colors.textMuted} /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.sheetBody}>{children}</ScrollView></View></Modal>;
}

function makeUi(colors: ThemeColors) { return StyleSheet.create({
  pageRoot: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  scroll: { flex: 1 },
  glowTop: { position: 'absolute', width: 250, height: 250, borderRadius: 125, top: -145, right: -75, backgroundColor: 'rgba(129, 140, 248, 0.14)' },
  glowBottom: { position: 'absolute', width: 220, height: 220, borderRadius: 110, bottom: 15, left: -135, backgroundColor: 'rgba(16, 185, 129, 0.10)' },
  page: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 105 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  title: { ...typography, color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.35 },
  subtitle: { ...typography, color: colors.textMuted, fontSize: 10.5, marginTop: 2 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 13, marginBottom: 10, ...shadow },
  field: { marginBottom: 13 },
  label: { ...typography, color: '#444B60', fontSize: 10.5, fontWeight: '700', marginBottom: 6 },
  input: { ...typography, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 12, color: colors.text, backgroundColor: colors.input, fontSize: 12.5 },
  textarea: { minHeight: 86, paddingTop: 12, textAlignVertical: 'top' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: { minHeight: 35, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, backgroundColor: colors.input },
  choiceActive: { borderColor: '#A5B4FC', backgroundColor: colors.primarySoft },
  choiceText: { ...typography, color: colors.textMuted, fontSize: 10.5, fontWeight: '700' },
  choiceTextActive: { color: colors.primaryDark },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  button: { minHeight: 43, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  buttonDanger: { backgroundColor: colors.negative },
  buttonText: { ...typography, color: '#fff', fontSize: 11.5, fontWeight: '800' },
  buttonSecondaryText: { color: colors.text },
  empty: { ...typography, color: colors.textSoft, textAlign: 'center', paddingVertical: 25, fontSize: 11.5 },
  error: { ...typography, color: colors.negative, backgroundColor: colors.negativeSoft, borderRadius: 10, padding: 10, fontSize: 10.5, marginBottom: 10 },
  busy: { paddingVertical: 45, alignItems: 'center', gap: 10 },
  muted: { ...typography, color: colors.textMuted, fontSize: 10.5 },
  sheet: { flex: 1, backgroundColor: colors.background },
  sheetHeader: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle: { ...typography, flex: 1, color: colors.text, fontSize: 18, fontWeight: '800' },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { padding: 16, paddingBottom: 50, width: '100%', maxWidth: 700, alignSelf: 'center' },
}); }

function useUi() {
  const { colors } = useTheme();
  return useMemo(() => makeUi(colors), [colors]);
}
