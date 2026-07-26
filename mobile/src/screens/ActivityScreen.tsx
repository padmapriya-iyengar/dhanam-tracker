import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../components/Typography';
import { Edit3, Plus, RotateCcw, Play, Trash2 } from 'lucide-react-native';
import { Entity, mobileApi, apiErrorMessage } from '../api';
import { useAuth } from '../AuthContext';
import { Busy, Button, Card, Choice, Empty, ErrorBox, Field, money, Page, PageTitle, Sheet, today } from '../components/MobileUI';
import { colors, typography } from '../theme';
import { useTheme } from '../ThemeContext';

const types = ['expenses', 'income', 'transfers', 'subscriptions'] as const;
type Kind = typeof types[number];

function populatedName(value: any, fallback = '') { return value?.name || fallback; }
function titleFor(item: Entity, kind: Kind) {
  if (kind === 'expenses') return item.description || populatedName(item.categoryId, 'Expense');
  if (kind === 'income') return item.source || 'Income';
  if (kind === 'subscriptions') return item.name || 'Recurring expense';
  return item.description || 'Transfer';
}
function detailFor(item: Entity, kind: Kind) {
  if (kind === 'expenses') return `${populatedName(item.memberId)} · ${String(item.paymentMethod || '').replaceAll('_', ' ')}`;
  if (kind === 'income') return populatedName(item.memberId);
  if (kind === 'subscriptions') return `Day ${item.dayOfMonth} · ${populatedName(item.categoryId)}`;
  const from = populatedName(item.fromMemberId) || populatedName(item.fromSavingsAccountId) || populatedName(item.fromCreditCardId);
  const to = populatedName(item.toMemberId) || populatedName(item.toSavingsAccountId) || populatedName(item.toCreditCardId);
  return `${from} → ${to}`;
}

