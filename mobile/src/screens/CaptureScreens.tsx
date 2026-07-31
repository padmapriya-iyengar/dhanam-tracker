import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';
import { Text } from '../components/Typography';
import * as Haptics from 'expo-haptics';
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Clock3, MessageSquareText, Plus,
  ReceiptText, RotateCcw, Sparkles, Undo2, WalletCards, X,
} from 'lucide-react-native';
import { api, errorMessage } from '../api';
import { Button, Card, Field, Screen, StateView, Title } from '../components/ui';
import { deleteDraft, loadDrafts, LocalDraft, saveDraft, updateImportInboxItem } from '../storage';
import { useAuth } from '../state/AuthContext';
import { useNetwork } from '../state/NetworkContext';
import { useSync } from '../state/SyncContext';
import { radius, useAppTheme } from '../theme';

type Option = { _id?: string; id?: string; key?: string; name: string; type?: string; memberId?: string; balance?: number };
type Category = { _id: string; name: string; color: string; subCategories: Array<{ _id: string; name: string }> };
type CaptureOptions = { members: Option[]; categories: Category[]; accounts: Option[]; frequent: Array<{ label: string; values: Record<string, any> }>; recentIncomeSources: string[]; lastIncome: Record<string, any> | null };
const today = () => new Date().toISOString().slice(0, 10);
const idOf = (item: Option) => String(item._id || item.id || '');
const refId = (value: any) => String(value?._id || value || '');

