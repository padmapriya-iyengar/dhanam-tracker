import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/Typography';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { apiErrorMessage, mobileApi, Report } from '../api';
import { useAuth } from '../AuthContext';
import { Busy, Card, Empty, ErrorBox, money, Page, PageTitle } from '../components/MobileUI';
import { colors, typography } from '../theme';
import { useTheme } from '../ThemeContext';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function ReportsScreen() {
  const { user } = useAuth();
  const { colors: theme } = useTheme();
  const now = new Date(); const [month, setMonth] = useState(now.getMonth() + 1); const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState<Report | null>(null); const [trend, setTrend] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { const [r, t] = await Promise.all([mobileApi.reports({ period: 'monthly', month, year }), mobileApi.trend({ months: 12 })]); setReport(r.data); setTrend(t.data); } catch (next) { setError(apiErrorMessage(next)); } finally { setLoading(false); } }, [month, year]);
  useEffect(() => { load(); }, [load]);
  function shift(delta: number) { const date = new Date(year, month - 1 + delta, 1); setMonth(date.getMonth() + 1); setYear(date.getFullYear()); }
  const maxTrend = useMemo(() => Math.max(...trend.flatMap(x => [x.income || 0, x.expenses || 0]), 1), [trend]);
  const summary = report?.summary || {}; const result = (summary.totalIncome || 0) - (summary.totalExpense || 0);
  return <Page onRefresh={load}><PageTitle title="Reports" subtitle="Monthly performance and 12-month trend" />
    <View style={[styles.period, { backgroundColor: theme.card }]}><Pressable onPress={() => shift(-1)}><ChevronLeft color={theme.primary} /></Pressable><Text style={[styles.periodText, { color: theme.text }]}>{months[month - 1]} {year}</Text><Pressable onPress={() => shift(1)}><ChevronRight color={theme.primary} /></Pressable></View>
    <ErrorBox message={error} />{loading ? <Busy /> : <>
      <View style={styles.grid}><Card><Text style={styles.label}>INCOME</Text><Text style={[styles.value, { color: colors.positive }]}>{money(summary.totalIncome || 0, user?.currency)}</Text></Card><Card><Text style={styles.label}>EXPENSES</Text><Text style={[styles.value, { color: colors.negative }]}>{money(summary.totalExpense || 0, user?.currency)}</Text></Card><Card><Text style={styles.label}>NET RESULT</Text><Text style={[styles.value, { color: result >= 0 ? colors.positive : colors.negative }]}>{money(result, user?.currency)}</Text></Card></View>
      <Card><Text style={[styles.heading, { color: theme.text }]}>Expense breakdown</Text>{!report?.expenseByCategory?.length ? <Empty text="No expense data." /> : report.expenseByCategory.map((x, i) => <View key={x._id || i} style={styles.category}><View style={[styles.dot, { backgroundColor: x.color || theme.primary }]} /><Text style={[styles.catName, { color: theme.textMuted }]}>{x.name}</Text><Text style={[styles.catValue, { color: theme.text }]}>{money(x.total || 0, user?.currency)}</Text></View>)}</Card>
      <Card><Text style={[styles.heading, { color: theme.text }]}>12-month trend</Text>{trend.map((x, i) => <View key={i} style={styles.trend}><Text style={[styles.trendLabel, { color: theme.textMuted }]}>{x.label}</Text><View style={styles.bars}><View style={[styles.bar, { width: `${(x.income / maxTrend) * 100}%`, backgroundColor: theme.positive }]} /><View style={[styles.bar, { width: `${(x.expenses / maxTrend) * 100}%`, backgroundColor: theme.negative }]} /></View></View>)}</Card>
    </>}</Page>;
}
const styles = StyleSheet.create({
  period: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 13, marginBottom: 13 },
  periodText: { ...typography, color: colors.text, fontSize: 12.5, fontWeight: '800' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  label: { ...typography, color: colors.textMuted, fontSize: 9, fontWeight: '800' }, value: { ...typography, fontSize: 17, fontWeight: '800', marginTop: 7 },
  heading: { ...typography, color: colors.text, fontSize: 13.5, fontWeight: '800', marginBottom: 9 }, category: { flexDirection: 'row', minHeight: 37, alignItems: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, marginRight: 9 }, catName: { ...typography, flex: 1, color: colors.textMuted, fontSize: 12, fontWeight: '700' }, catValue: { ...typography, color: colors.text, fontSize: 12, fontWeight: '800' },
  trend: { flexDirection: 'row', alignItems: 'center', marginTop: 8 }, trendLabel: { ...typography, width: 64, color: colors.textMuted, fontSize: 9 }, bars: { flex: 1, gap: 3 }, bar: { height: 5, borderRadius: 3 },
});
