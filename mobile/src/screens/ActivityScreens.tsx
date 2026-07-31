import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Text } from '../components/Typography';
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Copy, Filter, ReceiptText, RotateCcw, Search, Trash2, Undo2,
} from 'lucide-react-native';
import { api, errorMessage } from '../api';
import { Button, Card, Field, Screen, StateView, Title } from '../components/ui';
import { ActivityPreset, loadActivityPresets, saveActivityPreset } from '../storage';
import { useAuth } from '../state/AuthContext';
import { usePreferences } from '../state/PreferencesContext';
import { radius, spacing, useAppTheme } from '../theme';

type RecordItem = Record<string, any> & { id: string; type: 'expense' | 'income' | 'transfer' | 'recovery'; date: string; amount: number; signedAmount: number };
type Filters = {
  type: string; query: string; startDate: string; endDate: string; member: string;
  category: string; subcategory: string; account: string; minAmount: string; maxAmount: string; recurring: boolean; imported: boolean;
};
const emptyFilters: Filters = { type: 'all', query: '', startDate: '', endDate: '', member: '', category: '', subcategory: '', account: '', minAmount: '', maxAmount: '', recurring: false, imported: false };
const typeLabels: Record<string, string> = { all: 'All', expense: 'Expenses', income: 'Income', transfer: 'Transfers', recovery: 'Recoveries' };
const recordKey = (item: RecordItem) => `${item.type}:${item.id}`;
const idOf = (value: any) => String(value?._id || value || '');
const uniqueRecords = (items: RecordItem[]) => {
  const byId = new Map<string, RecordItem>();
  items.forEach((item) => byId.set(recordKey(item), item));
  return [...byId.values()];
};
const dayLabel = (value: string) => {
  const date = new Date(value); const now = new Date(); const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
};

