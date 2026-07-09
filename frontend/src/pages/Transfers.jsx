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
  const [wizardStep, setWizardStep] = useState(0);
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
    setWizardStep(0);
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
    setWizardStep(0);
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
  const transferWizardSteps = ['Amount', 'From', 'To', 'Details'];
  const accountTypeLabel = { current: 'Current Account', savings: 'Savings Account', credit_card: 'Credit Card' };
  const accountOptionsFor = (type) => {
    if (type === 'current') return members.map((member) => ({ id: member._id, label: currentAccountLabel(member), color: member.color }));
    if (type === 'savings') return savingsAccounts.map((account) => ({ id: account._id, label: accountLabel(account), color: account.color }));
    return creditCards.map((card) => ({ id: card._id, label: accountLabel(card), color: card.color }));
  };
  const selectedAccountIdFor = (side) => {
    const type = form[`${side}AccountType`];
    if (type === 'current') return form[`${side}MemberId`];
    if (type === 'savings') return form[`${side}SavingsAccountId`];
    return form[`${side}CreditCardId`];
  };
  const formAccountLabel = (side) => {
    const type = form[`${side}AccountType`];
    const id = selectedAccountIdFor(side);
    return accountOptionsFor(type).find((option) => option.id === id)?.label || 'Select account';
  };
  const setAccountForSide = (side, id) => {
    const type = form[`${side}AccountType`];
    setForm((current) => ({
      ...current,
      [`${side}MemberId`]: type === 'current' ? id : current[`${side}MemberId`],
      [`${side}SavingsAccountId`]: type === 'savings' ? id : current[`${side}SavingsAccountId`],
      [`${side}CreditCardId`]: type === 'credit_card' ? id : current[`${side}CreditCardId`],
    }));
  };
  const transferCanContinue = () => {
    if (wizardStep === 0) return Number(form.amount) > 0 && Boolean(form.date);
    if (wizardStep === 1) return Boolean(selectedAccountIdFor('from'));
    if (wizardStep === 2) return Boolean(selectedAccountIdFor('to'));
    return true;
  };
  const optionClass = (selected) => (
    `w-full rounded-xl border px-3 py-3 text-left transition-colors ${
      selected ? 'border-indigo-200 bg-indigo-50 text-indigo-800' : 'border-slate-100 bg-white text-slate-700 hover:border-indigo-100 hover:bg-slate-50'
    }`
  );
  const renderTransferAccountStep = (side) => {
    const type = form[`${side}AccountType`];
    const selectedId = selectedAccountIdFor(side);
    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">{side === 'from' ? 'Move money from where?' : 'Move money to where?'}</p>
          <p className="mt-1 text-xs text-slate-400">Choose account type, then the specific account.</p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {['current', 'savings', 'credit_card'].map((accountType) => (
            <button key={accountType} type="button" className={optionClass(type === accountType)} onClick={() => handleAccountTypeChange(side, accountType)}>
              <span className="font-semibold">{accountTypeLabel[accountType]}</span>
            </button>
          ))}
        </div>
        <div className="grid max-h-[260px] grid-cols-1 gap-2 overflow-y-auto pr-1">
          {accountOptionsFor(type).map((option) => (
            <button key={option.id} type="button" className={optionClass(selectedId === option.id)} onClick={() => setAccountForSide(side, option.id)}>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-indigo-500" style={{ background: option.color || '#6366f1' }} />
                <span className="font-semibold">{option.label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };
  const renderTransferWizardStep = () => {
    if (wizardStep === 0) {
      return (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-slate-800">How much was transferred?</p>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <label className="label">Amount</label>
            <div className="flex items-center gap-2">
              <DirhamSymbol className="h-7 w-auto text-slate-500" />
              <input type="number" className="input text-2xl font-bold" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="0.01" step="0.01" inputMode="decimal" />
            </div>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
        </div>
      );
    }
    if (wizardStep === 1) return renderTransferAccountStep('from');
    if (wizardStep === 2) return renderTransferAccountStep('to');
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-slate-800">Final details</p>
        <div>
          <label className="label">Description</label>
          <input type="text" className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Credit card payment" />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input resize-none" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
          <div className="flex justify-between gap-3 py-1"><span>Amount</span><strong className="text-slate-800"><DirhamSymbol className="h-[0.8em] w-auto inline align-middle mr-0.5" />{fmt(form.amount || 0)}</strong></div>
          <div className="flex justify-between gap-3 py-1"><span>From</span><strong className="text-right text-slate-800">{formAccountLabel('from')}</strong></div>
          <div className="flex justify-between gap-3 py-1"><span>To</span><strong className="text-right text-slate-800">{formAccountLabel('to')}</strong></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Transfers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Move money between accounts without changing income or expense reports</p>
        </div>
        <button onClick={openAdd} className="btn-primary w-full justify-center sm:w-auto">
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
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
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
        <>
        <div className="md:hidden space-y-3">
          {records.map((transfer) => (
            <div key={transfer._id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-400">{format(new Date(transfer.date), 'dd MMM yyyy')}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{transfer.description || transfer.notes || 'Transfer'}</p>
                </div>
                <p className="flex-shrink-0 text-base font-bold text-indigo-700">
                  <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(transfer.amount)}
                </p>
              </div>

              <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">From</p>
                  <p className="mt-1 truncate text-sm font-medium text-slate-700">{transferAccountLabel(transfer, 'from')}</p>
                </div>
                <div className="my-2 flex justify-center">
                  <ArrowRight size={16} className="text-slate-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-400">To</p>
                  <p className="mt-1 truncate text-sm font-medium text-indigo-700">{transferAccountLabel(transfer, 'to')}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <button onClick={() => openEdit(transfer)} className="btn-secondary py-1.5 px-3 text-xs">
                  <Edit2 size={13} /> Edit
                </button>
                <button onClick={() => handleDelete(transfer._id)} className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-100">
                  <Trash2 size={13} className="inline align-text-bottom mr-1" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block card p-0 overflow-hidden overflow-x-auto">
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
        </>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Transfer' : 'Add Transfer'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {saveError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{saveError}</p>}

          <div className="md:hidden">
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                <span>Step {wizardStep + 1} of {transferWizardSteps.length}</span>
                <span>{transferWizardSteps[wizardStep]}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${((wizardStep + 1) / transferWizardSteps.length) * 100}%` }} />
              </div>
            </div>
            {renderTransferWizardStep()}
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={wizardStep === 0 ? () => setModalOpen(false) : () => setWizardStep((step) => Math.max(step - 1, 0))} className="btn-secondary flex-1">
                {wizardStep === 0 ? 'Cancel' : 'Back'}
              </button>
              {wizardStep === transferWizardSteps.length - 1 ? (
                <button type="submit" className="btn-primary flex-1" disabled={saving || !transferCanContinue()}>{saving ? 'Saving...' : editing ? 'Update' : 'Save Transfer'}</button>
              ) : (
                <button type="button" onClick={() => setWizardStep((step) => Math.min(step + 1, transferWizardSteps.length - 1))} className="btn-primary flex-1" disabled={!transferCanContinue()}>Next</button>
              )}
            </div>
          </div>

          <div className="hidden space-y-4 md:block">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>
        </form>
      </Modal>
    </div>
  );
}
