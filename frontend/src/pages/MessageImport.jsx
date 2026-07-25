import { AlertTriangle, CheckCircle2, ClipboardPaste, Loader2, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { expensesApi, incomeApi, messageImportApi } from '../services/api';
import { useApp } from '../context/AppContext';

const formatDate = (value) => value ? value.slice(0, 10) : '';
const confidenceLabel = (value) => value >= .8 ? 'High confidence' : value >= .55 ? 'Review suggested' : 'Low confidence';

export default function MessageImport() {
  const { currentUser } = useApp();
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const options = result?.options;
  const category = options?.categories.find((item) => item.id === draft?.categoryId);
  const canCreate = draft && ['expense', 'income', 'refund'].includes(draft.classification) && draft.status === 'completed';
  const selectedAccount = options?.accounts.find((item) => item.id === draft?.accountId && item.type === draft?.accountType);
  const warnings = useMemo(() => {
    const rows = [...(draft?.warnings || [])];
    if (result?.duplicates?.length) rows.unshift(`Possible duplicate: ${result.duplicates.length} similar transaction${result.duplicates.length === 1 ? '' : 's'} already exist.`);
    return rows;
  }, [draft, result]);

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  async function analyze() {
    setAnalyzing(true); setError(''); setSuccess(''); setResult(null); setDraft(null);
    try {
      const { data } = await messageImportApi.analyze(message);
      setResult(data);
      setDraft({ ...data.draft, transactionDate: formatDate(data.draft.transactionDate) });
    } catch (next) {
      setError(next.response?.data?.error || 'The message could not be analyzed.');
    } finally { setAnalyzing(false); }
  }

  async function create() {
    setSaving(true); setError(''); setSuccess('');
    try {
      if (!draft.amount || !draft.transactionDate || !draft.memberId) throw new Error('Amount, date and member are required.');
      const baseCurrency = currentUser?.currency || 'AED';
      if (draft.currency !== baseCurrency) throw new Error(`Convert the amount and change its currency to ${baseCurrency} before saving.`);
      if (draft.classification === 'expense') {
        if (!draft.categoryId) throw new Error('Choose an expense category.');
        await expensesApi.create({
          memberId: draft.memberId, amount: Number(draft.amount), categoryId: draft.categoryId,
          subCategoryId: draft.subCategoryId || null, description: draft.description || draft.merchant,
          date: draft.transactionDate, paymentMethod: draft.accountType === 'credit_card' ? 'credit_card' : draft.accountType === 'savings' ? 'savings' : 'current_account',
          creditCardId: draft.accountType === 'credit_card' ? draft.accountId : null,
          savingsAccountId: draft.accountType === 'savings' ? draft.accountId : null,
          notes: 'Created from AI-assisted message import.',
        });
        await messageImportApi.feedback({
          merchant: draft.merchant,
          description: draft.description,
          categoryId: draft.categoryId,
          subCategoryId: draft.subCategoryId || null,
        }).catch(() => null);
      } else {
        await incomeApi.create({
          memberId: draft.memberId, amount: Number(draft.amount), source: draft.merchant || (draft.classification === 'refund' ? 'Refund' : 'Bank credit'),
          description: draft.description, date: draft.transactionDate,
          savingsAccountId: draft.accountType === 'savings' ? draft.accountId : null,
        });
      }
      setSuccess(`${draft.classification === 'expense' ? 'Expense created and category choice learned.' : 'Income created successfully.'}`);
      setResult(null); setDraft(null); setMessage('');
    } catch (next) {
      setError(next.response?.data?.error || next.message || 'Could not create the record.');
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">AI-assisted entry</p>
        <h1 className="text-2xl font-bold text-slate-800 mt-1">Import a bank message</h1>
        <p className="text-sm text-slate-500 mt-1">Paste a bank or card notification. Dhanam will prepare a draft; nothing is saved without your confirmation.</p>
      </div>

      <section className="bg-white border border-slate-100 rounded-xl shadow-sm p-4 sm:p-5">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Message</label>
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={7} maxLength={4000}
          placeholder="Paste the complete SMS or bank notification here…"
          className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 resize-y" />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">{message.length}/4000</span>
          <button onClick={analyze} disabled={analyzing || message.trim().length < 8}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {analyzing ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
            {analyzing ? 'Analyzing…' : 'Analyze message'}
          </button>
        </div>
      </section>

      {error && <div className="rounded-lg bg-rose-50 border border-rose-100 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700 flex gap-2"><CheckCircle2 size={18} />{success}</div>}

      {draft && (
        <section className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-slate-800">Review the suggested record</h2>
              <p className="text-xs text-slate-500 mt-1">AI classification: <span className="font-semibold capitalize">{draft.classification}</span> · {confidenceLabel(draft.confidence)} ({Math.round(draft.confidence * 100)}%)</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${draft.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{draft.status}</span>
          </div>

          {warnings.length > 0 && <div className="mx-4 sm:mx-5 mt-4 rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800 space-y-1">
            {warnings.map((warning) => <p key={warning} className="flex gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" />{warning}</p>)}
          </div>}

          <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Type"><select value={draft.classification} onChange={(e) => update('classification', e.target.value)} className="input"><option value="expense">Expense</option><option value="income">Income</option><option value="refund">Refund / recovery</option><option value="transfer">Transfer</option><option value="reminder">Reminder</option><option value="unknown">Unknown</option></select></Field>
            <Field label="Status"><select value={draft.status} onChange={(e) => update('status', e.target.value)} className="input"><option value="completed">Completed</option><option value="pending">Pending</option><option value="unknown">Unknown</option></select></Field>
            <Field label="Amount"><div className="flex gap-2"><input className="input flex-1" type="number" step="0.01" value={draft.amount || ''} onChange={(e) => update('amount', e.target.value)} /><input className="input w-24 uppercase" maxLength={3} value={draft.currency} onChange={(e) => update('currency', e.target.value.toUpperCase())} aria-label="Currency" /></div></Field>
            <Field label="Date"><input className="input" type="date" value={draft.transactionDate || ''} onChange={(e) => update('transactionDate', e.target.value)} /></Field>
            <Field label="Member"><select className="input" value={draft.memberId || ''} onChange={(e) => update('memberId', e.target.value)}><option value="">Select member</option>{options.members.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Account"><select className="input" value={selectedAccount ? `${selectedAccount.type}:${selectedAccount.id}` : ''} onChange={(e) => { const [accountType, accountId] = e.target.value.split(':'); setDraft((current) => ({ ...current, accountType: accountType || null, accountId: accountId || null })); }}><option value="">Select account</option>{options.accounts.map((item) => <option key={`${item.type}:${item.id}`} value={`${item.type}:${item.id}`}>{item.name}{item.lastFourDigits ? ` •••• ${item.lastFourDigits}` : ''}</option>)}</select></Field>
            {draft.classification === 'expense' && <Field label="Category"><select className="input" value={draft.categoryId || ''} onChange={(e) => setDraft((current) => ({ ...current, categoryId: e.target.value, subCategoryId: null }))}><option value="">Select category</option>{options.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>}
            {draft.classification === 'expense' && <Field label="Subcategory"><select className="input" value={draft.subCategoryId || ''} onChange={(e) => update('subCategoryId', e.target.value)}><option value="">None</option>{(category?.subcategories || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>}
            <div className="sm:col-span-2"><Field label="Description"><input className="input" value={draft.description || ''} onChange={(e) => update('description', e.target.value)} /></Field></div>
          </div>
          <div className="px-4 sm:px-5 pb-5">
            {!canCreate && <p className="text-xs text-amber-700 mb-3">Only completed expenses, income, and refunds can be created. Pending notices remain unsaved.</p>}
            <button onClick={create} disabled={!canCreate || saving} className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? <Loader2 size={17} className="animate-spin" /> : <ClipboardPaste size={17} />}{saving ? 'Creating…' : `Create ${draft.classification === 'expense' ? 'expense' : 'income'}`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</span>{children}</label>;
}
