import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, PanResponder, Pressable, RefreshControl, ScrollView, View,
} from 'react-native';
import { Text } from '../components/Typography';
import * as Haptics from 'expo-haptics';
import {
  AlertTriangle, ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Bell,
  CalendarClock, ChevronDown, ChevronLeft, ChevronRight, CreditCard, Eye, EyeOff,
  Landmark, ListFilter, PiggyBank, Plus, ReceiptText, Settings2, Target, TrendingUp, WalletCards,
} from 'lucide-react-native';
import { api, errorMessage } from '../api';
import { Button, Card, Screen, StateView } from '../components/ui';
import { readCache, writeCache } from '../storage';
import { useAuth } from '../state/AuthContext';
import { useNetwork } from '../state/NetworkContext';
import { usePreferences } from '../state/PreferencesContext';
import { radius, spacing, useAppTheme } from '../theme';
import { HomeAccount, HomeActivity, HomeAttention, HomeData, Member } from '../types';

const sectionLabels: Record<string, string> = {
  spendPulse: 'Spend pulse', accounts: 'Accounts', attention: 'Needs attention', activity: 'Recent activity',
};

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date);
}
function relativeTime(value: string) {
  const seconds = Math.max(Math.round((Date.now() - new Date(value).getTime()) / 1000), 0);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return new Date(value).toLocaleDateString();
}

function Section({ id, title, subtitle, children, collapsed, toggle }: {
  id: string; title: string; subtitle?: string; children: React.ReactNode; collapsed: boolean; toggle: (id: string) => void;
}) {
  const { colors } = useAppTheme();
  return <View style={{ gap: 10 }}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: !collapsed }} onPress={() => toggle(id)} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>{title}</Text>{!!subtitle && <Text style={{ color: colors.textMuted }}>{subtitle}</Text>}</View>
      <ChevronDown size={20} color={colors.textMuted} style={{ transform: [{ rotate: collapsed ? '-90deg' : '0deg' }] }} />
    </Pressable>
    {!collapsed && children}
  </View>;
}