function Choice({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) {
  return <Button label={`${selected ? '✓ ' : ''}${label}`} variant={selected ? 'primary' : 'secondary'} onPress={onPress} />;
}
function AmountField({ value, onChange, currency }: { value: string; onChange: (value: string) => void; currency: string }) {
  const { colors } = useAppTheme();
  return <View style={{ borderRadius: radius.lg, backgroundColor: colors.surface, padding: 20, borderWidth: 1, borderColor: colors.border }}>
    <Text style={{ color: colors.textMuted, fontWeight: '800' }}>AMOUNT · {currency}</Text>
    <Field label="Transaction amount" value={value} onChangeText={(text) => onChange(text.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0.00" />
  </View>;
}
function useOptions() {
  const [options, setOptions] = useState<CaptureOptions | null>(null);
  const [error, setError] = useState('');
  const load = () => { setError(''); api.captureOptions().then(({ data }) => setOptions(data)).catch((e) => setError(errorMessage(e))); };
  useEffect(load, []);
  return { options, error, load };
}

export function AddMenuScreen({ navigation }: any) {
  const { colors } = useAppTheme();
  const { options, error, load } = useOptions();
  const { queue, sync } = useSync();
  const [drafts, setDrafts] = useState<LocalDraft[]>([]);
  useEffect(() => { loadDrafts().then(setDrafts); }, []);
  const actions = [
    ['Expense', 'ExpenseForm', ReceiptText, colors.danger], ['Income', 'IncomeForm', ArrowDownLeft, colors.success],
    ['Transfer', 'TransferForm', ArrowLeftRight, colors.primary], ['Import bank message', 'MessageImport', MessageSquareText, colors.warning],
    ['Recovery', 'RecoveryPicker', Undo2, colors.accent],
  ] as const;
  return <Screen>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}><View style={{ flex: 1 }}><Title subtitle="Record money in a few focused steps.">Add to Dhanam</Title></View><Pressable accessibilityRole="button" accessibilityLabel="Close Add" onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')} style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}><X size={20} color={colors.text} /></Pressable></View>
    {queue.length > 0 && <Card><Text style={{ color: colors.warning, fontWeight: '900' }}>{queue.length} change{queue.length === 1 ? '' : 's'} waiting to sync</Text><Text style={{ color: colors.textMuted }}>{queue.filter((item) => item.status === 'failed').length} failed and can be retried.</Text><Button label="Retry sync" variant="secondary" onPress={sync} /></Card>}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {actions.map(([label, screen, Icon, color], index) => <Pressable key={screen} accessibilityRole="button" onPress={() => navigation.navigate(screen)} style={{ width: index === actions.length - 1 ? '100%' : '48%', minHeight: 72, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Icon size={23} color={color} /><Text numberOfLines={2} style={{ color: colors.text, fontSize: 15, fontWeight: '900', flex: 1 }}>{label}</Text></Pressable>)}
    </View>
    {!!error && <StateView kind="error" message={error} onAction={load} />}
    {!!options?.frequent.length && <Card><Text style={{ color: colors.text, fontSize: 17, fontWeight: '900' }}>Frequent actions</Text><View>{options.frequent.map((item, index) => <Pressable key={`${item.label}-${index}`} accessibilityRole="button" onPress={() => navigation.navigate('ExpenseForm', { preset: item.values })} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: index ? 1 : 0, borderTopColor: colors.border }}><Clock3 size={17} color={colors.primary} /><Text numberOfLines={2} style={{ color: colors.text, fontSize: 14, fontWeight: '700', flex: 1 }}>{item.label}</Text><Plus size={16} color={colors.textMuted} /></Pressable>)}</View></Card>}
    {!!drafts.length && <Card><Text style={{ color: colors.text, fontSize: 17, fontWeight: '900' }}>Drafts</Text>{drafts.map((draft) => <Button key={draft.id} label={`${draft.kind} · ${new Date(draft.updatedAt).toLocaleString()}`} variant="secondary" onPress={() => navigation.navigate(`${draft.kind}Form`, { draft })} />)}</Card>}
  </Screen>;
}

export function ExpenseFormScreen({ navigation, route }: any) {
  const { colors } = useAppTheme(); const { user } = useAuth(); const { online } = useNetwork(); const { enqueue } = useSync();
  const { options, error, load } = useOptions(); const preset = route.params?.draft?.values || route.params?.preset || {};
  const draftId = route.params?.draft?.id || `expense-${Date.now()}`; const recordId = route.params?.recordId;
  const [form, setForm] = useState<any>({ amount: preset.amount ? String(preset.amount) : '', date: preset.date ? String(preset.date).slice(0, 10) : today(), description: preset.description || '', memberId: refId(preset.memberId), categoryId: refId(preset.categoryId), subCategoryId: refId(preset.subCategoryId), paymentMethod: preset.paymentMethod || 'current_account', creditCardId: refId(preset.creditCardId), savingsAccountId: refId(preset.savingsAccountId), notes: preset.notes || '', imported: !!preset.imported, affectsCurrentBalance: preset.affectsCurrentBalance ?? true, expectedUpdatedAt: preset.updatedAt });
  const [saving, setSaving] = useState(false); const [suggestion, setSuggestion] = useState<any>(null);
  useEffect(() => { if (options && !form.memberId) setForm((value: any) => ({ ...value, memberId: idOf(options.members[0] || {} as Option) })); }, [options]);
  useEffect(() => { const timer = setTimeout(() => { if (form.description.length >= 2) api.captureSuggest(form.description).then(({ data }) => setSuggestion(data.suggestion)).catch(() => {}); }, 450); return () => clearTimeout(timer); }, [form.description]);
  const selectedCategory = options?.categories.find((item) => item._id === form.categoryId);
  function payment(method: string) { setForm({ ...form, paymentMethod: method, creditCardId: '', savingsAccountId: '', affectsCurrentBalance: method === 'current_account' }); }
  function validate() {
    if (!(Number(form.amount) > 0)) return 'Enter an amount greater than zero.';
    if (!form.memberId || !form.categoryId) return 'Choose a member and category.';
    if (form.paymentMethod === 'credit_card' && !form.creditCardId) return 'Choose the credit card used.';
    if (form.paymentMethod === 'savings' && !form.savingsAccountId) return 'Choose the savings account used.';
    return '';
  }
  async function save(another = false, confirmed = false, force = false) {
    const problem = validate(); if (problem) return Alert.alert('Check this expense', problem);
    const payload = { ...form, clientMutationId: recordId ? undefined : draftId, amount: Number(form.amount), date: new Date(`${form.date}T12:00:00`).toISOString(), subCategoryId: form.subCategoryId || null, creditCardId: form.paymentMethod === 'credit_card' ? form.creditCardId : null, savingsAccountId: form.paymentMethod === 'savings' ? form.savingsAccountId : null };
    if (force) delete payload.expectedUpdatedAt;
    setSaving(true);
    try {
      if (!recordId && !confirmed && online) {
        const duplicates = (await api.duplicateCheck(payload)).data.duplicates;
        if (duplicates.length) { setSaving(false); return Alert.alert('Possible duplicate', `A matching ${duplicates[0].description || 'expense'} already exists for this date.`, [{ text: 'Review', style: 'cancel' }, { text: 'Save anyway', onPress: () => save(another, true) }]); }
      }
      if (online) recordId ? await api.updateExpense(recordId, payload) : await api.createExpense(payload); else if (!recordId) await enqueue('expense.create', payload); else throw new Error('Editing an existing record requires a connection to detect conflicts.');
      await deleteDraft(draftId); await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (route.params?.importInboxId) await updateImportInboxItem(route.params.importInboxId, { status: 'saved', message: undefined });
      if (another) setForm({ ...form, amount: '', description: '', notes: '', date: today() }); else navigation.popToTop();
    } catch (cause: any) {
      if (cause?.response?.status === 409) {
        const server = cause.response.data?.conflict;
        Alert.alert('Expense changed elsewhere', 'Choose which version to keep.', [
          { text: 'Use server version', onPress: () => server && setForm({ ...form, ...server, amount: String(server.amount), date: String(server.date).slice(0, 10), memberId: refId(server.memberId), categoryId: refId(server.categoryId), subCategoryId: refId(server.subCategoryId), expectedUpdatedAt: server.updatedAt }) },
          { text: 'Keep my version', onPress: () => save(another, true, true) },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else Alert.alert('Could not save expense', errorMessage(cause));
    } finally { setSaving(false); }
  }
  if (!options && !error) return <Screen scroll={false}><StateView kind="loading" title="Preparing expense form…" /></Screen>;
  if (error) return <Screen scroll={false}><StateView kind="error" message={error} onAction={load} /></Screen>;
  return <Screen>
    <Title subtitle={online ? 'Changes save immediately.' : 'Offline—this expense will be queued securely.'}>{recordId ? 'Edit expense' : 'Quick expense'}</Title>
    <AmountField value={form.amount} onChange={(amount) => setForm({ ...form, amount })} currency={user?.currency || 'AED'} />
    <Field label="Merchant or description" value={form.description} onChangeText={(description) => setForm({ ...form, description })} placeholder="Groceries, fuel, restaurant…" />
    {!!suggestion && <Card><View style={{ flexDirection: 'row', gap: 9 }}><Sparkles color={colors.accent} /><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: '900' }}>Smart suggestion</Text><Text style={{ color: colors.textMuted }}>{suggestion.reason}</Text></View></View><Button label="Apply suggestion" variant="secondary" onPress={() => setForm({ ...form, ...suggestion, categoryId: String(suggestion.categoryId), subCategoryId: String(suggestion.subCategoryId || ''), memberId: String(suggestion.memberId || form.memberId), creditCardId: String(suggestion.creditCardId || ''), savingsAccountId: String(suggestion.savingsAccountId || '') })} /></Card>}
    <Field label="Date" value={form.date} onChangeText={(date) => setForm({ ...form, date })} placeholder="YYYY-MM-DD" />
    <Card><Text style={{ color: colors.text, fontWeight: '900' }}>Member</Text>{options!.members.map((item) => <Choice key={idOf(item)} selected={form.memberId === idOf(item)} label={item.name} onPress={() => setForm({ ...form, memberId: idOf(item) })} />)}</Card>
    <Card><Text style={{ color: colors.text, fontWeight: '900' }}>Category</Text>{options!.categories.map((item) => <Choice key={item._id} selected={form.categoryId === item._id} label={item.name} onPress={() => setForm({ ...form, categoryId: item._id, subCategoryId: '' })} />)}</Card>
    {!!selectedCategory?.subCategories.length && <Card><Text style={{ color: colors.text, fontWeight: '900' }}>Subcategory</Text><Choice selected={!form.subCategoryId} label="None" onPress={() => setForm({ ...form, subCategoryId: '' })} />{selectedCategory.subCategories.map((item) => <Choice key={item._id} selected={form.subCategoryId === item._id} label={item.name} onPress={() => setForm({ ...form, subCategoryId: item._id })} />)}</Card>}
    <Card><Text style={{ color: colors.text, fontWeight: '900' }}>Payment source</Text>{([['current_account', 'Current account'], ['savings', 'Savings account'], ['credit_card', 'Credit card'], ['cash', 'Cash'], ['other', 'Other']] as const).map(([value, label]) => <Choice key={value} selected={form.paymentMethod === value} label={label} onPress={() => payment(value)} />)}
      {form.paymentMethod === 'credit_card' && options!.accounts.filter((a) => a.type === 'credit_card').map((item) => <Choice key={item.key} selected={form.creditCardId === item.id} label={item.name} onPress={() => setForm({ ...form, creditCardId: item.id })} />)}
      {form.paymentMethod === 'savings' && options!.accounts.filter((a) => a.type === 'savings').map((item) => <Choice key={item.key} selected={form.savingsAccountId === item.id} label={item.name} onPress={() => setForm({ ...form, savingsAccountId: item.id })} />)}
      {form.paymentMethod === 'current_account' && <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ color: colors.text, flex: 1 }}>Affects current balance</Text><Switch value={form.affectsCurrentBalance} onValueChange={(affectsCurrentBalance) => setForm({ ...form, affectsCurrentBalance })} /></View>}
    </Card>
    <Field label="Notes" value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} multiline />
    <Button label="Save draft" variant="secondary" onPress={() => saveDraft({ id: draftId, kind: 'Expense', updatedAt: Date.now(), values: form }).then(() => navigation.goBack())} />
    <Button label={saving ? 'Saving…' : online ? 'Save expense' : 'Queue expense'} disabled={saving} onPress={() => save(false)} />
    <Button label="Save and add another" variant="secondary" disabled={saving} onPress={() => save(true)} />
  </Screen>;
}

