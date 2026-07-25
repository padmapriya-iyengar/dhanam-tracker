import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react-native';
import { apiErrorMessage, MessageAnalysis, MessageDraft, mobileApi } from '../api';
import { useAuth } from '../AuthContext';
import { useData } from '../DataContext';
import { Button, Card, Choice, ErrorBox, Field, Page, PageTitle } from '../components/MobileUI';
import { typography } from '../theme';
import { useTheme } from '../ThemeContext';

const typeOptions = [
  { value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' },
  { value: 'refund', label: 'Refund' }, { value: 'transfer', label: 'Transfer' },
  { value: 'reminder', label: 'Reminder' }, { value: 'unknown', label: 'Unknown' },
];
const statusOptions = [
  { value: 'completed', label: 'Completed' }, { value: 'pending', label: 'Pending' }, { value: 'unknown', label: 'Unknown' },
];

export function MessageImportScreen() {
  const { user } = useAuth();
  const { refresh } = useData();
  const { colors } = useTheme();
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<MessageAnalysis | null>(null);
  const [draft, setDraft] = useState<MessageDraft | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const update = (key: keyof MessageDraft, value: any) => setDraft(current => current ? ({ ...current, [key]: value }) : current);
  const accountKey = draft?.accountType && draft.accountId ? `${draft.accountType}:${draft.accountId}` : '';
  const category = result?.options.categories.find(item => item.id === draft?.categoryId);
  const canCreate = Boolean(draft && ['expense', 'income', 'refund'].includes(draft.classification) && draft.status === 'completed');
  const warnings = useMemo(() => {
    const rows = [...(draft?.warnings || [])];
    if (result?.duplicates.length) rows.unshift(`Possible duplicate: ${result.duplicates.length} similar transaction${result.duplicates.length === 1 ? '' : 's'} found.`);
    return rows;
  }, [draft, result]);

  async function analyze() {
    setAnalyzing(true); setError(''); setSuccess(''); setResult(null); setDraft(null);
    try {
      const response = await mobileApi.analyzeMessage(message);
      setResult(response.data);
      setDraft({ ...response.data.draft, transactionDate: response.data.draft.transactionDate?.slice(0, 10) || null });
    } catch (next) { setError(apiErrorMessage(next)); }
    finally { setAnalyzing(false); }
  }

  async function create() {
    if (!draft) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      if (!draft.amount || !draft.transactionDate || !draft.memberId) throw new Error('Amount, date and member are required.');
      const baseCurrency = user?.currency || 'AED';
      if (draft.currency !== baseCurrency) throw new Error(`Convert and confirm the ${draft.currency} amount in ${baseCurrency} before saving.`);
      if (draft.classification === 'expense') {
        if (!draft.categoryId) throw new Error('Choose an expense category.');
        await mobileApi.create('/expenses', {
          memberId: draft.memberId, amount: Number(draft.amount), categoryId: draft.categoryId,
          subCategoryId: draft.subCategoryId || null, description: draft.description || draft.merchant,
          date: draft.transactionDate,
          paymentMethod: draft.accountType === 'credit_card' ? 'credit_card' : draft.accountType === 'savings' ? 'savings' : 'current_account',
          creditCardId: draft.accountType === 'credit_card' ? draft.accountId : null,
          savingsAccountId: draft.accountType === 'savings' ? draft.accountId : null,
          notes: 'Created from AI-assisted message import.',
        });
        await mobileApi.learnMessageCategory({
          merchant: draft.merchant,
          description: draft.description,
          categoryId: draft.categoryId,
          subCategoryId: draft.subCategoryId || null,
        }).catch(() => null);
      } else {
        await mobileApi.create('/income', {
          memberId: draft.memberId, amount: Number(draft.amount),
          source: draft.merchant || (draft.classification === 'refund' ? 'Refund' : 'Bank credit'),
          description: draft.description, date: draft.transactionDate,
          savingsAccountId: draft.accountType === 'savings' ? draft.accountId : null,
        });
      }
      await refresh();
      setSuccess(draft.classification === 'expense' ? 'Expense created and category choice learned.' : 'Income created successfully.');
      setMessage(''); setResult(null); setDraft(null);
    } catch (next) { setError(apiErrorMessage(next)); }
    finally { setSaving(false); }
  }

  return <Page>
    <PageTitle title="Import message" subtitle="Paste a bank alert and review the AI-generated draft" />
    <Card>
      <Field label="Bank or card message" value={message} onChangeText={setMessage} multiline placeholder="Paste the complete notification here…" />
      <Button label={analyzing ? 'Analyzing…' : 'Analyze message'} onPress={analyze} disabled={analyzing || message.trim().length < 8} />
    </Card>
    <ErrorBox message={error} />
    {success ? <View style={[styles.success, { backgroundColor: colors.positiveSoft }]}><CheckCircle2 size={16} color={colors.positive} /><Text style={[styles.noticeText, { color: colors.positive }]}>{success}</Text></View> : null}

    {draft && result ? <Card>
      <View style={styles.heading}>
        <View style={[styles.aiIcon, { backgroundColor: colors.primarySoft }]}><Sparkles size={17} color={colors.primary} /></View>
        <View style={{ flex: 1 }}><Text style={[styles.title, { color: colors.text }]}>Review suggestion</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{Math.round(draft.confidence * 100)}% confidence · Nothing saved yet</Text></View>
      </View>
      {warnings.map(warning => <View key={warning} style={[styles.warning, { backgroundColor: colors.amberSoft }]}><AlertTriangle size={14} color={colors.amber} /><Text style={[styles.noticeText, { color: colors.amber }]}>{warning}</Text></View>)}
      <Choice label="Type" value={draft.classification} options={typeOptions} onChange={value => update('classification', value)} />
      <Choice label="Status" value={draft.status} options={statusOptions} onChange={value => update('status', value)} />
      <Field label={`Amount (${draft.currency})`} value={draft.amount == null ? '' : String(draft.amount)} onChangeText={(value: string) => update('amount', Number(value) || null)} keyboardType="decimal-pad" />
      <Field label="Currency" value={draft.currency} onChangeText={(value: string) => update('currency', value.toUpperCase().slice(0, 3))} />
      <Field label="Date (YYYY-MM-DD)" value={draft.transactionDate || ''} onChangeText={(value: string) => update('transactionDate', value)} />
      <Choice label="Member" value={draft.memberId || ''} options={result.options.members.map(item => ({ value: item.id, label: item.name }))} onChange={value => update('memberId', value)} />
      <Choice label="Account" value={accountKey} options={[{ value: '', label: 'Not matched' }, ...result.options.accounts.map(item => ({ value: `${item.type}:${item.id}`, label: `${item.name}${item.lastFourDigits ? ` · ${item.lastFourDigits}` : ''}` }))]} onChange={value => { const [accountType, accountId] = value.split(':'); setDraft(current => current ? { ...current, accountType: (accountType || null) as any, accountId: accountId || null } : current); }} />
      {draft.classification === 'expense' ? <>
        <Choice label="Category" value={draft.categoryId || ''} options={result.options.categories.map(item => ({ value: item.id, label: item.name }))} onChange={value => setDraft(current => current ? { ...current, categoryId: value, subCategoryId: null } : current)} />
        {category?.subcategories.length ? <Choice label="Subcategory" value={draft.subCategoryId || ''} options={[{ value: '', label: 'None' }, ...category.subcategories.map(item => ({ value: item.id, label: item.name }))]} onChange={value => update('subCategoryId', value || null)} /> : null}
      </> : null}
      <Field label="Description" value={draft.description} onChangeText={(value: string) => update('description', value)} />
      {!canCreate ? <Text style={[styles.blocked, { color: colors.amber }]}>Only completed expenses, income and refunds can be created. Pending notices remain unsaved.</Text> : null}
      <Button label={saving ? 'Creating…' : `Create ${draft.classification === 'expense' ? 'expense' : 'income'}`} onPress={create} disabled={!canCreate || saving} />
    </Card> : null}
  </Page>;
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 13 },
  aiIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography, fontSize: 14, fontWeight: '800' },
  meta: { ...typography, fontSize: 9.5, marginTop: 2 },
  warning: { flexDirection: 'row', gap: 7, padding: 9, borderRadius: 9, marginBottom: 7, alignItems: 'flex-start' },
  success: { flexDirection: 'row', gap: 8, padding: 11, borderRadius: 10, marginBottom: 10 },
  noticeText: { ...typography, flex: 1, fontSize: 10.5, lineHeight: 15 },
  blocked: { ...typography, fontSize: 10.5, lineHeight: 15, marginBottom: 10 },
});
