import { format } from 'date-fns';
import { BellRing, CheckCircle2, Clock3, CreditCard, Edit2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import DirhamSymbol from '../components/DirhamSymbol';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { creditCardsApi, fmt, savingsApi, subscriptionsApi } from '../services/api';

const PAYMENT_METHODS = [
  { value: 'current_account', label: 'Current Account' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'savings', label: 'Savings' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: format(new Date(2024, i, 1), 'MMMM'),
}));

const emptyForm = {
  name: '',
  memberId: '',
  amount: '',
  categoryId: '',
  subCategoryId: '',
  dayOfMonth: 1,
  paymentMethod: 'current_account',
  creditCardId: '',
  savingsAccountId: '',
  description: '',
  notes: '',
};

export default function Subscriptions() {
  const { members, categories } = useApp();
  const now = new Date();
  const [records, setRecords] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [savingsAccounts, setSavingsAccounts] = useState([]);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [wizardStep, setWizardStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [generatingId, setGeneratingId] = useState('');

  const subCategories = categories.find((c) => c._id === form.categoryId)?.subCategories || [];
  const totalMonthly = records.reduce((sum, record) => sum + (record.amount || 0), 0);
  const createdRecords = records.filter((record) => record.generatedExpenseId);
  const pendingRecords = records.filter((record) => !record.generatedExpenseId);
  const createdCount = createdRecords.length;
  const pendingCount = pendingRecords.length;
  const doneTotal = createdRecords.reduce((sum, record) => sum + (record.amount || 0), 0);
  const pendingTotal = pendingRecords.reduce((sum, record) => sum + (record.amount || 0), 0);
  const donePercent = totalMonthly > 0 ? Math.round((doneTotal / totalMonthly) * 100) : 0;

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: subs }, { data: cards }, { data: savings }] = await Promise.all([
        subscriptionsApi.getAll({ month, year }),
        creditCardsApi.getAll(),
        savingsApi.getAll(),
      ]);
      setRecords(subs);
      setCreditCards(cards);
      setSavingsAccounts(savings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month, year]);

  const openAdd = () => {
    const defaultCategory = categories[0];
    setEditing(null);
    setForm({ ...emptyForm, memberId: members[0]?._id || '', categoryId: defaultCategory?._id || '' });
    setWizardStep(0);
    setSaveError('');
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record._id);
    setForm({
      name: record.name || '',
      memberId: record.memberId?._id || '',
      amount: record.amount || '',
      categoryId: record.categoryId?._id || '',
      subCategoryId: record.subCategoryId?._id || '',
      dayOfMonth: record.dayOfMonth || 1,
      paymentMethod: record.paymentMethod || 'current_account',
      creditCardId: record.creditCardId?._id || '',
      savingsAccountId: record.savingsAccountId?._id || '',
      description: record.description || '',
      notes: record.notes || '',
    });
    setWizardStep(0);
    setSaveError('');
    setModalOpen(true);
  };

  const handlePaymentChange = (paymentMethod) => {
    setForm((prev) => ({
      ...prev,
      paymentMethod,
      creditCardId: paymentMethod === 'credit_card' ? creditCards[0]?._id || '' : '',
      savingsAccountId: paymentMethod === 'savings' ? savingsAccounts[0]?._id || '' : '',
    }));
  };

  const saveSubscription = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaveError('');
    const payload = { ...form };
    if (!payload.subCategoryId) delete payload.subCategoryId;
    if (payload.paymentMethod !== 'credit_card') delete payload.creditCardId;
    if (payload.paymentMethod !== 'savings') delete payload.savingsAccountId;
    try {
      if (editing) await subscriptionsApi.update(editing, payload);
      else await subscriptionsApi.create(payload);
      setModalOpen(false);
      await load();
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Failed to save recurring expense');
    } finally {
      setSaving(false);
    }
  };

  const deleteSubscription = async (record) => {
    if (!confirm(`Deactivate ${record.name}? Existing expenses will remain.`)) return;
    await subscriptionsApi.delete(record._id);
    await load();
  };

  const generateExpense = async (record) => {
    setGeneratingId(record._id);
    try {
      await subscriptionsApi.generate(record._id, { month, year });
      await load();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to create expense');
    } finally {
      setGeneratingId('');
    }
  };

  const generateAll = async () => {
    const pending = records.filter((record) => !record.generatedExpenseId);
    for (const record of pending) {
      await subscriptionsApi.generate(record._id, { month, year });
    }
    await load();
  };

  const needsRecurringAccount = form.paymentMethod === 'credit_card' || form.paymentMethod === 'savings';
  const recurringWizardSteps = [
    'Basics',
    'Category',
    'Schedule',
    ...(needsRecurringAccount ? [form.paymentMethod === 'credit_card' ? 'Card' : 'Account'] : []),
    'Details',
  ];
  const recurringStep = recurringWizardSteps[wizardStep] || 'Basics';
  const selectedMember = members.find((member) => member._id === form.memberId);
  const selectedCategory = categories.find((category) => category._id === form.categoryId);
  const selectedSubCategory = subCategories.find((subCategory) => subCategory._id === form.subCategoryId);
  const selectedCard = creditCards.find((card) => card._id === form.creditCardId);
  const selectedSavings = savingsAccounts.find((account) => account._id === form.savingsAccountId);
  const paymentLabel = PAYMENT_METHODS.find((method) => method.value === form.paymentMethod)?.label || form.paymentMethod;
  const recurringCanContinue = () => {
    if (recurringStep === 'Basics') return Boolean(form.name) && Number(form.amount) > 0;
    if (recurringStep === 'Category') return Boolean(form.memberId) && Boolean(form.categoryId);
    if (recurringStep === 'Schedule') return Boolean(form.dayOfMonth) && Boolean(form.paymentMethod);
    if (recurringStep === 'Card') return Boolean(form.creditCardId);
    if (recurringStep === 'Account') return Boolean(form.savingsAccountId);
    return true;
  };
  const optionClass = (selected) => (
    `w-full rounded-xl border px-3 py-3 text-left transition-colors ${
      selected ? 'border-indigo-200 bg-indigo-50 text-indigo-800' : 'border-slate-100 bg-white text-slate-700 hover:border-indigo-100 hover:bg-slate-50'
    }`
  );
  const renderRecurringWizardStep = () => {
    if (recurringStep === 'Basics') {
      return (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-800">What repeats every month?</p>
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. ChatGPT, Car Loan" />
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <label className="label">Amount</label>
            <div className="flex items-center gap-2">
              <DirhamSymbol className="h-7 w-auto text-slate-500" />
              <input type="number" className="input text-2xl font-bold" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="0.01" step="0.01" inputMode="decimal" />
            </div>
          </div>
        </div>
      );
    }
    if (recurringStep === 'Category') {
      return (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-800">Who and what category?</p>
          <div className="space-y-2">
            {members.map((member) => (
              <button key={member._id} type="button" className={optionClass(form.memberId === member._id)} onClick={() => setForm({ ...form, memberId: member._id })}>
                <span className="font-semibold">{member.name}</span>
              </button>
            ))}
          </div>
          <div className="grid max-h-[220px] grid-cols-1 gap-2 overflow-y-auto pr-1">
            {categories.map((category) => (
              <button key={category._id} type="button" className={optionClass(form.categoryId === category._id)} onClick={() => setForm({ ...form, categoryId: category._id, subCategoryId: '' })}>
                <span className="font-semibold">{category.name}</span>
              </button>
            ))}
          </div>
          {subCategories.length > 0 && (
            <select className="input" value={form.subCategoryId} onChange={(e) => setForm({ ...form, subCategoryId: e.target.value })}>
              <option value="">No sub-category</option>
              {subCategories.map((sub) => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
            </select>
          )}
        </div>
      );
    }
    if (recurringStep === 'Schedule') {
      return (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-800">When and how is it paid?</p>
          <div>
            <label className="label">Day of month</label>
            <input type="number" className="input" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })} required min="1" max="31" />
          </div>
          <div className="grid grid-cols-1 gap-2">
            {PAYMENT_METHODS.map((method) => (
              <button key={method.value} type="button" className={optionClass(form.paymentMethod === method.value)} onClick={() => handlePaymentChange(method.value)}>
                <span className="font-semibold">{method.label}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }
    if (recurringStep === 'Card') {
      return (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-800">Which card?</p>
          {creditCards.map((card) => (
            <button key={card._id} type="button" className={optionClass(form.creditCardId === card._id)} onClick={() => setForm({ ...form, creditCardId: card._id })}>
              <span className="font-semibold">{card.bankName} - {card.name}</span>
            </button>
          ))}
        </div>
      );
    }
    if (recurringStep === 'Account') {
      return (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-800">Which savings account?</p>
          {savingsAccounts.map((account) => (
            <button key={account._id} type="button" className={optionClass(form.savingsAccountId === account._id)} onClick={() => setForm({ ...form, savingsAccountId: account._id })}>
              <span className="font-semibold">{account.name}</span>
            </button>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-slate-800">Final details</p>
        <div>
          <label className="label">Description</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description used on generated expense" />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input resize-none" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
          <div className="flex justify-between gap-3 py-1"><span>Name</span><strong className="text-right text-slate-800">{form.name}</strong></div>
          <div className="flex justify-between gap-3 py-1"><span>Amount</span><strong className="text-slate-800"><DirhamSymbol className="h-[0.8em] w-auto inline align-middle mr-0.5" />{fmt(form.amount || 0)}</strong></div>
          <div className="flex justify-between gap-3 py-1"><span>Member</span><strong className="text-slate-800">{selectedMember?.name || '-'}</strong></div>
          <div className="flex justify-between gap-3 py-1"><span>Category</span><strong className="text-right text-slate-800">{selectedCategory?.name || '-'}</strong></div>
          <div className="flex justify-between gap-3 py-1"><span>Sub-category</span><strong className="text-right text-slate-800">{selectedSubCategory?.name || 'None'}</strong></div>
          <div className="flex justify-between gap-3 py-1"><span>Payment</span><strong className="text-right text-slate-800">{paymentLabel}</strong></div>
          {form.paymentMethod === 'credit_card' && <div className="flex justify-between gap-3 py-1"><span>Card</span><strong className="text-right text-slate-800">{selectedCard ? `${selectedCard.bankName} - ${selectedCard.name}` : '-'}</strong></div>}
          {form.paymentMethod === 'savings' && <div className="flex justify-between gap-3 py-1"><span>Account</span><strong className="text-right text-slate-800">{selectedSavings?.name || '-'}</strong></div>}
        </div>
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Recurring Expenses</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create monthly expenses from reusable templates</p>
        </div>
        <button onClick={openAdd} className="btn-primary w-full justify-center sm:w-auto">
          <Plus size={15} /> Add Recurring Expense
        </button>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-2 gap-3 lg:flex lg:flex-wrap lg:items-end">
          <div>
            <label className="label">Month</label>
            <select className="input w-full lg:w-36" value={month} onChange={(e) => setMonth(+e.target.value)}>
              {months.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <select className="input w-full lg:w-28" value={year} onChange={(e) => setYear(+e.target.value)}>
              {[2024, 2025, 2026, 2027, 2028].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="col-span-2 lg:col-span-1 lg:min-w-[180px]">
            <p className="text-xs text-slate-400">Expected monthly total</p>
            <p className="text-xl font-bold text-slate-800">
              <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(totalMonthly)}
            </p>
          </div>
          <div className="col-span-2 lg:min-w-[420px] lg:flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                  <CheckCircle2 size={13} />
                  <span>Expenses done</span>
                  <span className="ml-auto text-emerald-600">{createdCount}/{records.length}</span>
                </div>
                <p className="mt-1 text-lg font-bold text-emerald-800">
                  <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(doneTotal)}
                </p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-700">
                  <Clock3 size={13} />
                  <span>Expenses pending</span>
                  <span className="ml-auto text-amber-600">{pendingCount}/{records.length}</span>
                </div>
                <p className="mt-1 text-lg font-bold text-amber-800">
                  <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(pendingTotal)}
                </p>
              </div>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${donePercent}%` }} />
            </div>
          </div>
          <button className="btn-secondary col-span-2 justify-center lg:col-span-1" onClick={generateAll} disabled={records.length === 0 || createdCount === records.length}>
            Create Pending Expenses
          </button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="card text-center py-14">
          <BellRing size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="font-medium text-slate-500">No recurring expenses added yet</p>
          <button onClick={openAdd} className="btn-primary mt-4"><Plus size={15} /> Add Recurring Expense</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {records.map((record) => {
            const created = Boolean(record.generatedExpenseId);
            return (
              <div key={record._id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: record.categoryId?.color || '#6366f1' }} />
                      <p className="font-semibold text-slate-800 truncate">{record.name}</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Day {record.dayOfMonth} · {record.memberId?.name} · {record.categoryId?.name}
                      {record.subCategoryId ? ` / ${record.subCategoryId.name}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button onClick={() => openEdit(record)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={13} /></button>
                    <button onClick={() => deleteSubscription(record)} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-2xl font-bold text-rose-600">
                      <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(record.amount)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {record.paymentMethod === 'credit_card' ? `${record.creditCardId?.bankName || 'Credit Card'}` : record.paymentMethod.replace('_', ' ')}
                    </p>
                  </div>
                  {created ? (
                    <span className="badge bg-emerald-50 text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Created
                    </span>
                  ) : (
                    <button className="btn-primary justify-center py-2 px-3 sm:w-auto" onClick={() => generateExpense(record)} disabled={generatingId === record._id}>
                      {generatingId === record._id ? 'Creating...' : 'Create Expense'}
                    </button>
                  )}
                </div>

                {record.description && <p className="text-sm text-slate-500 mt-3 truncate">{record.description}</p>}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Recurring Expense' : 'Add Recurring Expense'} size="lg">
        <form onSubmit={saveSubscription} className="space-y-4">
          {saveError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{saveError}</p>}

          <div className="sm:hidden">
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                <span>Step {wizardStep + 1} of {recurringWizardSteps.length}</span>
                <span>{recurringWizardSteps[wizardStep]}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${((wizardStep + 1) / recurringWizardSteps.length) * 100}%` }} />
              </div>
            </div>
            {renderRecurringWizardStep()}
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={wizardStep === 0 ? () => setModalOpen(false) : () => setWizardStep((step) => Math.max(step - 1, 0))} className="btn-secondary flex-1">
                {wizardStep === 0 ? 'Cancel' : 'Back'}
              </button>
              {wizardStep === recurringWizardSteps.length - 1 ? (
                <button type="submit" className="btn-primary flex-1" disabled={saving || !recurringCanContinue()}>{saving ? 'Saving...' : editing ? 'Update' : 'Save'}</button>
              ) : (
                <button type="button" onClick={() => setWizardStep((step) => Math.min(step + 1, recurringWizardSteps.length - 1))} className="btn-primary flex-1" disabled={!recurringCanContinue()}>Next</button>
              )}
            </div>
          </div>

          <div className="hidden space-y-4 sm:block">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. ChatGPT, Car Loan" />
            </div>
            <div>
              <label className="label">Member *</label>
              <select className="input" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} required>
                <option value="">Select member</option>
                {members.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Category *</label>
              <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value, subCategoryId: '' })} required>
                <option value="">Select category</option>
                {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Sub-Category</label>
              <select className="input" value={form.subCategoryId} onChange={(e) => setForm({ ...form, subCategoryId: e.target.value })} disabled={!subCategories.length}>
                <option value="">None</option>
                {subCategories.map((sub) => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Amount *</label>
              <input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="0.01" step="0.01" />
            </div>
            <div>
              <label className="label">Day *</label>
              <input type="number" className="input" value={form.dayOfMonth} onChange={(e) => setForm({ ...form, dayOfMonth: e.target.value })} required min="1" max="31" />
            </div>
            <div>
              <label className="label">Payment</label>
              <select className="input" value={form.paymentMethod} onChange={(e) => handlePaymentChange(e.target.value)}>
                {PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
              </select>
            </div>
          </div>

          {form.paymentMethod === 'credit_card' && (
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 space-y-2">
              <label className="label text-violet-700">Credit Card *</label>
              <select className="input" value={form.creditCardId} onChange={(e) => setForm({ ...form, creditCardId: e.target.value })} required>
                <option value="">Select card</option>
                {creditCards.map((card) => (
                  <option key={card._id} value={card._id}>
                    {card.bankName} - {card.name}{card.lastFourDigits ? ` (${card.lastFourDigits})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.paymentMethod === 'savings' && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 space-y-2">
              <label className="label text-emerald-700">Savings Account *</label>
              <select className="input" value={form.savingsAccountId} onChange={(e) => setForm({ ...form, savingsAccountId: e.target.value })} required>
                <option value="">Select account</option>
                {savingsAccounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.name}{account.bankName ? ` - ${account.bankName}` : ''} ({account.memberId?.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Description</label>
            <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description used on generated expense" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Recurring Expense'}</button>
          </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
