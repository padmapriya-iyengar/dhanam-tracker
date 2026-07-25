import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LogOut,
  PiggyBank,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../AuthContext';
import { apiErrorMessage, Balance, CardBudgets, getDashboard, Report, SavingsAccount } from '../api';
import { colors, shadow, typography } from '../theme';
import { useTheme } from '../ThemeContext';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type DashboardData = {
  report: Report;
  budgets: CardBudgets;
  balances: Balance[];
  savings: SavingsAccount[];
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-AE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function SummaryCard({
  label,
  value,
  detail,
  tone,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'positive' | 'negative' | 'primary' | 'violet';
  icon: React.ReactNode;
}) {
  const { colors } = useTheme();
  const palette = {
    positive: { bg: colors.positiveSoft, text: colors.positive },
    negative: { bg: colors.negativeSoft, text: colors.negative },
    primary: { bg: colors.primarySoft, text: colors.primaryDark },
    violet: { bg: colors.violetSoft, text: colors.violet },
  }[tone];
  return (
    <View style={[styles.summaryCard, { backgroundColor: palette.bg }]}>
      <View style={styles.summaryTop}>
        <Text style={[styles.summaryLabel, { color: palette.text }]}>{label}</Text>
        {icon}
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.summaryValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.summaryDetail, { color: palette.text }]}>{detail}</Text>
    </View>
  );
}