export function IncomeFormScreen({ navigation, route }: any) {
  const { user } = useAuth(); const { online } = useNetwork(); const { enqueue } = useSync(); const { options, error, load } = useOptions();
  const preset = route.params?.draft?.values || route.params?.preset || {}; const recordId = route.params?.recordId; const draftId = route.params?.draft?.id || `income-${Date.now()}`;
  const [form, setForm] = useState<any>({ amount: preset.amount ? String(preset.amount) : '', date: preset.date ? String(preset.date).slice(0, 10) : today(), memberId: refId(preset.memberId), source: preset.source || '', description: preset.description || '', savingsAccountId: refId(preset.savingsAccountId), imported: !!preset.imported, expectedUpdatedAt: preset.updatedAt });
  useEffect(() => { if (options && !form.memberId) setForm((value: any) => ({ ...value, memberId: idOf(options.members[0] || {} as Option) })); }, [options]);
  async function save() { if (!(Number(form.amount) > 0) || !form.memberId || !form.source.trim()) return Alert.alert('Check this income', 'Amount, member, and source are required.'); const payload = { ...form, clientMutationId: recordId ? undefined : draftId, amount: Number(form.amount), date: new Date(`${form.date}T12:00:00`).toISOString(), savingsAccountId: form.savingsAccountId || null }; try { if (online) recordId ? await api.updateIncome(recordId, payload) : await api.createIncome(payload); else if (!recordId) await enqueue('income.create', payload); else throw new Error('Editing requires a connection to detect conflicts.'); if (route.params?.importInboxId) await updateImportInboxItem(route.params.importInboxId, { status: 'saved', message: undefined }); await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); navigation.popToTop(); } catch (e) { Alert.alert('Could not save income', errorMessage(e)); } }
  if (!options && !error) return <Screen scroll={false}><StateView kind="loading" /></Screen>; if (error) return <Screen scroll={false}><StateView kind="error" message={error} onAction={load} /></Screen>;
  return <Screen><Title subtitle="Record money received and where it landed.">Add income</Title><AmountField value={form.amount} onChange={(amount) => setForm({ ...form, amount })} currency={user?.currency || 'AED'} />
    {!!options!.lastIncome && <Button label="Repeat last income" variant="secondary" onPress={() => setForm({ ...form, amount: String(options!.lastIncome!.amount), source: options!.lastIncome!.source, description: options!.lastIncome!.description || '', memberId: String(options!.lastIncome!.memberId), savingsAccountId: String(options!.lastIncome!.savingsAccountId || '') })} icon={<RotateCcw size={17} />} />}
    <Field label="Source" value={form.source} onChangeText={(source) => setForm({ ...form, source })} placeholder="Salary, bonus, interest…" />{options!.recentIncomeSources.map((source) => <Choice key={source} selected={form.source === source} label={source} onPress={() => setForm({ ...form, source })} />)}
    <Field label="Description" value={form.description} onChangeText={(description) => setForm({ ...form, description })} /><Field label="Date" value={form.date} onChangeText={(date) => setForm({ ...form, date })} />
    <Card><Text>Member</Text>{options!.members.map((item) => <Choice key={idOf(item)} selected={form.memberId === idOf(item)} label={item.name} onPress={() => setForm({ ...form, memberId: idOf(item) })} />)}</Card>
    <Card><Text>Destination</Text><Choice selected={!form.savingsAccountId} label="Member current account" onPress={() => setForm({ ...form, savingsAccountId: '' })} />{options!.accounts.filter((a) => a.type === 'savings').map((item) => <Choice key={item.key} selected={form.savingsAccountId === item.id} label={item.name} onPress={() => setForm({ ...form, savingsAccountId: item.id })} />)}</Card>
    <Button label="Save draft" variant="secondary" onPress={() => saveDraft({ id: draftId, kind: 'Income', updatedAt: Date.now(), values: form }).then(() => navigation.goBack())} /><Button label={online ? 'Save income' : 'Queue income'} onPress={save} /></Screen>;
}