export function ActivityScreen({ route, navigation }: any) {
  const { colors } = useAppTheme(); const { user } = useAuth(); const prefs = usePreferences();
  const [records, setRecords] = useState<RecordItem[]>([]); const [page, setPage] = useState(1); const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0); const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState('');
  const loadingMore = useRef(false);
  const [sortBy, setSortBy] = useState<'date_desc' | 'amount_desc'>('date_desc');
  const [filters, setFilters] = useState<Filters>({
    ...emptyFilters,
    type: route.params?.filter || 'all',
    category: idOf(route.params?.categoryId),
    subcategory: idOf(route.params?.subCategoryId),
    startDate: route.params?.startDate || '',
    endDate: route.params?.endDate || '',
  }); const [showFilters, setShowFilters] = useState(false);
  const [presets, setPresets] = useState<ActivityPreset[]>([]);
  useEffect(() => { loadActivityPresets().then(setPresets); }, []);
  const money = (amount: number) => new Intl.NumberFormat(user?.locale || 'en-AE', { style: 'currency', currency: user?.currency || 'AED', maximumFractionDigits: 2 }).format(amount || 0);

  const load = useCallback(async (nextPage = 1, append = false) => {
    if (append && loadingMore.current) return;
    if (append) loadingMore.current = true;
    if (!append) setLoading(true); setError('');
    try {
      const { data } = await api.accountTransactions({
        page: nextPage, limit: 40, sortBy,
        type: filters.type, query: filters.query || undefined,
        startDate: filters.startDate || undefined, endDate: filters.endDate || undefined,
        member: filters.member || undefined, category: filters.category || undefined, subcategory: filters.subcategory || undefined,
        account: filters.account || undefined, minAmount: filters.minAmount || undefined, maxAmount: filters.maxAmount || undefined,
        recurring: filters.recurring || undefined, imported: filters.imported || undefined,
      });
      setRecords((current) => uniqueRecords(append ? [...current, ...data.records] : data.records)); setPage(data.page); setPages(data.pages); setTotal(data.total); setSummary(data.summary?.activity || null);
    } catch (cause) { setError(errorMessage(cause)); } finally { loadingMore.current = false; setLoading(false); setRefreshing(false); }
  }, [filters, sortBy]);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => records.filter((item) => {
    if (filters.type !== 'all' && item.type !== filters.type) return false;
    const haystack = [item.description, item.title, item.notes, item.account, item.category, item.owner, item.amount].join(' ').toLowerCase();
    if (filters.query && !haystack.includes(filters.query.toLowerCase())) return false;
    if (filters.member && item.memberId !== filters.member && !String(item.owner).toLowerCase().includes(filters.member.toLowerCase())) return false;
    if (filters.category && idOf(item.categoryId) !== filters.category && !String(item.category).toLowerCase().includes(filters.category.toLowerCase())) return false;
    if (filters.subcategory && idOf(item.subCategoryId) !== filters.subcategory) return false;
    if (filters.account && item.accountId !== filters.account && !String(item.account).toLowerCase().includes(filters.account.toLowerCase())) return false;
    if (filters.minAmount && item.amount < Number(filters.minAmount)) return false;
    if (filters.maxAmount && item.amount > Number(filters.maxAmount)) return false;
    if (filters.recurring && !item.recurring) return false;
    if (filters.imported && !item.imported) return false;
    return true;
  }), [records, filters]);
  const activeCount = Object.entries(filters).filter(([key, value]) => key !== 'type' ? !!value : value !== 'all').length;
  const summaryRows = useMemo(() => {
    if (!summary) return [];
    if (filters.type === 'expense') return [
      ['Gross expenses', summary.grossExpenses, colors.danger],
      ['Recoveries applied', summary.recoveriesApplied, colors.success],
      ['Net expenses', summary.expenses, colors.danger],
    ];
    if (filters.type === 'income') return [['Income', summary.income, colors.success]];
    if (filters.type === 'transfer') return [['Transferred', summary.transfers, colors.primary]];
    if (filters.type === 'recovery') return [['Recovered', summary.recoveries, colors.success]];
    return [
      ['Income', summary.income, colors.success], ['Net expenses', summary.expenses, colors.danger],
      ['Recovered', summary.recoveries, colors.success], ['Transfers', summary.transfers, colors.primary],
      ['Net cash flow', summary.net, summary.net >= 0 ? colors.success : colors.danger],
    ];
  }, [summary, filters.type, colors]);

  function open(item: RecordItem) { navigation.navigate('ActivityDetail', { item }); }
  async function savePreset() {
    const preset = { id: `preset-${Date.now()}`, name: `${typeLabels[filters.type]}${filters.query ? ` · ${filters.query}` : ''}`, filters };
    await saveActivityPreset(preset); setPresets(await loadActivityPresets());
  }
  const icon = (type: string) => type === 'expense' ? ReceiptText : type === 'income' ? ArrowDownLeft : type === 'transfer' ? ArrowLeftRight : Undo2;

  if (loading && !records.length) return <Screen scroll={false}><StateView kind="loading" title="Loading activity…" /></Screen>;
  if (error && !records.length) return <Screen scroll={false}><StateView kind="error" message={error} onAction={() => load()} /></Screen>;
  return <Screen scroll={false} style={{ padding: 0 }}>
    <FlatList
      data={visible}
      keyExtractor={recordKey}
      contentContainerStyle={{ padding: spacing.lg, gap: 10, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      onEndReached={() => page < pages && load(page + 1, true)}
      onEndReachedThreshold={.35}
      ListHeaderComponent={<View style={{ gap: 14 }}>
        <Title subtitle={`${total} matching records`}>Unified Activity</Title>
        <Field label="Search activity" value={filters.query} onChangeText={(query) => setFilters({ ...filters, query })} placeholder="Merchant, notes, account or amount…" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Button compact label="Newest" variant={sortBy === 'date_desc' ? 'primary' : 'secondary'} onPress={() => setSortBy('date_desc')} /></View>
          <View style={{ flex: 1 }}><Button compact label="Highest amount" variant={sortBy === 'amount_desc' ? 'primary' : 'secondary'} onPress={() => setSortBy('amount_desc')} /></View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{Object.keys(typeLabels).map((type) => <Button key={type} label={typeLabels[type] || type} variant={filters.type === type ? 'primary' : 'secondary'} onPress={() => setFilters({ ...filters, type })} />)}</View>
        <Button label={activeCount ? `Filters (${activeCount})` : 'More filters'} variant="secondary" onPress={() => setShowFilters(!showFilters)} icon={<Filter size={17} color={colors.text} />} />
        {!!summaryRows.length && <Card><Text style={{ color: colors.text, fontWeight: '800' }}>Filtered totals</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{summaryRows.map(([label, value, tone]: any) => <View key={label} style={{ minWidth: '44%', flexGrow: 1 }}><Text style={{ color: colors.textMuted, fontSize: 12 }}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: tone, fontSize: 17, fontWeight: '800' }}>{money(value)}</Text></View>)}</View>{filters.type === 'transfer' && <Text style={{ color: colors.textMuted, fontSize: 12 }}>Transfers are not counted as income or expense.</Text>}</Card>}
        {showFilters && <Card>
          <Field label="Start date" value={filters.startDate} onChangeText={(startDate) => setFilters({ ...filters, startDate })} placeholder="YYYY-MM-DD" />
          <Field label="End date" value={filters.endDate} onChangeText={(endDate) => setFilters({ ...filters, endDate })} placeholder="YYYY-MM-DD" />
          <Field label="Member" value={filters.member} onChangeText={(member) => setFilters({ ...filters, member })} placeholder="Name or member ID" />
          <Field label="Category or subcategory" value={filters.category} onChangeText={(category) => setFilters({ ...filters, category })} />
          <Field label="Subcategory ID" value={filters.subcategory} onChangeText={(subcategory) => setFilters({ ...filters, subcategory })} />
          <Field label="Account, card, or payment method" value={filters.account} onChangeText={(account) => setFilters({ ...filters, account })} />
          <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Field label="Minimum" value={filters.minAmount} onChangeText={(minAmount) => setFilters({ ...filters, minAmount })} keyboardType="decimal-pad" /></View><View style={{ flex: 1 }}><Field label="Maximum" value={filters.maxAmount} onChangeText={(maxAmount) => setFilters({ ...filters, maxAmount })} keyboardType="decimal-pad" /></View></View>
          <Button label={`Recurring only ${filters.recurring ? '✓' : ''}`} variant={filters.recurring ? 'primary' : 'secondary'} onPress={() => setFilters({ ...filters, recurring: !filters.recurring })} />
          <Button label={`Imported only ${filters.imported ? '✓' : ''}`} variant={filters.imported ? 'primary' : 'secondary'} onPress={() => setFilters({ ...filters, imported: !filters.imported })} />
          <Button label="Apply date range" onPress={() => load()} />
          <Button label="Save filter preset" variant="secondary" onPress={savePreset} />
          <Button label="Reset all filters" variant="danger" onPress={() => setFilters(emptyFilters)} />
        </Card>}
        {!!presets.length && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{presets.map((preset) => <Button key={preset.id} label={preset.name} variant="secondary" onPress={() => setFilters({ ...emptyFilters, ...preset.filters })} />)}</View>}
      </View>}
      ListEmptyComponent={<StateView kind="empty" message="No transactions match these filters." />}
      renderItem={({ item, index }) => {
        const previous = visible[index - 1]; const Icon = icon(item.type); const showDay = sortBy === 'date_desc' && (!previous || dayLabel(previous.date) !== dayLabel(item.date));
        const amountColor = item.type === 'expense' ? colors.danger : item.type === 'transfer' ? colors.primary : colors.success;
        return <View style={{ gap: 8 }}>{showDay && <Text style={{ color: colors.text, fontWeight: '900', marginTop: 10 }}>{dayLabel(item.date)}</Text>}<Pressable accessibilityRole="button" onPress={() => open(item)} style={{ borderRadius: radius.lg }}>
          <Card><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Icon size={22} color={amountColor} /><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '900' }}>{item.description || item.title}</Text><Text style={{ color: colors.textMuted }}>{item.category || typeLabels[item.type]} · {item.account}</Text><Text style={{ color: colors.textMuted, fontSize: 12 }}>{item.owner || 'Household'} · {item.syncState || 'Synced'}{item.recurring ? ' · Recurring' : ''}{item.imported ? ' · Imported' : ''}</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={{ color: amountColor, fontWeight: '900' }}>{prefs.privacyMode ? '••••' : `${item.type === 'expense' ? '−' : item.type === 'transfer' ? '↔ ' : '+'}${money(item.amount)}`}</Text><Text style={{ color: colors.textMuted, fontSize: 12 }}>{sortBy === 'amount_desc' ? new Date(item.date).toLocaleDateString() : new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></View></View></Card>
        </Pressable></View>;
      }}
      ListFooterComponent={page < pages ? <Text style={{ color: colors.textMuted, textAlign: 'center', padding: 18 }}>Scroll for more…</Text> : null}
    />
  </Screen>;
}