export function ActivityScreen({ navigation, fixedKind }: any) {
  const { user } = useAuth();
  const { colors: theme } = useTheme();
  const [kind, setKind] = useState<Kind>(fixedKind || 'expenses');
  const [records, setRecords] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [recovering, setRecovering] = useState<Entity | null>(null);
  const [recovery, setRecovery] = useState({ amount: '', date: today(), source: 'other', notes: '' });
  const [editing, setEditing] = useState<Entity | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const response = await mobileApi.list<any>(`/${kind}`, { limit: 100 });
      setRecords(response.data.records || response.data || []);
    } catch (next) { setError(apiErrorMessage(next)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [kind]);
  useEffect(() => { load(); }, [load]);

  function remove(item: Entity) {
    Alert.alert('Delete record?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await mobileApi.remove(`/${kind}`, item._id); await load(); }
        catch (next) { setError(apiErrorMessage(next)); }
      } },
    ]);
  }
  function generate(item: Entity) {
    const now = new Date();
    Alert.alert('Generate this expense?', `Create ${item.name} for this month.`, [
      { text: 'Cancel' }, { text: 'Generate', onPress: async () => {
        try { await mobileApi.create(`/subscriptions/${item._id}/generate`, { month: now.getMonth() + 1, year: now.getFullYear() }); }
        catch (next) { setError(apiErrorMessage(next)); }
      } },
    ]);
  }
  async function saveRecovery() {
    if (!recovering) return;
    try {
      await mobileApi.create(`/expenses/${recovering._id}/recoveries`, { ...recovery, amount: Number(recovery.amount), budgetTreatment: 'reduce_expense' });
      setRecovering(null); setRecovery({ amount: '', date: today(), source: 'other', notes: '' }); await load();
    } catch (next) { setError(apiErrorMessage(next)); }
  }
  function openEdit(item: Entity) {
    setEditing(item);
    setEditForm({
      name: item.name || '', amount: String(item.amount || ''), date: item.date ? String(item.date).slice(0, 10) : today(),
      source: item.source || '', description: item.description || '', notes: item.notes || '', dayOfMonth: String(item.dayOfMonth || ''),
    });
  }
  async function saveEdit() {
    if (!editing) return;
    try {
      const itemId = (value: any) => value?._id || value || null;
      let payload: Record<string, unknown>;
      if (kind === 'expenses') payload = {
        memberId: itemId(editing.memberId), categoryId: itemId(editing.categoryId), subCategoryId: itemId(editing.subCategoryId),
        creditCardId: itemId(editing.creditCardId), savingsAccountId: itemId(editing.savingsAccountId), paymentMethod: editing.paymentMethod,
        amount: Number(editForm.amount), date: editForm.date, description: editForm.description, notes: editForm.notes,
      };
      else if (kind === 'income') payload = {
        memberId: itemId(editing.memberId), savingsAccountId: itemId(editing.savingsAccountId), amount: Number(editForm.amount),
        date: editForm.date, source: editForm.source, description: editForm.description,
      };
      else if (kind === 'subscriptions') payload = {
        name: editForm.name, memberId: itemId(editing.memberId), categoryId: itemId(editing.categoryId), subCategoryId: itemId(editing.subCategoryId),
        creditCardId: itemId(editing.creditCardId), savingsAccountId: itemId(editing.savingsAccountId), paymentMethod: editing.paymentMethod,
        amount: Number(editForm.amount), dayOfMonth: Number(editForm.dayOfMonth), description: editForm.description, notes: editForm.notes,
      };
      else payload = {
        amount: Number(editForm.amount), date: editForm.date, description: editForm.description, notes: editForm.notes,
        fromAccountType: editing.fromAccountType, fromMemberId: itemId(editing.fromMemberId), fromSavingsAccountId: itemId(editing.fromSavingsAccountId), fromCreditCardId: itemId(editing.fromCreditCardId),
        toAccountType: editing.toAccountType, toMemberId: itemId(editing.toMemberId), toSavingsAccountId: itemId(editing.toSavingsAccountId), toCreditCardId: itemId(editing.toCreditCardId),
      };
      await mobileApi.update(`/${kind}`, editing._id, payload);
      setEditing(null); await load();
    } catch (next) { setError(apiErrorMessage(next)); }
  }

  return <Page refreshing={refreshing} onRefresh={() => load(true)}>
    <PageTitle
      title={fixedKind === 'income' ? 'Income' : fixedKind === 'expenses' ? 'Expenses' : 'Activity'}
      subtitle={fixedKind === 'income' ? 'Money received and recorded' : fixedKind === 'expenses' ? 'Monthly spending and recoveries' : 'Income, spending, transfers and recurring expenses'}
      action={fixedKind ? <Pressable accessibilityLabel={`Add ${fixedKind === 'income' ? 'income' : 'expense'}`} onPress={() => navigation.navigate('AddRecord', { kind: fixedKind === 'income' ? 'income' : 'expense' })} style={[styles.addButton, { backgroundColor: theme.primary }]}><Plus size={19} color="#fff" /></Pressable> : undefined}
    />
    {!fixedKind ? <View style={styles.tabs}>{types.map(type => <Pressable key={type} onPress={() => setKind(type)} style={[styles.tab, { backgroundColor: theme.surface, borderColor: theme.border }, kind === type && { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}><Text style={[styles.tabText, { color: theme.textMuted }, kind === type && { color: theme.primaryDark }]}>{type === 'subscriptions' ? 'Recurring' : type[0].toUpperCase() + type.slice(1)}</Text></Pressable>)}</View> : null}
    <ErrorBox message={error} />
    {loading ? <Busy /> : records.length === 0 ? <Empty text={`No ${kind} found.`} /> : records.map(item => <Card key={item._id}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.recordTitle, { color: theme.text }]}>{titleFor(item, kind)}</Text>
          <Text style={[styles.recordDetail, { color: theme.textMuted }]}>{detailFor(item, kind)}</Text>
          <Text style={[styles.date, { color: theme.textSoft }]}>{item.date ? new Date(item.date).toLocaleDateString() : 'Active recurring rule'}</Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, { color: theme.text }, kind === 'expenses' && { color: theme.negative }, kind === 'income' && { color: theme.positive }]}>{money(item.amount || 0, user?.currency)}</Text>
          <View style={{ flexDirection: 'row' }}>{kind === 'subscriptions' ? <Pressable accessibilityLabel="Generate expense" onPress={() => generate(item)} style={styles.delete}><Play size={15} color={colors.positive} /></Pressable> : null}{kind === 'expenses' ? <Pressable accessibilityLabel="Add recovery" onPress={() => setRecovering(item)} style={styles.delete}><RotateCcw size={15} color={colors.positive} /></Pressable> : null}<Pressable accessibilityLabel="Edit" onPress={() => openEdit(item)} style={styles.delete}><Edit3 size={15} color={colors.primary} /></Pressable><Pressable accessibilityLabel="Delete" onPress={() => remove(item)} style={styles.delete}><Trash2 size={15} color={colors.negative} /></Pressable></View>
        </View>
      </View>
    </Card>)}
    <Sheet visible={!!recovering} title="Record expense recovery" onClose={() => setRecovering(null)}>
      <ErrorBox message={error} /><Field label="Amount" value={recovery.amount} onChangeText={(amount: string) => setRecovery(x => ({ ...x, amount }))} keyboardType="decimal-pad" /><Field label="Date" value={recovery.date} onChangeText={(date: string) => setRecovery(x => ({ ...x, date }))} />
      <Choice label="Source" value={recovery.source} options={['bank_reimbursement', 'family_transfer', 'employer', 'friend', 'other'].map(value => ({ value, label: value.replaceAll('_', ' ') }))} onChange={source => setRecovery(x => ({ ...x, source }))} />
      <Field label="Notes" value={recovery.notes} onChangeText={(notes: string) => setRecovery(x => ({ ...x, notes }))} multiline /><Button label="Save recovery" onPress={saveRecovery} />
    </Sheet>
    <Sheet visible={!!editing} title={`Edit ${kind === 'subscriptions' ? 'recurring expense' : kind === 'income' ? 'income' : kind.slice(0, -1)}`} onClose={() => setEditing(null)}>
      <ErrorBox message={error} />{kind === 'subscriptions' ? <Field label="Name" value={editForm.name} onChangeText={(name: string) => setEditForm(x => ({ ...x, name }))} /> : null}
      <Field label="Amount" value={editForm.amount} onChangeText={(amount: string) => setEditForm(x => ({ ...x, amount }))} keyboardType="decimal-pad" />
      {kind === 'income' ? <Field label="Source" value={editForm.source} onChangeText={(source: string) => setEditForm(x => ({ ...x, source }))} /> : null}
      {kind === 'subscriptions' ? <Field label="Day of month" value={editForm.dayOfMonth} onChangeText={(dayOfMonth: string) => setEditForm(x => ({ ...x, dayOfMonth }))} keyboardType="number-pad" /> : <Field label="Date" value={editForm.date} onChangeText={(date: string) => setEditForm(x => ({ ...x, date }))} />}
      <Field label="Description" value={editForm.description} onChangeText={(description: string) => setEditForm(x => ({ ...x, description }))} />
      {kind !== 'income' ? <Field label="Notes" value={editForm.notes} onChangeText={(notes: string) => setEditForm(x => ({ ...x, notes }))} multiline /> : null}<Button label="Save changes" onPress={saveEdit} />
    </Sheet>
  </Page>;
}

const styles = StyleSheet.create({
  addButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', gap: 5, marginBottom: 14 },
  tab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.primarySoft, borderColor: '#A5B4FC' },
  tabText: { ...typography, color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  tabTextActive: { color: colors.primaryDark },
  row: { flexDirection: 'row', gap: 10 },
  recordTitle: { ...typography, color: colors.text, fontSize: 12.5, fontWeight: '800' },
  recordDetail: { ...typography, color: colors.textMuted, fontSize: 9.5, marginTop: 3, textTransform: 'capitalize' },
  date: { ...typography, color: colors.textSoft, fontSize: 9, marginTop: 4 },
  right: { alignItems: 'flex-end', justifyContent: 'space-between' },
  amount: { ...typography, color: colors.text, fontSize: 12.5, fontWeight: '800' },
  delete: { padding: 8, marginRight: -7, marginBottom: -7 },
});
