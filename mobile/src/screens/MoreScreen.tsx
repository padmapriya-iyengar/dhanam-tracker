import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Bot, Building2, ChevronRight, CircleGauge, CreditCard, FileCheck2, Landmark, Lightbulb, LogOut, Scale, Tags, Target, UserCog, Users,
} from 'lucide-react-native';
import { useAuth } from '../AuthContext';
import { Choice, Page, PageTitle } from '../components/MobileUI';
import { colors, typography } from '../theme';
import { useTheme } from '../ThemeContext';

const items = [
  { route: 'Accounts', label: 'Account overview', icon: Landmark },
  { route: 'Savings', label: 'Savings accounts', icon: Building2 },
  { route: 'CreditCards', label: 'Credit cards', icon: CreditCard },
  { route: 'CardBudgets', label: 'Card budgets', icon: CircleGauge },
  { route: 'CardOperations', label: 'Card reconciliation', icon: FileCheck2 },
  { route: 'OpeningBalances', label: 'Opening balances', icon: Scale },
  { route: 'CategoryGoals', label: 'Category goals', icon: Target },
  { route: 'Categories', label: 'Categories', icon: Tags },
  { route: 'Members', label: 'Members', icon: Users },
  { route: 'Insights', label: 'AI insights', icon: Lightbulb },
  { route: 'Assistant', label: 'Dhanam assistant', icon: Bot },
  { route: 'Users', label: 'Users', icon: UserCog },
];

export function MoreScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const { colors: theme, mode, setMode } = useTheme();
  return <Page><PageTitle title="More" subtitle="Accounts, settings and intelligent tools" />
    <View style={[styles.profile, { backgroundColor: theme.card, borderColor: theme.border }]}><View style={[styles.avatar, { backgroundColor: user?.color || theme.primary }]}><Text style={styles.avatarText}>{user?.name?.[0]}</Text></View><View><Text style={[styles.name, { color: theme.text }]}>{user?.name}</Text><Text style={[styles.email, { color: theme.textMuted }]}>{user?.email}</Text></View></View>
    <View style={styles.themeCard}><Choice label="Appearance" value={mode} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} onChange={value => setMode(value as any)} /></View>
    <View style={[styles.menu, { backgroundColor: theme.card, borderColor: theme.border }]}>{items.filter(item => !(user?.isDemo && item.route === 'Users')).map(({ route, label, icon: Icon }) => <Pressable key={route} onPress={() => navigation.navigate(route)} style={[styles.item, { borderBottomColor: theme.divider }]}><View style={[styles.icon, { backgroundColor: theme.primarySoft }]}><Icon size={18} color={theme.primary} /></View><Text style={[styles.itemText, { color: theme.text }]}>{label}</Text><ChevronRight size={17} color={theme.textSoft} /></Pressable>)}</View>
    <Pressable onPress={logout} style={styles.logout}><LogOut size={17} color={colors.negative} /><Text style={styles.logoutText}>Sign out</Text></Pressable>
  </Page>;
}
const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 17, padding: 15, marginBottom: 13 },
  themeCard: { marginBottom: 2 },
  avatar: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, avatarText: { ...typography, color: '#fff', fontSize: 18, fontWeight: '800' },
  name: { ...typography, color: colors.text, fontSize: 13, fontWeight: '800' }, email: { ...typography, color: colors.textMuted, fontSize: 9.5, marginTop: 2 },
  menu: { backgroundColor: '#fff', borderRadius: 17, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  item: { minHeight: 57, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#F1F3F6' },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  itemText: { ...typography, flex: 1, color: colors.text, fontSize: 11.5, fontWeight: '700' },
  logout: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 13, backgroundColor: colors.negativeSoft, marginTop: 14 },
  logoutText: { ...typography, color: colors.negative, fontSize: 13, fontWeight: '800' },
});
