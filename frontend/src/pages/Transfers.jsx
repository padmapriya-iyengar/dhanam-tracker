import { format } from 'date-fns';
import { ArrowRight, ArrowRightLeft, Edit2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import DirhamSymbol from '../components/DirhamSymbol';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { creditCardsApi, fmt, savingsApi, transfersApi } from '../services/api';

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: format(new Date(2024, i, 1), 'MMMM'),
}));

const emptyForm = {
  amount: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  fromAccountType: 'current',
  fromMemberId: '',
  fromSavingsAccountId: '',
  fromCreditCardId: '',
  toAccountType: 'credit_card',
  toMemberId: '',
  toSavingsAccountId: '',
  toCreditCardId: '',
  description: 'Credit card payment',
  notes: '',
};

function accountLabel(account) {
  if (!account) return 'Unknown account';
  const suffix = account.lastFourDigits ? ` •••• ${account.lastFourDigits}` : '';
  return `${account.bankName ? `${account.bankName} - ` : ''}${account.name}${suffix}`;
}

function currentAccountLabel(member) {
  return member ? `${member.name} Current Account` : 'Unknown current account';
}

export default function Transfers() {
  const { members } = useApp();
  const [records, setRecords] = useState([]);
  const [savingsAccounts, setSavingsAccounts] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const loadAccounts = async () => {
    const [savings, cards] = await Promise.all([
      savingsApi.getAll(),
      creditCardsApi.getAll(),
    ]);
    setSavingsAccounts(savings.data);
    setCreditCards(cards.data);
  };

  const load = async () => {
    setLoading(true);
    const { data } = await transfersApi.getAll({ month: filterMonth, year: filterYear, limit: 100 });
    setRecords(data.records);
    setLoading(false);
  };

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { load(); }, [filterMonth, filterYear]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      fromMemberId: members[0]?._id || '',
      fromSavingsAccountId: savingsAccounts[0]?._id || '',
      toMemberId: members[1]?._id || members[0]?._id || '',
      toCreditCardId: creditCards[0]?._id || '',
    });
    setSaveError('');
    setModalOpen(true);
  };

  const openEdit = (transfer) => {
    setEditing(transfer._id);
    setForm({
      amount: transfer.amount,
      date: format(new Date(transfer.date), 'yyyy-MM-dd'),
      fromAccountType: transfer.fromAccountType,
      fromMemberId: transfer.fromMemberId?._id || '',
      fromSavingsAccountId: transfer.fromSavingsAccountId?._id || '',
      fromCreditCardId: transfer.fromCreditCardId?._id || '',
      toAccountType: transfer.toAccountType,
      toMemberId: transfer.toMemberId?._id || '',
      toSavingsAccountId: transfer.toSavingsAccountId?._id || '',
      toCreditCardId: transfer.toCreditCardId?._id || '',
      description: transfer.description || '',
      notes: transfer.notes || '',
    });
    setSaveError('');
    setModalOpen(true);
  };

  const handleAccountTypeChange = (side, value) => {
    setForm((current) => ({
      ...current,
      [`${side}AccountType`]: value,
      [`${side}MemberId`]: value === 'current' ? members[0]?._id || '' : '',
      [`${side}SavingsAccountId`]: value === 'savings' ? savingsAccounts[0]?._id || '' : '',
      [`${side}CreditCardId`]: value === 'credit_card' ? creditCards[0]?._id || '' : '',
    }));
  };

  const accountFor = (transfer, side) => (
    transfer[`${side}AccountType`] === 'current'
      ? transfer[`${side}MemberId`]
      : transfer[`${side}AccountType`] === 'savings'
        ? transfer[`${side}SavingsAccountId`]
        : transfer[`${side}CreditCardId`]
  );

  const transferAccountLabel = (transfer, side) => (
    transfer[`${side}AccountType`] === 'current'
      ? currentAccountLabel(accountFor(transfer, side))
      : accountLabel(accountFor(transfer, side))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const payload = { ...form };
      if (payload.fromAccountType !== 'current') delete payload.fromMemberId;
      if (payload.fromAccountType !== 'savings') delete payload.fromSavingsAccountId;
      if (payload.fromAccountType !== 'credit_card') delete payload.fromCreditCardId;
      if (payload.toAccountType !== 'current') delete payload.toMemberId;
      if (payload.toAccountType !== 'savings') delete payload.toSavingsAccountId;
      if (payload.toAccountType !== 'credit_card') delete payload.toCreditCardId;
      if (editing) await transfersApi.update(editing, payload);
      else await transfersApi.create(payload);
      setModalOpen(false);
      await Promise.all([load(), loadAccounts()]);
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Failed to save transfer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this transfer? Account balances will be reversed.')) return;
    await transfersApi.delete(id);
    await Promise.all([load(), loadAccounts()]);
  };

  const total = records.reduce((sum, transfer) => sum + transfer.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Transfers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Move money between accounts without changing income or expense reports</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={15} /> Add Transfer
        </button>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          <div>
            <label className="label">Month</label>
            <select className="input w-full sm:w-36" value={filterMonth} onChange={(e) => setFilterMonth(+e.target.value)}>
              {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <select className="input w-full sm:w-28" value={filterYear} onChange={(e) => setFilterYear(+e.target.value)}>
              {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {!loading && records.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-slate-500">{records.length} transfer{records.length !== 1 ? 's' : ''} found</p>
          <p className="text-sm font-semibold text-indigo-600">Total: <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(total)}</p>
        </div>
      )}

      {loading && <LoadingSpinner />}

      {!loading && records.length === 0 && (
        <div className="card text-center py-12">
          <ArrowRightLeft size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No transfers found for this period.</p>
          <button onClick={openAdd} className="btn-primary mt-4"><Plus size={15} /> Add Transfer</button>
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="card p-0 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Date', 'From', 'To', 'Description', 'Amount', ''].map((h) => (
                  <th key={h} className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((transfer) => (
                <tr key={transfer._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{format(new Date(transfer.date), 'dd MMM yyyy')}</td>
                  <td className="py-3 px-4">
                    <span className="badge bg-slate-100 text-slate-600">{transferAccountLabel(transfer, 'from')}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="badge bg-indigo-50 text-indigo-700">{transferAccountLabel(transfer, 'to')}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 max-w-[220px] truncate">{transfer.description || transfer.notes || '-'}</td>
                  <td className="py-3 px-4 font-semibold text-indigo-600 whitespace-nowrap">
                    <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(transfer.amount)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(transfer)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(transfer._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Transfer' : 'Add Transfer'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {saveError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{saveError}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div>
              <label className="label">Amount (<DirhamSymbol className="h-[0.75em] w-auto inline align-middle" />) *</label>
              <input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="0.01" step="0.01" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div className="rounded-xl border border-slate-100 p-3 space-y-3">
              <label className="label">From Account</label>
              <select className="input" value={form.fromAccountType} onChange={(e) => handleAccountTypeChange('from', e.target.value)}>
                <option value="current">Current Account</option>
                <option value="savings">Savings Account</option>
                <option value="credit_card">Credit Card</option>
              </select>
              {form.fromAccountType === 'current' ? (
                <select className="input" value={form.fromMemberId} onChange={(e) => setForm({ ...form, fromMemberId: e.target.value })} required>
                  <option value="">Select current account owner</option>
                  {members.map((member) => <option key={member._id} value={member._id}>{currentAccountLabel(member)}</option>)}
                </select>
              ) : form.fromAccountType === 'savings' ? (
                <select className="input" value={form.fromSavingsAccountId} onChange={(e) => setForm({ ...form, fromSavingsAccountId: e.target.value })} required>
                  <option value="">Select savings account</option>
                  {savingsAccounts.map((account) => <option key={account._id} value={account._id}>{accountLabel(account)}</option>)}
                </select>
              ) : (
                <select className="input" value={form.fromCreditCardId} onChange={(e) => setForm({ ...form, fromCreditCardId: e.target.value })} required>
                  <option value="">Select credit card</option>
                  {creditCards.map((card) => <option key={card._id} value={card._id}>{accountLabel(card)}</option>)}
                </select>
              )}
            </div>

            <div className="hidden md:flex h-full items-center justify-center pb-8">
              <ArrowRight size={20} className="text-slate-300" />
            </div>

            <div className="rounded-xl border border-indigo-100 p-3 space-y-3">
              <label className="label">To Account</label>
              <select className="input" value={form.toAccountType} onChange={(e) => handleAccountTypeChange('to', e.target.value)}>
                <option value="credit_card">Credit Card</option>
                <option value="current">Current Account</option>
                <option value="savings">Savings Account</option>
              </select>
              {form.toAccountType === 'current' ? (
                <select className="input" value={form.toMemberId} onChange={(e) => setForm({ ...form, toMemberId: e.target.value })} required>
                  <option value="">Select current account owner</option>
                  {members.map((member) => <option key={member._id} value={member._id}>{currentAccountLabel(member)}</option>)}
                </select>
              ) : form.toAccountType === 'savings' ? (
                <select className="input" value={form.toSavingsAccountId} onChange={(e) => setForm({ ...form, toSavingsAccountId: e.target.value })} required>
                  <option value="">Select savings account</option>
                  {savingsAccounts.map((account) => <option key={account._id} value={account._id}>{accountLabel(account)}</option>)}
                </select>
              ) : (
                <select className="input" value={form.toCreditCardId} onChange={(e) => setForm({ ...form, toCreditCardId: e.target.value })} required>
                  <option value="">Select credit card</option>
                  {creditCards.map((card) => <option key={card._id} value={card._id}>{accountLabel(card)}</option>)}
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <input type="text" className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Credit card payment" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Transfer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
