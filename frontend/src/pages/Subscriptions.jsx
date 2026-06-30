import { format } from 'date-fns';
import { BellRing, CheckCircle2, CreditCard, Edit2, Plus, Trash2 } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [generatingId, setGeneratingId] = useState('');

  const subCategories = categories.find((c) => c._id === form.categoryId)?.subCategories || [];
  const totalMonthly = records.reduce((sum, record) => sum + (record.amount || 0), 0);
  const createdCount = records.filter((record) => record.generatedExpenseId).length;

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
    setEditing(null);
    setForm({ ...emptyForm, memberId: members[0]?._id || '' });
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
    setSaveError('');
    setModalOpen(true);
  };

  const handlePaymentChange = (paymentMethod) => {
    setForm((prev) => ({ ...prev, paymentMethod, creditCardId: '', savingsAccountId: '' }));
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Recurring Expenses</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create monthly expenses from reusable templates</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={15} /> Add Recurring Expense
        </button>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Month</label>
            <select className="input w-36" value={month} onChange={(e) => setMonth(+e.target.value)}>
              {months.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <select className="input w-28" value={year} onChange={(e) => setYear(+e.target.value)}>
              {[2024, 2025, 2026, 2027, 2028].map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <p className="text-xs text-slate-400">Expected monthly total</p>
            <p className="text-xl font-bold text-slate-800">
              <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(totalMonthly)}
            </p>
          </div>
          <button className="btn-secondary" onClick={generateAll} disabled={records.length === 0 || createdCount === records.length}>
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

                <div className="mt-4 flex items-end justify-between gap-3">
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
                    <button className="btn-primary py-2 px-3" onClick={() => generateExpense(record)} disabled={generatingId === record._id}>
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

          <div className="grid grid-cols-2 gap-3">
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

          <div className="grid grid-cols-2 gap-3">
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

          <div className="grid grid-cols-3 gap-3">
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

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Recurring Expense'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
