import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Text } from '../components/Typography';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Bell, Landmark, ReceiptText } from 'lucide-react-native';
import { api, errorMessage } from '../api';
import { Button, Card, Screen, StateView, Title } from '../components/ui';
import { useAuth } from '../state/AuthContext';
import { usePreferences } from '../state/PreferencesContext';
import { useAppTheme } from '../theme';
import { HomeActivity, HomeAttention } from '../types';

type LedgerRecord = { id: string; type: string; title: string; description: string; account: string; date: string; signedAmount: number; amount: number; category?: string };

export function ActivityScreen({ route, navigation }: any) {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const prefs = usePreferences();
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const filter = route.params?.filter || 'all';

  function load() {
    setLoading(true); setError('');
    api.accountTransactions({ limit: 100 }).then(({ data }) => {
      let result: LedgerRecord[] = data.records;
      if (filter !== 'all') result = result.filter((item) => item.type === filter);
      if (route.params?.categoryId) result = result.filter((item) => String(item.category || '').startsWith(route.params.title || ''));
      setRecords(result);
    }).catch((cause) => setError(errorMessage(cause))).finally(() => setLoading(false));
  }
  useEffect(load, [filter, route.params?.categoryId]);
  const money = (amount: number) => new Intl.NumberFormat(user?.locale || 'en-AE', { style: 'currency', currency: user?.currency || 'AED', maximumFractionDigits: 0 }).format(amount || 0);
  if (loading) return <Screen scroll={false}><StateView kind="loading" title="Loading activity…" /></Screen>;
  if (error) return <Screen scroll={false}><StateView kind="error" message={error} onAction={load} /></Screen>;
  return <Screen>
    <Title subtitle={`${records.length} matching transaction${records.length === 1 ? '' : 's'}`}>{route.params?.title || (filter === 'all' ? 'All activity' : `${filter[0].toUpperCase()}${filter.slice(1)}`)}</Title>
    {records.length === 0 && <StateView kind="empty" message="No transactions match this Home selection." />}
    {records.map((item) => <Card key={`${item.type}:${item.id}`}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '900' }}>{item.description || item.title}</Text><Text style={{ color: colors.textMuted }}>{item.account} · {new Date(item.date).toLocaleDateString()}</Text></View><Text style={{ color: item.signedAmount < 0 ? colors.danger : colors.success, fontWeight: '900' }}>{prefs.privacyMode ? '••••' : money(item.type === 'transfer' ? item.amount : item.signedAmount)}</Text></View></Card>)}
  </Screen>;
}

export function ActivityDetailScreen({ route, navigation }: any) {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const prefs = usePreferences();
  const item: HomeActivity = route.params.item;
  const [record, setRecord] = useState<any>(null); const [detailError, setDetailError] = useState('');
  useEffect(() => { if (item.type !== 'recovery') api.transactionDetail(item.type, item.id).then(({ data }) => setRecord(data)).catch((e) => setDetailError(errorMessage(e))); }, [item.id, item.type]);
  const money = (amount: number) => new Intl.NumberFormat(user?.locale || 'en-AE', { style: 'currency', currency: user?.currency || 'AED' }).format(amount || 0);
  async function remove() { try { if (item.type === 'expense') await api.deleteExpense(item.id); else if (item.type === 'income') await api.deleteIncome(item.id); else await api.deleteTransfer(item.id); navigation.popToTop(); } catch (e) { Alert.alert('Could not delete transaction', errorMessage(e)); } }
  function edit() { if (!record) return; navigation.navigate(item.type === 'expense' ? 'ExpenseForm' : item.type === 'income' ? 'IncomeForm' : 'TransferForm', { preset: record, recordId: item.id }); }
  return <Screen><Title subtitle={`${item.type} · ${new Date(item.date).toLocaleString()}`}>{item.title}</Title><Card><Text style={{ color: colors.textMuted }}>Amount</Text><Text style={{ color: colors.text, fontSize: 28, fontWeight: '900' }}>{prefs.privacyMode ? '••••••' : money(item.type === 'transfer' ? item.transferAmount || 0 : item.amount)}</Text><Text style={{ color: colors.textMuted }}>Account</Text><Text style={{ color: colors.text, fontWeight: '800' }}>{item.account}</Text><Text style={{ color: colors.textMuted }}>Member</Text><Text style={{ color: colors.text }}>{item.member || 'Household'}</Text>{record?.recoverySummary && <><Text style={{ color: colors.textMuted }}>Gross / recovered / net</Text><Text style={{ color: colors.text }}>{money(record.amount)} / {money(record.recoverySummary.recoveredAmount)} / {money(record.recoverySummary.netAmount)}</Text></>}</Card>
    {!!detailError && <Text style={{ color: colors.danger }}>{detailError}</Text>}
    {item.type === 'expense' && record && <Button label="Add or manage recovery" variant="secondary" onPress={() => navigation.navigate('RecoveryForm', { expense: record })} />}
    {item.editable && <Button label={route.params?.editMode ? 'Continue editing' : 'Edit transaction'} variant="secondary" disabled={!record} onPress={edit} />}
    {item.editable && <Button label="Delete transaction" variant="danger" onPress={() => Alert.alert('Delete transaction?', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: remove }])} />}
  </Screen>;
}