function Metric({ label, amount, hint, tone, privacy, onPress }: {
  label: string; amount: string; hint: string; tone: string; privacy: boolean; onPress: () => void;
}) {
  const { colors } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${privacy ? 'hidden' : amount}. ${hint}`} onPress={onPress} style={{ flex: 1, minWidth: 145, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.lg, padding: 15, gap: 7 }}>
    <Text style={{ color: colors.textMuted, fontWeight: '700' }}>{label}</Text>
    <Text style={{ color: tone, fontSize: 22, fontWeight: '900' }}>{privacy ? '••••••' : amount}</Text>
    <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17 }}>{hint}</Text>
  </Pressable>;
}

function Progress({ value, color }: { value: number; color: string }) {
  const { colors } = useAppTheme();
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.min(value, 100) }} style={{ height: 8, backgroundColor: colors.border, borderRadius: 8, overflow: 'hidden' }}>
    <View style={{ width: `${Math.min(Math.max(value, 0), 100)}%`, height: '100%', backgroundColor: color, borderRadius: 8 }} />
  </View>;
}

export function HomeScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const { online } = useNetwork();
  const prefs = usePreferences();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [data, setData] = useState<HomeData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const cacheKey = `home.${selectedMonth.getFullYear()}-${selectedMonth.getMonth() + 1}.${prefs.homeMemberId || 'household'}`;
  const money = useCallback((amount: number) => new Intl.NumberFormat(user?.locale || 'en-AE', { style: 'currency', currency: user?.currency || 'AED', maximumFractionDigits: 0 }).format(amount || 0), [user?.currency, user?.locale]);
  const visibleAttention = useMemo(() => (data?.attention || []).filter((item) => {
    if (prefs.dismissedAttentionIds.includes(item.id)) return false;
    return (prefs.snoozedAttention[item.id] || 0) < Date.now();
  }), [data?.attention, prefs.dismissedAttentionIds, prefs.snoozedAttention]);

  const load = useCallback(async (pull = false) => {
    pull ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const { data: response } = await api.home(selectedMonth.getMonth() + 1, selectedMonth.getFullYear(), prefs.homeMemberId);
      setData(response);
      await writeCache(cacheKey, response);
    } catch (cause) {
      const cached = await readCache<HomeData>(cacheKey);
      if (cached) setData(cached);
      else setError(errorMessage(cause));
    } finally { setLoading(false); setRefreshing(false); }
  }, [cacheKey, prefs.homeMemberId, selectedMonth]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.members().then(({ data: result }) => setMembers(result)).catch(() => {}); }, []);

  const shiftMonth = useCallback((delta: number) => {
    setSelectedMonth((date) => new Date(date.getFullYear(), date.getMonth() + delta, 1));
    Haptics.selectionAsync();
  }, []);
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 35 && Math.abs(gesture.dy) < 25,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < -55) shiftMonth(1);
      if (gesture.dx > 55) shiftMonth(-1);
    },
  })).current;
  const isCurrent = selectedMonth.getMonth() === new Date().getMonth() && selectedMonth.getFullYear() === new Date().getFullYear();

  function toggleSection(id: string) {
    const exists = prefs.collapsedHomeSections.includes(id);
    prefs.updatePreferences({ collapsedHomeSections: exists ? prefs.collapsedHomeSections.filter((item) => item !== id) : [...prefs.collapsedHomeSections, id] });
  }
  function dismiss(item: HomeAttention) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    prefs.updatePreferences({ dismissedAttentionIds: [...new Set([...prefs.dismissedAttentionIds, item.id])] });
  }
  function snooze(item: HomeAttention) {
    prefs.updatePreferences({ snoozedAttention: { ...prefs.snoozedAttention, [item.id]: Date.now() + 86400000 } });
  }
  function attentionAction(item: HomeAttention) {
    if (item.type === 'card_due' || item.type === 'card_budget') navigation.navigate('AccountDetail', { account: item.target });
    else if (item.type === 'recurring') navigation.navigate('PlanDetail', { focus: 'recurring', id: item.target });
    else if (item.type === 'category_goal') navigation.navigate('PlanDetail', { focus: 'goals', id: item.target });
    else navigation.navigate('Activity', { filter: 'expense', id: item.target });
  }

  if (loading && !data) return <Screen scroll={false}><StateView kind="loading" title="Preparing your month…" message="Calculating net spending, balances, and what needs attention." /></Screen>;
  if (error && !data) return <Screen scroll={false}><StateView kind={online ? 'error' : 'offline'} message={error} onAction={() => load()} /></Screen>;

  const summary = data?.summary;
  const pulse = data?.spendPulse;
  const accountSummary = data?.accounts;
  const scopeName = prefs.homeMemberId ? members.find((member) => member._id === prefs.homeMemberId)?.name || 'Member' : 'Household';

  const renderSection = (id: string) => {
    if (prefs.hiddenHomeSections.includes(id)) return null;
    const collapsed = prefs.collapsedHomeSections.includes(id);
    if (id === 'spendPulse' && pulse) return <Section key={id} id={id} title="Spend pulse" subtitle="Actual pace, goals, and room to spend" collapsed={collapsed} toggle={toggleSection}>
      <Card>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <View style={{ flex: 1 }}><Text style={{ color: colors.textMuted }}>Spent so far</Text><Text style={{ color: colors.text, fontSize: 22, fontWeight: '900' }}>{prefs.privacyMode ? '••••••' : money(pulse.actual)}</Text></View>
          <View style={{ flex: 1 }}><Text style={{ color: colors.textMuted }}>Projected pace</Text><Text style={{ color: pulse.expectedPace > (summary?.totalIncome || 0) ? colors.danger : colors.text, fontSize: 22, fontWeight: '900' }}>{prefs.privacyMode ? '••••••' : money(pulse.expectedPace)}</Text></View>
        </View>
        <View style={{ borderRadius: radius.md, backgroundColor: colors.primarySoft, padding: 14, gap: 5 }}>
          <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Safe to spend</Text>
          <Text style={{ color: colors.primary, fontSize: 28, fontWeight: '900' }}>{prefs.privacyMode ? '••••••' : money(pulse.safeToSpend)}</Text>
          <Text style={{ color: colors.textMuted, lineHeight: 19 }}>After recorded spending, recurring commitments, and category goals.</Text>
        </View>
      </Card>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>Top categories</Text>
        {pulse.categories.length === 0 && <Text style={{ color: colors.textMuted }}>No expense categories in this month.</Text>}
        {pulse.categories.map((category) => {
          const goalPercent = category.goalPercent || 0;
          const statusColor = goalPercent >= 100 ? colors.danger : goalPercent >= 80 ? colors.warning : category.color || colors.primary;
          return <Pressable key={category.categoryId} accessibilityRole="button" onPress={() => navigation.navigate('Activity', { filter: 'expense', categoryId: category.categoryId, title: category.name })} style={{ gap: 7, paddingVertical: 5 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ width: 10, height: 10, marginTop: 5, borderRadius: 5, backgroundColor: category.color }} /><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '800' }}>{category.name}</Text><Text style={{ color: colors.textMuted }}>{category.count} transaction{category.count === 1 ? '' : 's'}</Text></View><Text style={{ color: colors.text, fontWeight: '800' }}>{prefs.privacyMode ? '••••' : money(category.total)}</Text></View>
            {category.goal && <><Progress value={goalPercent} color={statusColor} /><Text style={{ color: statusColor, fontSize: 12, fontWeight: '700' }}>{goalPercent}% of {prefs.privacyMode ? '••••' : money(category.goal)}</Text></>}
          </Pressable>;
        })}
        <Button label="View budgets and goals" variant="secondary" onPress={() => navigation.navigate('PlanDetail', { focus: 'goals' })} icon={<Target size={17} color={colors.text} />} />
      </Card>
    </Section>;
    if (id === 'accounts' && accountSummary) return <Section key={id} id={id} title="Accounts" subtitle="Cash, savings, and card liability" collapsed={collapsed} toggle={toggleSection}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Metric label="Combined cash" amount={money(accountSummary.combinedCash)} hint="Current accounts" tone={colors.primary} privacy={prefs.privacyMode} onPress={() => navigation.navigate('Accounts')} />
        <Metric label="Savings & investments" amount={money(accountSummary.savingsInvestments)} hint="All savings assets" tone={colors.success} privacy={prefs.privacyMode} onPress={() => navigation.navigate('Accounts')} />
        <Metric label="Card outstanding" amount={money(accountSummary.cardOutstanding)} hint="Recorded purchases less payments" tone={colors.danger} privacy={prefs.privacyMode} onPress={() => navigation.navigate('Accounts')} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={224} contentContainerStyle={{ gap: 10, paddingHorizontal: 2, paddingVertical: 2 }}>
        {accountSummary.accounts.map((account: HomeAccount) => {
          const tone = account.type === 'credit_card' ? colors.danger : account.type === 'savings' ? colors.success : colors.primary;
          return <Pressable key={account.key} accessibilityRole="button" onPress={() => navigation.navigate('AccountDetail', { account: account.key, title: account.name })} style={{ width: 214, minHeight: 128, borderRadius: radius.lg, padding: 14, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: tone, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text numberOfLines={1} style={{ color: colors.text, fontWeight: '900', fontSize: 16, flex: 1 }}>{account.name}</Text>{account.type === 'credit_card' ? <CreditCard size={21} color={tone} /> : <Landmark size={21} color={tone} />}</View>
            <View><Text style={{ color: colors.textMuted }}>{account.type === 'credit_card' ? 'Outstanding' : 'Balance'}</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={{ color: tone, fontWeight: '900', fontSize: 22 }}>{prefs.privacyMode ? '••••••' : money(account.balance)}</Text></View>
            <Text numberOfLines={1} style={{ color: colors.textMuted }}>{account.recentMovement >= 0 ? '+' : ''}{prefs.privacyMode ? '••••' : money(account.recentMovement)} this month</Text>
          </Pressable>;
        })}
      </ScrollView>
    </Section>;
    if (id === 'attention') return <Section key={id} id={id} title="Needs attention" subtitle={`${visibleAttention.length} actionable item${visibleAttention.length === 1 ? '' : 's'}`} collapsed={collapsed} toggle={toggleSection}>
      {visibleAttention.length === 0 ? <Card><Text style={{ color: colors.success, fontWeight: '900' }}>You’re all caught up</Text><Text style={{ color: colors.textMuted }}>No due items or budget warnings need action.</Text></Card> : visibleAttention.map((item) => <AttentionCard key={item.id} item={item} onAction={() => attentionAction(item)} onDismiss={() => dismiss(item)} onSnooze={() => snooze(item)} />)}
    </Section>;
    if (id === 'activity') return <Section key={id} id={id} title="Recent activity" subtitle="Latest changes across your finances" collapsed={collapsed} toggle={toggleSection}>
      <Card>
        {(data?.recentActivity || []).length === 0 && <Text style={{ color: colors.textMuted }}>No recent transactions.</Text>}
        {(data?.recentActivity || []).map((item) => <ActivityRow key={`${item.type}:${item.id}`} item={item} privacy={prefs.privacyMode} money={money} onPress={() => navigation.navigate('ActivityDetail', { item })} onEdit={() => navigation.navigate('ActivityDetail', { item, editMode: true })} />)}
        <Button label="View all activity" variant="secondary" onPress={() => navigation.navigate('Activity', { filter: 'all' })} icon={<ListFilter size={17} color={colors.text} />} />
      </Card>
    </Section>;
    return null;
  };

  return <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} colors={[colors.primary]} />}>
    <View {...pan.panHandlers} style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => navigation.navigate('Profile')} style={{ width: 48, height: 48, borderRadius: 17, backgroundColor: user?.color || colors.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>{user?.name?.[0]}</Text></Pressable>
        <View style={{ flex: 1 }}><Text style={{ color: colors.textMuted }}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}</Text><Text style={{ color: colors.text, fontSize: 21, fontWeight: '900' }}>{user?.name?.split(' ')[0]}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={prefs.privacyMode ? 'Show monetary values' : 'Hide monetary values'} onPress={() => prefs.updatePreferences({ privacyMode: !prefs.privacyMode })} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>{prefs.privacyMode ? <Eye size={22} color={colors.text} /> : <EyeOff size={22} color={colors.text} />}</Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${visibleAttention.length} notifications`} onPress={() => navigation.navigate('Attention', { items: visibleAttention })} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Bell size={22} color={colors.text} />{visibleAttention.length > 0 && <View style={{ position: 'absolute', right: 4, top: 4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{visibleAttention.length}</Text></View>}</Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Add transaction" onPress={() => navigation.navigate('Add')} style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Plus size={23} color={colors.background} /></Pressable>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => shiftMonth(-1)} style={{ padding: 10 }}><ChevronLeft color={colors.text} /></Pressable>
        <View style={{ alignItems: 'center' }}><Text style={{ color: colors.text, fontSize: 19, fontWeight: '900' }}>{monthLabel(selectedMonth)}</Text><Text style={{ color: colors.textMuted, fontSize: 12 }}>Swipe to change month</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => shiftMonth(1)} style={{ padding: 10 }}><ChevronRight color={colors.text} /></Pressable>
      </View>
      {!isCurrent && <Button label="Back to this month" variant="secondary" onPress={() => setSelectedMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} icon={<CalendarClock size={17} color={colors.text} />} />}
    </View>
    {!online && <Card><Text accessibilityRole="alert" style={{ color: colors.warning, fontWeight: '900' }}>Offline snapshot</Text><Text style={{ color: colors.textMuted }}>Showing the last Home data saved on this device.</Text></Card>}
    {user?.isDemo && <Card><Text style={{ color: colors.warning, fontWeight: '900' }}>Demo workspace</Text><Text style={{ color: colors.textMuted }}>Shared sample data only—do not enter private financial information.</Text></Card>}
    {summary && <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}><View><Text style={{ color: colors.text, fontSize: 20, fontWeight: '900' }}>Monthly snapshot</Text><Text style={{ color: colors.textMuted }}>{scopeName} · Updated {relativeTime(data?.generatedAt || '')}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Customize Home" onPress={() => navigation.navigate('HomeSettings', { members })} style={{ padding: 9 }}><Settings2 size={21} color={colors.primary} /></Pressable></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Metric label="Income" amount={money(summary.totalIncome)} hint={`${summary.previous.income ? `${Math.round(((summary.totalIncome - summary.previous.income) / summary.previous.income) * 100)}% vs last month` : 'No prior comparison'}`} tone={colors.success} privacy={prefs.privacyMode} onPress={() => navigation.navigate('Activity', { filter: 'income' })} />
        <Metric label="Net expenses" amount={money(summary.netExpense)} hint="After recoveries" tone={colors.danger} privacy={prefs.privacyMode} onPress={() => navigation.navigate('Activity', { filter: 'expense' })} />
        <Metric label="Net savings" amount={money(summary.netSavings)} hint={`${summary.savingsRate}% savings rate${summary.savingsChange === null ? '' : ` · ${summary.savingsChange >= 0 ? '+' : ''}${summary.savingsChange}%`}`} tone={summary.netSavings >= 0 ? colors.primary : colors.danger} privacy={prefs.privacyMode} onPress={() => navigation.navigate('Activity', { filter: 'all' })} />
      </View>
      <Card><View style={{ flexDirection: 'row', gap: 12 }}><ArrowLeftRight size={21} color={colors.primary} /><Text style={{ color: colors.textMuted, lineHeight: 20, flex: 1 }}>Credit-card purchases count as expenses when made. Card payments are transfers, so they are not counted again.</Text></View></Card>
    </View>}
    {prefs.homeSections.map(renderSection)}
  </Screen>;
}