export function TransferFormScreen({ navigation, route }: any) {
  const { user } = useAuth(); const { online } = useNetwork(); const { enqueue } = useSync(); const { options, error, load } = useOptions();
  const [homeBalances, setHomeBalances] = useState<Record<string, number>>({});
  const preset = route.params?.draft?.values || route.params?.preset || {}; const recordId = route.params?.recordId; const draftId = route.params?.draft?.id || `transfer-${Date.now()}`;
  const accountKey = (side: string) => preset[`${side}AccountType`] ? `${preset[`${side}AccountType`]}:${refId(preset[`${side}MemberId`] || preset[`${side}SavingsAccountId`] || preset[`${side}CreditCardId`])}` : '';
  const [form, setForm] = useState<any>({ amount: preset.amount ? String(preset.amount) : '', date: preset.date ? String(preset.date).slice(0, 10) : today(), from: preset.from || accountKey('from'), to: preset.to || accountKey('to'), description: preset.description || '', notes: preset.notes || '', expectedUpdatedAt: preset.expectedUpdatedAt || preset.updatedAt });
  useEffect(() => {
    api.home(new Date().getMonth() + 1, new Date().getFullYear())
      .then(({ data }) => setHomeBalances(Object.fromEntries(data.accounts.accounts.map((account) => [account.key, account.balance]))))
      .catch(() => {});
  }, []);
  const from = options?.accounts.find((a) => a.key === form.from); const to = options?.accounts.find((a) => a.key === form.to);
  const fields = (account: Option, side: 'from' | 'to') => ({ [`${side}AccountType`]: account.type, [`${side}MemberId`]: account.type === 'current' ? account.id : null, [`${side}SavingsAccountId`]: account.type === 'savings' ? account.id : null, [`${side}CreditCardId`]: account.type === 'credit_card' ? account.id : null });
  async function save() { if (!(Number(form.amount) > 0) || !from || !to || form.from === form.to) return Alert.alert('Check this transfer', 'Choose different source and destination accounts and enter an amount.'); const payload = { amount: Number(form.amount), clientMutationId: recordId ? undefined : draftId, date: new Date(`${form.date}T12:00:00`).toISOString(), description: form.description, notes: form.notes, imported: !!preset.imported, expectedUpdatedAt: form.expectedUpdatedAt, ...fields(from, 'from'), ...fields(to, 'to') }; try { if (online) recordId ? await api.updateTransfer(recordId, payload) : await api.createTransfer(payload); else if (!recordId) await enqueue('transfer.create', payload); else throw new Error('Editing requires a connection to detect conflicts.'); if (route.params?.importInboxId) await updateImportInboxItem(route.params.importInboxId, { status: 'saved', message: undefined }); navigation.popToTop(); } catch (e) { Alert.alert('Could not save transfer', errorMessage(e)); } }
  if (!options && !error) return <Screen scroll={false}><StateView kind="loading" /></Screen>; if (error) return <Screen scroll={false}><StateView kind="error" message={error} onAction={load} /></Screen>;
  return <Screen><Title subtitle="Card payments are transfers and never count as a second expense.">Transfer money</Title><AmountField value={form.amount} onChange={(amount) => setForm({ ...form, amount })} currency={user?.currency || 'AED'} />
    <Card><Text>From account</Text>{options!.accounts.map((item) => <Choice key={item.key} selected={form.from === item.key} label={item.name} onPress={() => setForm({ ...form, from: item.key })} />)}</Card>
    <Card><Text>To account</Text>{options!.accounts.map((item) => <Choice key={item.key} selected={form.to === item.key} label={item.name} onPress={() => setForm({ ...form, to: item.key })} />)}</Card>
    {from && to && form.from !== form.to && <Card><Text>Predicted balances</Text><Text>{from.name}: {(homeBalances[from.key!] ?? 0) - Number(form.amount || 0)}</Text><Text>{to.name}: {(homeBalances[to.key!] ?? 0) + Number(form.amount || 0)}</Text></Card>}
    <Field label="Date" value={form.date} onChangeText={(date) => setForm({ ...form, date })} /><Field label="Description" value={form.description} onChangeText={(description) => setForm({ ...form, description })} /><Field label="Notes" value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} />
    <Button label="Save draft" variant="secondary" onPress={() => saveDraft({ id: draftId, kind: 'Transfer', updatedAt: Date.now(), values: form }).then(() => navigation.goBack())} /><Button label={online ? 'Save transfer' : 'Queue transfer'} onPress={save} /></Screen>;
}