export function AccountsScreen({ navigation }: any) {
  return <Screen><Title subtitle="Choose an account from the Home carousel to open its ledger.">Accounts</Title><Card><Text>Account management and the complete account directory will be expanded in Epic 6.</Text></Card><Button label="Back to Home" onPress={() => navigation.goBack()} /></Screen>;
}

export function AccountDetailScreen({ route }: any) {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const prefs = usePreferences();
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  function load() {
    setLoading(true); setError('');
    api.accountTransactions({ account: route.params?.account, limit: 100 }).then(({ data }) => setRecords(data.records)).catch((cause) => setError(errorMessage(cause))).finally(() => setLoading(false));
  }
  useEffect(load, [route.params?.account]);
  const money = (amount: number) => new Intl.NumberFormat(user?.locale || 'en-AE', { style: 'currency', currency: user?.currency || 'AED', maximumFractionDigits: 0 }).format(amount || 0);
  if (loading) return <Screen scroll={false}><StateView kind="loading" title="Opening account ledger…" /></Screen>;
  if (error) return <Screen scroll={false}><StateView kind="error" message={error} onAction={load} /></Screen>;
  return <Screen><Title subtitle={`${records.length} recent ledger entries`}>{route.params?.title || 'Account ledger'}</Title>{records.length === 0 && <StateView kind="empty" message="No recorded movement for this account." />}{records.map((item) => <Card key={`${item.type}:${item.id}`}><Text style={{ color: colors.text, fontWeight: '900' }}>{item.description || item.title}</Text><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.textMuted }}>{new Date(item.date).toLocaleDateString()}</Text><Text style={{ color: item.signedAmount < 0 ? colors.danger : colors.success, fontWeight: '900' }}>{prefs.privacyMode ? '••••' : money(item.signedAmount)}</Text></View></Card>)}</Screen>;
}

export function AttentionScreen({ route }: any) {
  const { colors } = useAppTheme();
  const items: HomeAttention[] = route.params?.items || [];
  return <Screen><Title subtitle="Alerts generated from the selected Home month.">Notification inbox</Title>{items.length === 0 && <StateView kind="empty" message="You’re all caught up." />}{items.map((item) => <Card key={item.id}><View style={{ flexDirection: 'row', gap: 10 }}><Bell color={item.severity === 'urgent' ? colors.danger : colors.warning} /><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '900' }}>{item.title}</Text><Text style={{ color: colors.textMuted }}>{item.message}</Text></View></View></Card>)}</Screen>;
}

export function PlanDetailScreen({ route }: any) {
  const { colors } = useAppTheme();
  const focus = route.params?.focus;
  return <Screen><Title subtitle="The Home link is in place; editing workflows arrive with the planning epic.">{focus === 'recurring' ? 'Recurring commitments' : 'Budgets and goals'}</Title><Card><Text style={{ color: colors.text, lineHeight: 22 }}>Home already calculates and monitors these records. Full planning management will be implemented in Epic 8.</Text></Card></Screen>;
}
