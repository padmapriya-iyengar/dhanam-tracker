import { format } from 'date-fns';
import { CreditCard, Edit2, Filter, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { creditCardsApi, expensesApi, fmt } from '../services/api';

const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'netbanking', label: 'Net Banking' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_LABELS = { upi: 'UPI', debit_card: 'Debit Card', credit_card: 'Credit Card', cash: 'Cash', netbanking: 'Net Banking', other: 'Other', card: 'Card' };

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: format(new Date(2024, i, 1), 'MMMM'),
}));

const emptyForm = {
  memberId: '', amount: '', categoryId: '', subCategoryId: '',
  description: '', date: format(new Date(), 'yyyy-MM-dd'),
  paymentMethod: 'upi', creditCardId: '', notes: '',
};

export default function Expenses() {
  const { members, categories } = useApp();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMember, setFilterMember] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterCreditCard, setFilterCreditCard] = useState('');
  // All credit cards; filtered to member when adding expense
  const [allCreditCards, setAllCreditCards] = useState([]);

  const subCategories = categories.find((c) => c._id === form.categoryId)?.subCategories || [];

  const loadCreditCards = async () => {
    const { data } = await creditCardsApi.getAll();
    setAllCreditCards(data);
  };

  const load = async (p = 1) => {
    setLoading(true);
    const params = { month: filterMonth, year: filterYear, page: p, limit: 15 };
    if (filterMember) params.memberId = filterMember;
    if (filterCategory) params.categoryId = filterCategory;
    if (filterPayment) params.paymentMethod = filterPayment;
    if (filterPayment === 'credit_card' && filterCreditCard) params.creditCardId = filterCreditCard;
    const { data } = await expensesApi.getAll(params);
    setRecords(data.records);
    setTotal(data.total);
    setPages(data.pages);
    setPage(p);
    setLoading(false);
  };

  useEffect(() => { loadCreditCards(); }, []);
  useEffect(() => { load(1); }, [filterMonth, filterYear, filterMember, filterCategory, filterPayment, filterCreditCard]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, memberId: members[0]?._id || '' });
    setSaveError('');
    setModalOpen(true);
  };

  const openEdit = (rec) => {
    setEditing(rec._id);
    setForm({
      memberId: rec.memberId._id,
      amount: rec.amount,
      categoryId: rec.categoryId._id,
      subCategoryId: rec.subCategoryId?._id || '',
      description: rec.description || '',
      date: format(new Date(rec.date), 'yyyy-MM-dd'),
      paymentMethod: rec.paymentMethod,
      creditCardId: rec.creditCardId?._id || '',
      notes: rec.notes || '',
    });
    setSaveError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    const payload = { ...form };
    if (!payload.subCategoryId) delete payload.subCategoryId;
    if (payload.paymentMethod !== 'credit_card') delete payload.creditCardId;
    try {
      if (editing) await expensesApi.update(editing, payload);
      else await expensesApi.create(payload);
      setModalOpen(false);
      load(1);
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    await expensesApi.delete(id);
    load(page);
  };

  const handleMemberChange = (memberId) => {
    setForm((f) => ({ ...f, memberId, creditCardId: '' }));
  };

  const handlePaymentChange = (paymentMethod) => {
    setForm((f) => ({ ...f, paymentMethod, creditCardId: '' }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Expenses</h1>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={15} /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filters</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="filter-month" className="label">Month</label>
            <select id="filter-month" className="input w-36" value={filterMonth} onChange={(e) => setFilterMonth(+e.target.value)}>
              {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-year" className="label">Year</label>
            <select id="filter-year" className="input w-28" value={filterYear} onChange={(e) => setFilterYear(+e.target.value)}>
              {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-member" className="label">Member</label>
            <select id="filter-member" className="input w-36" value={filterMember} onChange={(e) => setFilterMember(e.target.value)}>
              <option value="">All Members</option>
              {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-category" className="label">Category</label>
            <select id="filter-category" className="input w-44" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-payment" className="label">Payment</label>
            <select id="filter-payment" className="input w-40" value={filterPayment}
              onChange={(e) => { setFilterPayment(e.target.value); setFilterCreditCard(''); }}>
              <option value="">All Methods</option>
              {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          {filterPayment === 'credit_card' && (
            <div>
              <label htmlFor="filter-credit-card" className="label">Credit Card</label>
              <select id="filter-credit-card" className="input w-48" value={filterCreditCard} onChange={(e) => setFilterCreditCard(e.target.value)}>
                <option value="">All Cards</option>
                {allCreditCards.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.bankName} — {c.name}{c.lastFourDigits ? ` ••••${c.lastFourDigits}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {!loading && records.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-slate-500">{total} expenses found</p>
          <p className="text-sm font-semibold text-rose-600">Total: {fmt(records.reduce((s, r) => s + r.amount, 0))}</p>
        </div>
      )}

      {loading && <LoadingSpinner />}
      {!loading && records.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-sm">No expenses found for this period.</p>
          <button onClick={openAdd} className="btn-primary mt-4"><Plus size={15} /> Add Expense</button>
        </div>
      )}
      {!loading && records.length > 0 && (
        <>
          <div className="card p-0 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Date', 'Member', 'Category', 'Description', 'Payment', 'Amount', ''].map((h) => (
                    <th key={h} className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{format(new Date(rec.date), 'dd MMM yyyy')}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: rec.memberId?.color }} />
                        <span className="text-slate-700">{rec.memberId?.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: rec.categoryId?.color }} />
                        <div>
                          <p className="text-slate-700 font-medium">{rec.categoryId?.name}</p>
                          {rec.subCategoryId && <p className="text-xs text-slate-400">{rec.subCategoryId.name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-[160px] truncate">{rec.description || '—'}</td>
                    <td className="py-3 px-4">
                      {rec.paymentMethod === 'credit_card' ? (
                        <div>
                          <span className="badge bg-violet-50 text-violet-700 flex items-center gap-1 w-fit">
                            <CreditCard size={10} /> {rec.creditCardId?.bankName || 'Credit Card'}
                          </span>
                          {rec.creditCardId?.name && <p className="text-xs text-slate-400 mt-0.5">{rec.creditCardId.name}</p>}
                        </div>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-600">{PAYMENT_LABELS[rec.paymentMethod] || rec.paymentMethod}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold whitespace-nowrap" style={{ color: rec.paymentMethod === 'credit_card' ? '#7c3aed' : '#f43f5e' }}>
                      {fmt(rec.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(rec)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(rec._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button className="btn-secondary py-1 px-3" disabled={page === 1} onClick={() => load(page - 1)}>← Prev</button>
              <span className="text-sm text-slate-500">Page {page} of {pages}</span>
              <button className="btn-secondary py-1 px-3" disabled={page === pages} onClick={() => load(page + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Expense' : 'Add Expense'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {saveError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{saveError}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="exp-member" className="label">Member *</label>
              <select id="exp-member" className="input" value={form.memberId} onChange={(e) => handleMemberChange(e.target.value)} required>
                <option value="">Select member</option>
                {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="exp-date" className="label">Date *</label>
              <input id="exp-date" type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="exp-category" className="label">Category *</label>
              <select id="exp-category" className="input" value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value, subCategoryId: '' })} required>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="exp-subcategory" className="label">Sub-Category</label>
              <select id="exp-subcategory" className="input" value={form.subCategoryId}
                onChange={(e) => setForm({ ...form, subCategoryId: e.target.value })} disabled={!subCategories.length}>
                <option value="">None</option>
                {subCategories.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="exp-amount" className="label">Amount (AED) *</label>
              <input id="exp-amount" type="number" className="input" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="0.01" step="0.01" placeholder="0" />
            </div>
            <div>
              <label htmlFor="exp-payment" className="label">Payment Method</label>
              <select id="exp-payment" className="input" value={form.paymentMethod} onChange={(e) => handlePaymentChange(e.target.value)}>
                {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Credit card selector — only when credit_card is selected */}
          {form.paymentMethod === 'credit_card' && (
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 space-y-2">
              <label htmlFor="exp-credit-card" className="label text-violet-700">Credit Card *</label>
              {allCreditCards.length === 0 ? (
                <p className="text-xs text-violet-500">
                  No credit cards found.{' '}
                  <a href="/credit-cards" className="underline font-medium">Add one on the Credit Cards page</a>.
                </p>
              ) : (
                <select id="exp-credit-card" className="input" value={form.creditCardId}
                  onChange={(e) => setForm({ ...form, creditCardId: e.target.value })} required>
                  <option value="">Select card</option>
                  {allCreditCards.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.bankName} — {c.name}{c.lastFourDigits ? ` (••••${c.lastFourDigits})` : ''}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-violet-400">Credit card expenses do not reduce your account balance.</p>
            </div>
          )}

          <div>
            <label htmlFor="exp-description" className="label">Description</label>
            <input id="exp-description" type="text" className="input" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Big Basket order" />
          </div>
          <div>
            <label htmlFor="exp-notes" className="label">Notes</label>
            <textarea id="exp-notes" className="input resize-none" rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes..." />
          </div>

          {(() => {
            const idleLabel = editing ? 'Update' : 'Add Expense';
            const submitLabel = saving ? 'Saving...' : idleLabel;
            return (
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{submitLabel}</button>
              </div>
            );
          })()}
        </form>
      </Modal>
    </div>
  );
}
