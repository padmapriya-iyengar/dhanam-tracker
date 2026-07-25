import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { apiErrorMessage, mobileApi } from '../api';
import { useData } from '../DataContext';
import { Button, Card, Choice, ErrorBox, Field, Option, Page, PageTitle, today } from '../components/MobileUI';
import { colors, typography } from '../theme';
import { useTheme } from '../ThemeContext';

type Kind = 'expense' | 'income' | 'transfer' | 'subscription';
const kinds: Option[] = [
  { value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' }, { value: 'subscription', label: 'Recurring' },
];
const payments: Option[] = [
  { value: 'current_account', label: 'Current' }, { value: 'credit_card', label: 'Credit card' },
  { value: 'savings', label: 'Savings' }, { value: 'cash', label: 'Cash' }, { value: 'other', label: 'Other' },
];
const accountType = (key: string) => key.split(':')[0];
const accountId = (key: string) => key.split(':')[1];

export function AddRecordScreen({ navigation }: any) {
  const { members, categories, cards, savings, accounts, refresh } = useData();
  const { colors: theme } = useTheme();
  const [kind, setKind] = useState<Kind>('expense');
  const [form, setForm] = useState<Record<string, string>>({ date: today(), paymentMethod: 'current_account', dayOfMonth: String(new Date().getDate()) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const set = (key: string, value: string) => setForm(old => ({ ...old, [key]: value }));
  const memberOptions = members.map(x => ({ value: x._id, label: x.name, color: x.color }));
  const categoryOptions = categories.map(x => ({ value: x._id, label: x.name, color: x.color }));
  const category = categories.find(x => x._id === form.categoryId);
  const subOptions = (category?.subCategories || []).map(x => ({ value: x._id, label: x.name }));
  const cardOptions = cards.map(x => ({ value: x._id, label: `${x.bankName} · ${x.name}`, color: x.color }));
  const savingsOptions = savings.map(x => ({ value: x._id, label: x.name, color: x.color }));
  const accountOptions = accounts.map(x => ({ value: x.key, label: x.name, color: x.color }));

  function reset(nextKind = kind) {
    setForm({ date: today(), paymentMethod: 'current_account', dayOfMonth: String(new Date().getDate()) });
    setKind(nextKind); setError(''); setSuccess('');
  }

  async function submit() {
    setSaving(true); setError(''); setSuccess('');
    try {
      if (kind === 'expense') {
        await mobileApi.create('/expenses', {
          memberId: form.memberId, amount: Number(form.amount), categoryId: form.categoryId,
          subCategoryId: form.subCategoryId || null, description: form.description, date: form.date,
          paymentMethod: form.paymentMethod, creditCardId: form.paymentMethod === 'credit_card' ? form.creditCardId : null,
          savingsAccountId: form.paymentMethod === 'savings' ? form.savingsAccountId : null, notes: form.notes,
        });
      } else if (kind === 'income') {
        await mobileApi.create('/income', { memberId: form.memberId, amount: Number(form.amount), source: form.source, description: form.description, date: form.date, savingsAccountId: form.savingsAccountId || null });
      } else if (kind === 'subscription') {
        await mobileApi.create('/subscriptions', {
          name: form.name, memberId: form.memberId, amount: Number(form.amount), categoryId: form.categoryId,
          subCategoryId: form.subCategoryId || null, dayOfMonth: Number(form.dayOfMonth), paymentMethod: form.paymentMethod,
          creditCardId: form.paymentMethod === 'credit_card' ? form.creditCardId : null,
          savingsAccountId: form.paymentMethod === 'savings' ? form.savingsAccountId : null, description: form.description, notes: form.notes,
        });
      } else {
        const fromType = accountType(form.fromAccount), toType = accountType(form.toAccount);
        await mobileApi.create('/transfers', {
          amount: Number(form.amount), date: form.date, description: form.description, notes: form.notes,
          fromAccountType: fromType, fromMemberId: fromType === 'current' ? accountId(form.fromAccount) : null,
          fromSavingsAccountId: fromType === 'savings' ? accountId(form.fromAccount) : null,
          fromCreditCardId: fromType === 'credit_card' ? accountId(form.fromAccount) : null,
          toAccountType: toType, toMemberId: toType === 'current' ? accountId(form.toAccount) : null,
          toSavingsAccountId: toType === 'savings' ? accountId(form.toAccount) : null,
          toCreditCardId: toType === 'credit_card' ? accountId(form.toAccount) : null,
        });
      }
      setSuccess(`${kinds.find(x => x.value === kind)?.label} saved successfully.`);
      await refresh(); reset(kind);
    } catch (next) { setError(apiErrorMessage(next)); }
    finally { setSaving(false); }
  }

  return <Page>
    <PageTitle title="Add" subtitle="Record a new financial activity" />
    <Choice label="What would you like to add?" value={kind} options={kinds} onChange={value => reset(value as Kind)} />
    <ErrorBox message={error} />
    {success ? <Text style={[styles.success, { color: theme.positive, backgroundColor: theme.positiveSoft }]}>{success}</Text> : null}
    <Card>
      {kind === 'subscription' ? <Field label="Recurring expense name" value={form.name} onChangeText={(v: string) => set('name', v)} placeholder="Netflix, rent, insurance…" /> : null}
      {kind !== 'transfer' ? <Choice label={kind === 'income' ? 'Who received it?' : 'Who paid?'} value={form.memberId || ''} options={memberOptions} onChange={v => set('memberId', v)} /> : null}
      <Field label="Amount" value={form.amount} onChangeText={(v: string) => set('amount', v)} placeholder="0" keyboardType="decimal-pad" />
      {kind === 'income' ? <Field label="Source" value={form.source} onChangeText={(v: string) => set('source', v)} placeholder="Salary, bonus, refund…" /> : null}
      {kind === 'expense' || kind === 'subscription' ? <>
        <Choice label="Category" value={form.categoryId || ''} options={categoryOptions} onChange={v => { set('categoryId', v); set('subCategoryId', ''); }} />
        {subOptions.length ? <Choice label="Sub-category (optional)" value={form.subCategoryId || ''} options={[{ value: '', label: 'None' }, ...subOptions]} onChange={v => set('subCategoryId', v)} /> : null}
        <Choice label="Payment method" value={form.paymentMethod} options={payments} onChange={v => set('paymentMethod', v)} />
        {form.paymentMethod === 'credit_card' ? <Choice label="Credit card" value={form.creditCardId || ''} options={cardOptions} onChange={v => set('creditCardId', v)} /> : null}
        {form.paymentMethod === 'savings' ? <Choice label="Savings account" value={form.savingsAccountId || ''} options={savingsOptions} onChange={v => set('savingsAccountId', v)} /> : null}
      </> : null}
      {kind === 'income' ? <Choice label="Deposit to savings (optional)" value={form.savingsAccountId || ''} options={[{ value: '', label: 'Current account' }, ...savingsOptions]} onChange={v => set('savingsAccountId', v)} /> : null}
      {kind === 'transfer' ? <>
        <Choice label="From account" value={form.fromAccount || ''} options={accountOptions} onChange={v => set('fromAccount', v)} />
        <Choice label="To account" value={form.toAccount || ''} options={accountOptions} onChange={v => set('toAccount', v)} />
      </> : null}
      {kind === 'subscription' ? <Field label="Day of month" value={form.dayOfMonth} onChangeText={(v: string) => set('dayOfMonth', v)} keyboardType="number-pad" /> : <Field label="Date (YYYY-MM-DD)" value={form.date} onChangeText={(v: string) => set('date', v)} />}
      <Field label="Description (optional)" value={form.description} onChangeText={(v: string) => set('description', v)} placeholder="Add context" />
      {kind !== 'income' ? <Field label="Notes (optional)" value={form.notes} onChangeText={(v: string) => set('notes', v)} multiline /> : null}
      <Button label={saving ? 'Saving…' : `Save ${kind}`} onPress={submit} disabled={saving} />
    </Card>
  </Page>;
}

const styles = StyleSheet.create({
  success: { ...typography, color: colors.positive, backgroundColor: colors.positiveSoft, borderRadius: 11, padding: 11, fontSize: 12, marginBottom: 12 },
});