export function DashboardScreen() {
  const { colors: theme } = useTheme();
  const { user, logout } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const currency = user?.currency || 'AED';

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      setData(await getDashboard(month, year));
    } catch (nextError) {
      setError(apiErrorMessage(nextError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  function shiftMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  }

  const totals = useMemo(() => {
    const summary = data?.report.summary || {};
    const budget = data?.budgets.totals || {};
    const current = data?.balances.reduce((sum, item) => sum + (item.currentBalance || 0), 0) || 0;
    const savings = data?.savings.reduce((sum, item) => sum + (item.balance || 0), 0) || 0;
    const income = summary.totalIncome || 0;
    const expense = summary.totalExpense || 0;
    return {
      income,
      expense,
      result: income - expense,
      current,
      savings,
      available: current + savings,
      cardLeft: budget.balance || 0,
      recovered: budget.recoveredAmount || 0,
      budgeted: budget.budgeted || 0,
      spent: budget.spent || 0,
    };
  }, [data]);

  const budgetPercent = totals.budgeted > 0 ? Math.round((totals.spent / totals.budgeted) * 100) : 0;
  const categories = data?.report.expenseByCategory || [];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <LinearGradient colors={[...theme.gradient]} locations={[0, .52, 1]} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.glow} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>MONTHLY OVERVIEW</Text>
            <Text style={[styles.greeting, { color: theme.text }]}>Hello, {user?.name?.split(' ')[0] || 'there'}</Text>
            <Text style={[styles.headerSub, { color: theme.textMuted }]}>Here is what your money is doing.</Text>
          </View>
          <Pressable accessibilityLabel="Log out" onPress={logout} style={({ pressed }) => [styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.border }, pressed && styles.pressed]}>
            <LogOut size={19} color={theme.textMuted} />
          </Pressable>
        </View>

        <View style={[styles.monthSelector, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Pressable accessibilityLabel="Previous month" onPress={() => shiftMonth(-1)} style={styles.monthButton}>
            <ChevronLeft size={21} color={colors.primary} />
          </Pressable>
          <View style={styles.monthCopy}>
            <Text style={[styles.monthText, { color: theme.text }]}>{monthNames[month - 1]}</Text>
            <Text style={[styles.yearText, { color: theme.textMuted }]}>{year}</Text>
          </View>
          <Pressable accessibilityLabel="Next month" onPress={() => shiftMonth(1)} style={styles.monthButton}>
            <ChevronRight size={21} color={colors.primary} />
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Dashboard unavailable</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => load()} style={styles.retryButton}>
              <RefreshCw size={15} color="#FFFFFF" /><Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingCard}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>Loading your finances…</Text></View>
        ) : data ? (
          <>
            <View style={styles.summaryGrid}>
              <SummaryCard
                label="MONTH RESULT"
                value={money(totals.result, currency)}
                detail="Income minus expenses"
                tone={totals.result >= 0 ? 'positive' : 'negative'}
                icon={totals.result >= 0 ? <TrendingUp size={17} color={colors.positive} /> : <TrendingDown size={17} color={colors.negative} />}
              />
              <SummaryCard label="AVAILABLE" value={money(totals.available, currency)} detail="Current + savings" tone="primary" icon={<Wallet size={17} color={colors.primary} />} />
              <SummaryCard label="CARD BUDGET LEFT" value={money(totals.cardLeft, currency)} detail={`${budgetPercent}% consumed`} tone="violet" icon={<CreditCard size={17} color={colors.violet} />} />
              <SummaryCard label="RECOVERED" value={money(totals.recovered, currency)} detail="Back into budgets" tone="positive" icon={<RefreshCw size={17} color={colors.positive} />} />
            </View>

            <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Cash flow</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>Recorded during {monthNames[month - 1]}</Text>
              <View style={styles.cashRow}>
                <View style={styles.cashItem}><Text style={styles.cashLabel}>Income</Text><Text style={[styles.cashValue, { color: colors.positive }]}>{money(totals.income, currency)}</Text></View>
                <View style={styles.cashDivider} />
                <View style={styles.cashItem}><Text style={styles.cashLabel}>Expenses</Text><Text style={[styles.cashValue, { color: colors.negative }]}>{money(totals.expense, currency)}</Text></View>
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.sectionHeadingRow}>
                <View><Text style={[styles.sectionTitle, { color: theme.text }]}>Account balances</Text><Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>Available at period end</Text></View>
                <Wallet size={19} color={colors.primary} />
              </View>
              {data.balances.length === 0 ? <Text style={styles.empty}>No active accounts.</Text> : data.balances.map((balance) => (
                <View key={balance.memberId} style={styles.listRow}>
                  <View style={[styles.dot, { backgroundColor: balance.memberColor || colors.primary }]} />
                  <Text style={[styles.listName, { color: theme.text }]}>{balance.memberName}</Text>
                  <Text style={[styles.listValue, { color: theme.text }, (balance.currentBalance || 0) < 0 && { color: theme.negative }]}>{money(balance.currentBalance || 0, currency)}</Text>
                </View>
              ))}
              {data.savings.length > 0 ? (
                <>
                  <View style={styles.subheading}><PiggyBank size={16} color={colors.violet} /><Text style={styles.subheadingText}>Savings</Text></View>
                  {data.savings.map((account) => (
                    <View key={account._id} style={styles.listRow}>
                      <View style={[styles.dot, { backgroundColor: account.color || colors.violet }]} />
                      <View style={styles.listCopy}><Text style={[styles.listName, { color: theme.text }]}>{account.name}</Text>{account.bankName ? <Text style={[styles.listMeta, { color: theme.textSoft }]}>{account.bankName}</Text> : null}</View>
                      <Text style={[styles.listValue, { color: theme.text }]}>{money(account.balance || 0, currency)}</Text>
                    </View>
                  ))}
                </>
              ) : null}
            </View>

            <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Top spending categories</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textMuted }]}>Where this month’s expenses went</Text>
              {categories.length === 0 ? <Text style={styles.empty}>No expenses recorded for this month.</Text> : categories.slice(0, 5).map((category, index) => {
                const top = categories[0]?.total || 1;
                const total = category.total || 0;
                return (
                  <View key={category._id || `${category.name}-${index}`} style={styles.category}>
                    <View style={styles.categoryTop}>
                      <View style={styles.categoryNameRow}><View style={[styles.dot, { backgroundColor: category.color || theme.primary }]} /><Text style={[styles.listName, { color: theme.text }]}>{category.name || 'Uncategorized'}</Text></View>
                      <Text style={[styles.listValue, { color: theme.text }]}>{money(total, currency)}</Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: theme.surfaceMuted }]}><View style={[styles.fill, { width: `${Math.max((total / top) * 100, 4)}%`, backgroundColor: category.color || theme.primary }]} /></View>
                  </View>
                );
              })}
            </View>

            <Text style={styles.footer}>Pull down anytime to refresh your dashboard.</Text>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  glow: { position: 'absolute', width: 270, height: 270, borderRadius: 135, top: -155, right: -85, backgroundColor: 'rgba(129,140,248,0.15)' },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  headerCopy: { flex: 1 },
  eyebrow: { ...typography, color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  greeting: { ...typography, color: colors.text, fontSize: 23, fontWeight: '800', letterSpacing: -0.55, marginTop: 2 },
  headerSub: { ...typography, color: colors.textMuted, fontSize: 10.5, marginTop: 2 },
  iconButton: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.72 },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(252,252,255,0.91)', padding: 7, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', marginBottom: 12, ...shadow },
  monthButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primarySoft },
  monthCopy: { alignItems: 'center' },
  monthText: { ...typography, color: colors.text, fontSize: 13, fontWeight: '800' },
  yearText: { ...typography, color: colors.textMuted, fontSize: 9.5, marginTop: 1 },
  errorCard: { backgroundColor: colors.negativeSoft, borderRadius: 16, padding: 16, marginBottom: 14 },
  errorTitle: { ...typography, color: colors.negative, fontWeight: '800', fontSize: 15 },
  errorText: { ...typography, color: colors.negative, fontSize: 12, lineHeight: 18, marginTop: 4 },
  retryButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 10, backgroundColor: colors.negative, paddingHorizontal: 13, paddingVertical: 9, marginTop: 12 },
  retryText: { ...typography, color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  loadingCard: { height: 180, alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 18, backgroundColor: colors.surface },
  loadingText: { ...typography, color: colors.textMuted, fontSize: 13 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: { width: '48%', flexGrow: 1, minWidth: 145, borderRadius: 15, padding: 12, minHeight: 108, borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)', ...shadow },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { ...typography, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  summaryValue: { ...typography, fontSize: 18, fontWeight: '900', letterSpacing: -0.45, marginTop: 12 },
  summaryDetail: { ...typography, fontSize: 8.5, opacity: 0.74, marginTop: 3 },
  section: { backgroundColor: 'rgba(252,252,255,0.93)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.92)', padding: 14, marginTop: 12, ...shadow },
  sectionHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...typography, color: colors.text, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  sectionSubtitle: { ...typography, color: colors.textMuted, fontSize: 9.5, marginTop: 2 },
  cashRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  cashItem: { flex: 1 },
  cashDivider: { width: 1, height: 45, marginHorizontal: 16, backgroundColor: colors.border },
  cashLabel: { ...typography, color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  cashValue: { ...typography, fontSize: 17, fontWeight: '900', marginTop: 4 },
  listRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F2F5' },
  dot: { width: 9, height: 9, borderRadius: 5, marginRight: 10 },
  listCopy: { flex: 1, paddingVertical: 8 },
  listName: { ...typography, flex: 1, color: '#344054', fontSize: 11.5, fontWeight: '700' },
  listMeta: { ...typography, color: colors.textSoft, fontSize: 10, marginTop: 2 },
  listValue: { ...typography, color: colors.text, fontSize: 11.5, fontWeight: '800', marginLeft: 9 },
  subheading: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 16, marginBottom: 2 },
  subheadingText: { ...typography, color: colors.violet, fontSize: 11, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  empty: { ...typography, color: colors.textSoft, textAlign: 'center', fontSize: 13, paddingVertical: 24 },
  category: { marginTop: 16 },
  categoryTop: { flexDirection: 'row', alignItems: 'center' },
  categoryNameRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  track: { height: 6, borderRadius: 4, backgroundColor: '#EEF0F4', overflow: 'hidden', marginTop: 8 },
  fill: { height: '100%', borderRadius: 4 },
  footer: { ...typography, color: colors.textSoft, textAlign: 'center', fontSize: 11, marginTop: 22 },
});