export function RecoveryPickerScreen({ navigation }: any) {
  const [expenses, setExpenses] = useState<any[]>([]); const [error, setError] = useState('');
  useEffect(() => { api.expenses({ limit: 30 }).then(({ data }) => setExpenses(data.records.filter((item: any) => item.recoverySummary?.netAmount > 0))).catch((e) => setError(errorMessage(e))); }, []);
  if (error) return <Screen><StateView kind="error" message={error} /></Screen>;
  return <Screen><Title subtitle="Choose the original expense to preserve gross and net reporting.">Add recovery</Title>{expenses.length === 0 && <StateView kind="empty" message="No recoverable expenses found." />}{expenses.map((item) => <Button key={item._id} label={`${item.description || item.categoryId?.name} · remaining ${item.recoverySummary.netAmount}`} variant="secondary" onPress={() => navigation.navigate('RecoveryForm', { expense: item })} />)}</Screen>;
}

export function RecoveryFormScreen({ navigation, route }: any) {
  const { online } = useNetwork(); const { enqueue } = useSync(); const expense = route.params.expense; const remaining = expense.recoverySummary.netAmount;
  const [form, setForm] = useState<any>({ amount: String(remaining), date: today(), source: 'other', notes: '', budgetTreatment: 'reduce_expense', clientMutationId: `recovery-${expense._id}-${Date.now()}` });
  async function save() { if (!(Number(form.amount) > 0) || Number(form.amount) > remaining) return Alert.alert('Check recovery', `Amount cannot exceed ${remaining}.`); const payload = { ...form, amount: Number(form.amount), date: new Date(`${form.date}T12:00:00`).toISOString() }; try { online ? await api.addRecovery(expense._id, payload) : await enqueue(`recovery.create:${expense._id}`, payload); navigation.popToTop(); } catch (e) { Alert.alert('Could not save recovery', errorMessage(e)); } }
  async function remove(recoveryId: string) { try { await api.deleteRecovery(expense._id, recoveryId); navigation.goBack(); } catch (e) { Alert.alert('Could not delete recovery', errorMessage(e)); } }
  return <Screen><Title subtitle="Recoveries reduce net spending without changing the original gross expense.">Expense recovery</Title><Card><Text>Gross: {expense.amount}</Text><Text>Recovered: {expense.recoverySummary.recoveredAmount}</Text><Text>Net remaining: {remaining}</Text></Card>
    {!!expense.recoveries?.length && <Card><Text>Recorded recoveries</Text>{expense.recoveries.map((item: any) => <View key={item._id} style={{ gap: 6 }}><Text>{item.amount} · {item.source.replaceAll('_', ' ')}</Text><Button label="Delete recovery" variant="danger" onPress={() => Alert.alert('Delete recovery?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => remove(item._id) }])} /></View>)}</Card>}
    <AmountField value={form.amount} onChange={(amount) => setForm({ ...form, amount })} currency="" /><Field label="Date" value={form.date} onChangeText={(date) => setForm({ ...form, date })} /><Card><Text>Source</Text>{([['bank_reimbursement', 'Bank reimbursement'], ['family_transfer', 'Family transfer'], ['employer', 'Employer'], ['friend', 'Friend'], ['other', 'Other']] as const).map(([value, label]) => <Choice key={value} selected={form.source === value} label={label} onPress={() => setForm({ ...form, source: value })} />)}</Card><Field label="Reason or notes" value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} /><Button label={online ? 'Save recovery' : 'Queue recovery'} onPress={save} /></Screen>;
}

export function MessageImportScreen({ navigation }: any) {
  const [message, setMessage] = useState(''); const [result, setResult] = useState<any>(null); const [busy, setBusy] = useState(false);
  async function analyze() { setBusy(true); try { setResult((await api.importMessage(message)).data); } catch (e) { Alert.alert('Could not analyze message', errorMessage(e)); } finally { setBusy(false); } }
  function review() {
    const draft = result.draft;
    const preset = { amount: draft.amount, date: draft.transactionDate, description: draft.description, source: draft.merchant || draft.description, memberId: draft.memberId, categoryId: draft.categoryId, subCategoryId: draft.subCategoryId, paymentMethod: draft.accountType === 'credit_card' ? 'credit_card' : draft.accountType === 'savings' ? 'savings' : 'current_account', creditCardId: draft.accountType === 'credit_card' ? draft.accountId : '', savingsAccountId: draft.accountType === 'savings' ? draft.accountId : '' };
    navigation.navigate(draft.classification === 'income' ? 'IncomeForm' : 'ExpenseForm', { preset });
  }
  return <Screen><Title subtitle="Paste the complete bank notification. It is analyzed but not retained.">Import bank message</Title><Field label="Bank message" value={message} onChangeText={setMessage} multiline numberOfLines={8} />{result && <Card><Text>Suggested: {result.draft.classification}</Text><Text>{result.draft.description}</Text><Text>{result.draft.amount} {result.draft.currency}</Text><Button label="Review suggested record" onPress={review} /></Card>}<Button label={busy ? 'Analyzing…' : 'Analyze message'} disabled={busy || message.length < 8} onPress={analyze} /></Screen>;
}
