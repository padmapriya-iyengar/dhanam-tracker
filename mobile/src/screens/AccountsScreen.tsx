import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../components/Typography';
import { apiErrorMessage, Entity, mobileApi } from '../api';
import { useAuth } from '../AuthContext';
import { useData } from '../DataContext';
import { Busy, Card, Choice, Empty, ErrorBox, money, Page, PageTitle } from '../components/MobileUI';
import { colors, typography } from '../theme';
import { useTheme } from '../ThemeContext';

export function AccountsScreen() {
  const { user } = useAuth();
  const { colors: theme } = useTheme();
  const { accounts } = useData();
  const [account, setAccount] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await mobileApi.list('/accounts/transactions', { account: account || undefined, limit: 100 }); setData(response.data); }
    catch (next) { setError(apiErrorMessage(next)); } finally { setLoading(false); }
  }, [account]);
  useEffect(() => { load(); }, [load]);
  return <Page onRefresh={load}>
    <PageTitle title="Accounts" subtitle="Unified current, savings and card ledger" />
    <Choice label="Account" value={account} options={[{ value: '', label: 'All accounts' }, ...accounts.map(x => ({ value: x.key, label: x.name, color: x.color }))]} onChange={setAccount} />
    <ErrorBox message={error} />
    {loading ? <Busy /> : !data?.records?.length ? <Empty text="No transactions found." /> : <>
      <View style={[styles.summary, { backgroundColor: theme.card }]}><View><Text style={[styles.sumLabel, { color: theme.textMuted }]}>Money in</Text><Text style={[styles.sumValue, { color: theme.positive }]}>{money(data.summary?.cash?.totalIn || 0, user?.currency)}</Text></View><View><Text style={[styles.sumLabel, { color: theme.textMuted }]}>Money out</Text><Text style={[styles.sumValue, { color: theme.negative }]}>{money(data.summary?.cash?.totalOut || 0, user?.currency)}</Text></View></View>
      {data.records.map((item: Entity) => <Card key={`${item.type}-${item.id}`}>
        <View style={styles.row}><View style={{ flex: 1 }}><Text style={[styles.name, { color: theme.text }]}>{item.title}</Text><Text style={[styles.meta, { color: theme.textMuted }]}>{item.account}</Text><Text style={[styles.date, { color: theme.textSoft }]}>{new Date(item.date).toLocaleDateString()}</Text></View><Text style={[styles.amount, { color: theme.text }, item.direction === 'in' ? { color: theme.positive } : item.direction === 'out' ? { color: theme.negative } : null]}>{item.direction === 'out' ? '−' : item.direction === 'in' ? '+' : ''}{money(item.amount, user?.currency)}</Text></View>
      </Card>)}
    </>}
  </Page>;
}
const styles = StyleSheet.create({
  summary: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  sumLabel: { ...typography, color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }, sumValue: { ...typography, fontSize: 18, fontWeight: '800', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, name: { ...typography, color: colors.text, fontSize: 13, fontWeight: '800' },
  meta: { ...typography, color: colors.textMuted, fontSize: 10, marginTop: 3 }, date: { ...typography, color: colors.textSoft, fontSize: 10, marginTop: 3 },
  amount: { ...typography, color: colors.text, fontSize: 13, fontWeight: '800' },
});