function AttentionCard({ item, onAction, onDismiss, onSnooze }: { item: HomeAttention; onAction: () => void; onDismiss: () => void; onSnooze: () => void }) {
  const { colors } = useAppTheme();
  const tone = item.severity === 'urgent' ? colors.danger : item.severity === 'warning' ? colors.warning : colors.primary;
  return <Card>
    <View style={{ flexDirection: 'row', gap: 12 }}><AlertTriangle size={22} color={tone} /><View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.text, fontWeight: '900' }}>{item.title}</Text><Text style={{ color: colors.textMuted }}>{item.message}</Text></View></View>
    <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button label={item.action[0]?.toUpperCase() + item.action.slice(1)} onPress={onAction} /></View><View style={{ flex: 1 }}><Button label="Snooze" variant="secondary" onPress={onSnooze} /></View></View>
    <Pressable accessibilityRole="button" onPress={onDismiss} style={{ alignSelf: 'center', padding: 8 }}><Text style={{ color: colors.textMuted, fontWeight: '700' }}>Dismiss</Text></Pressable>
  </Card>;
}

function ActivityRow({ item, privacy, money, onPress, onEdit }: { item: HomeActivity; privacy: boolean; money: (amount: number) => string; onPress: () => void; onEdit: () => void }) {
  const { colors } = useAppTheme();
  const Icon = item.type === 'expense' ? ReceiptText : item.type === 'income' ? TrendingUp : item.type === 'transfer' ? ArrowLeftRight : ArrowDownLeft;
  const signed = item.type === 'transfer' ? money(item.transferAmount || 0) : `${item.amount > 0 ? '+' : ''}${money(item.amount)}`;
  const translateX = useRef(new Animated.Value(0)).current;
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => item.editable && gesture.dx < -12 && Math.abs(gesture.dy) < 16,
    onPanResponderMove: (_, gesture) => translateX.setValue(Math.max(gesture.dx, -86)),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < -55) {
        Animated.spring(translateX, { toValue: -76, useNativeDriver: true }).start();
        Haptics.selectionAsync();
      } else Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;
  return <View style={{ minHeight: 64, overflow: 'hidden' }}>
    {item.editable && <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${item.title}`} onPress={onEdit} style={{ position: 'absolute', right: 0, top: 4, bottom: 4, width: 72, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.background, fontWeight: '900' }}>Edit</Text></Pressable>}
    <Animated.View {...swipe.panHandlers} style={{ transform: [{ translateX }], backgroundColor: colors.surface }}>
      <Pressable accessibilityRole="button" accessibilityHint={item.editable ? 'Swipe left to edit' : undefined} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: item.type === 'expense' ? colors.dangerSoft : colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Icon size={19} color={item.type === 'expense' ? colors.danger : colors.primary} /></View>
        <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color: colors.text, fontWeight: '800' }}>{item.title}</Text><Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12 }}>{item.account} · {new Date(item.date).toLocaleDateString()}</Text></View>
        <Text style={{ color: item.type === 'expense' ? colors.danger : item.type === 'income' || item.type === 'recovery' ? colors.success : colors.text, fontWeight: '900' }}>{privacy ? '••••' : signed}</Text><ArrowRight size={15} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  </View>;
}