export function ActivityDetailScreen({ route, navigation }: any) {
  const { colors } = useAppTheme(); const { user } = useAuth(); const prefs = usePreferences();
  const item: RecordItem = route.params.item; const [record, setRecord] = useState<any>(item); const [undo, setUndo] = useState<any>(null);
  const money = (amount: number) => new Intl.NumberFormat(user?.locale || 'en-AE', { style: 'currency', currency: user?.currency || 'AED' }).format(amount || 0);
  useEffect(() => {
    if (item.type === 'recovery') return;
    api.transactionDetail(item.type, item.id).then(({ data }) => setRecord({ ...item, ...data })).catch(() => {});
  }, [item.id, item.type]);
  function edit() {
    if (item.type === 'recovery') return navigation.navigate('RecoveryForm', { expense: { _id: item.expenseId, amount: item.amount, recoverySummary: { recoveredAmount: item.amount, netAmount: 0 }, recoveries: [] } });
    navigation.navigate(item.type === 'expense' ? 'ExpenseForm' : item.type === 'income' ? 'IncomeForm' : 'TransferForm', { preset: record, recordId: item.id });
  }
  function duplicate() {
    const preset = { ...record, _id: undefined, date: new Date().toISOString(), expectedUpdatedAt: undefined };
    navigation.navigate(item.type === 'expense' ? 'ExpenseForm' : item.type === 'income' ? 'IncomeForm' : 'TransferForm', { preset });
  }
  async function remove() {
    try {
      if (item.type === 'expense') await api.deleteExpense(item.id);
      else if (item.type === 'income') await api.deleteIncome(item.id);
      else if (item.type === 'transfer') await api.deleteTransfer(item.id);
      else await api.deleteRecovery(item.expenseId, item.id);
      setUndo({ item, expires: Date.now() + 5000 });
      setTimeout(() => navigation.goBack(), 5000);
    } catch (cause) { Alert.alert('Could not delete transaction', errorMessage(cause)); }
  }
  return <Screen>
    <Title subtitle={`${typeLabels[item.type]} · ${new Date(item.date).toLocaleString()}`}>{item.description || item.title}</Title>
    <Card><Text style={{ color: colors.textMuted }}>Amount</Text><Text style={{ color: colors.text, fontSize: 30, fontWeight: '900' }}>{prefs.privacyMode ? '••••••' : money(item.amount)}</Text>
      {[
        ['Type', typeLabels[item.type]], ['Category', record.category || record.categoryId?.name], ['Account / card', record.account],
        ['Member', record.owner || record.memberId?.name], ['Payment method', record.paymentMethod], ['Notes', record.notes],
      ].filter(([, value]) => value).map(([key, value]) => <View key={key}><Text style={{ color: colors.textMuted }}>{key}</Text><Text style={{ color: colors.text, fontWeight: '700' }}>{String(value)}</Text></View>)}
      {record.recoverySummary && <View><Text style={{ color: colors.textMuted }}>Gross / recovered / net</Text><Text style={{ color: colors.text }}>{money(record.amount)} / {money(record.recoverySummary.recoveredAmount)} / {money(record.recoverySummary.netAmount)}</Text></View>}
      {record.subscriptionId && <Text style={{ color: colors.primary }}>Generated from recurring rule</Text>}
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>Created {record.createdAt ? new Date(record.createdAt).toLocaleString() : '—'} · Updated {record.updatedAt ? new Date(record.updatedAt).toLocaleString() : '—'}</Text>
    </Card>
    {undo ? <Card><Text style={{ color: colors.warning, fontWeight: '900' }}>Deleted. Undo is unavailable until server-side soft deletion is introduced.</Text></Card> : <>
      <Button label="Edit" variant="secondary" onPress={edit} />
      {item.type !== 'recovery' && <Button label="Duplicate" variant="secondary" onPress={duplicate} icon={<Copy size={17} color={colors.text} />} />}
      {item.type === 'expense' && <Button label="Add recovery" variant="secondary" onPress={() => navigation.navigate('RecoveryForm', { expense: record })} icon={<RotateCcw size={17} color={colors.text} />} />}
      <Button label="Delete" variant="danger" onPress={() => Alert.alert('Delete this record?', 'This action affects balances and reports.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: remove }])} icon={<Trash2 size={17} color={colors.danger} />} />
    </>}
  </Screen>;
}
