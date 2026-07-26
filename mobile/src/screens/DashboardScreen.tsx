import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, CircleDollarSign, CreditCard, LogOut, ReceiptText, RefreshCw } from 'lucide-react-native';
import { apiErrorMessage, getDashboard } from '../api';
import { useAuth } from '../AuthContext';
import { Text } from '../components/Typography';
import { colors, shadow, typography } from '../theme';
import { useTheme } from '../ThemeContext';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function money(value: number, currency: string) {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-AE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function DashboardScreen() {
  const { colors: theme } = useTheme();
  const { user, logout } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const currency = user?.currency || 'AED';

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      setData(await getDashboard(month, year));
    } catch (next) {
      setError(apiErrorMessage(next));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  function shiftMonth(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  }

  const expense = data?.report?.summary?.totalExpense || 0;
  const income = data?.report?.summary?.totalIncome || 0;
  const cardSpend = data?.budgets?.totals?.spent || 0;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <LinearGradient colors={[...theme.gradient]} locations={[0, .52, 1]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Dashboard</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>Monthly spending overview</Text>
          </View>
          <Pressable accessibilityLabel="Log out" onPress={logout} style={[styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <LogOut size={19} color={theme.textMuted} />
          </Pressable>
        </View>

        <View style={[styles.monthSelector, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Pressable accessibilityLabel="Previous month" onPress={() => shiftMonth(-1)} style={[styles.monthButton, { backgroundColor: theme.primarySoft }]}>
            <ChevronLeft size={22} color={theme.primary} />
          </Pressable>
          <View style={styles.monthCopy}>
            <Text style={[styles.month, { color: theme.text }]}>{monthNames[month - 1]}</Text>
            <Text style={[styles.year, { color: theme.textMuted }]}>{year}</Text>
          </View>
          <Pressable accessibilityLabel="Next month" onPress={() => shiftMonth(1)} style={[styles.monthButton, { backgroundColor: theme.primarySoft }]}>
            <ChevronRight size={22} color={theme.primary} />
          </Pressable>
        </View>

        {error ? (
          <View style={[styles.message, { backgroundColor: theme.negativeSoft }]}>
            <Text style={[styles.messageTitle, { color: theme.negative }]}>Dashboard unavailable</Text>
            <Text style={[styles.messageText, { color: theme.negative }]}>{error}</Text>
            <Pressable onPress={() => load()} style={[styles.retry, { backgroundColor: theme.negative }]}>
              <RefreshCw size={15} color="#fff" /><Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={[styles.loading, { backgroundColor: theme.card }]}><ActivityIndicator color={theme.primary} /></View>
        ) : (
          <View style={styles.cards}>
            <View style={[styles.metric, { backgroundColor: theme.positiveSoft, borderColor: theme.border }]}>
              <View style={[styles.metricIcon, { backgroundColor: theme.surface }]}><CircleDollarSign size={22} color={theme.positive} /></View>
              <Text style={[styles.metricLabel, { color: theme.positive }]}>TOTAL INCOME</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, { color: theme.positive }]}>{money(income, currency)}</Text>
              <Text style={[styles.metricDetail, { color: theme.textMuted }]}>Received during {monthNames[month - 1]} {year}</Text>
            </View>

            <View style={[styles.metric, { backgroundColor: theme.negativeSoft, borderColor: theme.border }]}>
              <View style={[styles.metricIcon, { backgroundColor: theme.surface }]}><ReceiptText size={22} color={theme.negative} /></View>
              <Text style={[styles.metricLabel, { color: theme.negative }]}>TOTAL EXPENSES</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, { color: theme.negative }]}>{money(expense, currency)}</Text>
              <Text style={[styles.metricDetail, { color: theme.textMuted }]}>Recorded during {monthNames[month - 1]} {year}</Text>
            </View>

            <View style={[styles.metric, { backgroundColor: theme.violetSoft, borderColor: theme.border }]}>
              <View style={[styles.metricIcon, { backgroundColor: theme.surface }]}><CreditCard size={22} color={theme.violet} /></View>
              <Text style={[styles.metricLabel, { color: theme.violet }]}>CREDIT CARD SPENDING</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, { color: theme.violet }]}>{money(cardSpend, currency)}</Text>
              <Text style={[styles.metricDetail, { color: theme.textMuted }]}>Overall net card spend for this month</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { ...typography, fontSize: 25, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { ...typography, fontSize: 11, marginTop: 3 },
  iconButton: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, borderWidth: 1, padding: 8, ...shadow },
  monthButton: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  monthCopy: { alignItems: 'center' },
  month: { ...typography, fontSize: 15, fontWeight: '800' },
  year: { ...typography, fontSize: 10, marginTop: 1 },
  cards: { gap: 14, marginTop: 18 },
  metric: { minHeight: 190, borderRadius: 20, borderWidth: 1, padding: 20, ...shadow },
  metricIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  metricLabel: { ...typography, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  metricValue: { ...typography, fontSize: 31, fontWeight: '800', letterSpacing: -0.8, marginTop: 7 },
  metricDetail: { ...typography, fontSize: 11, marginTop: 8 },
  loading: { height: 220, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  message: { borderRadius: 18, padding: 18, marginTop: 18 },
  messageTitle: { ...typography, fontSize: 15, fontWeight: '800' },
  messageText: { ...typography, fontSize: 11, lineHeight: 17, marginTop: 5 },
  retry: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 9, marginTop: 13 },
  retryText: { ...typography, color: '#fff', fontSize: 11, fontWeight: '800' },
});
