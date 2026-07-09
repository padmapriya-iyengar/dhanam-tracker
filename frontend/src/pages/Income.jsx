import { format } from 'date-fns';
import { Building2, Edit2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import DirhamSymbol from '../components/DirhamSymbol';
import { useApp } from '../context/AppContext';
import { fmt, incomeApi, savingsApi } from '../services/api';

const SOURCES = ['Salary', 'Freelance', 'Business', 'Rental Income', 'Interest', 'Dividend', 'Gift', 'Other'];
const emptyForm = { memberId: '', amount: '', source: 'Salary', description: '', date: format(new Date(), 'yyyy-MM-dd'), savingsAccountId: '' };

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: format(new Date(2024, i, 1), 'MMMM'),
}));

export default function Income() {
  const { members } = useApp();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingsAccounts, setSavingsAccounts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const load = async () => {
    setLoading(true);
    const { data } = await incomeApi.getAll({ month: filterMonth, year: filterYear });
    setRecords(data.records);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterMonth, filterYear]);

  useEffect(() => {
    savingsApi.getAll().then(({ data }) => setSavingsAccounts(data));
  }, []);

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
      source: rec.source,
      description: rec.description || '',
      date: format(new Date(rec.date), 'yyyy-MM-dd'),
      savingsAccountId: rec.savingsAccountId?._id || '',
    });
    setSaveError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    const payload = { ...form, savingsAccountId: form.savingsAccountId || null };
    try {
      if (editing) await incomeApi.update(editing, payload);
      else await incomeApi.create(payload);
      setModalOpen(false);
      await load();
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this income record? If it was linked to a savings account, the balance will be reversed.')) return;
    await incomeApi.delete(id);
    await load();
  };

  const totalByMember = records.reduce((acc, r) => {
    const name = r.memberId?.name || 'Unknown';
    acc[name] = (acc[name] || 0) + r.amount;
    return acc;
  }, {});

  const selectedAccount = savingsAccounts.find((a) => a._id === form.savingsAccountId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title">Income</h1>
        <button onClick={openAdd} className="btn-primary w-full justify-center sm:w-auto">
          <Plus size={15} /> Add Income
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
        <div>
          <label htmlFor="inc-filter-month" className="label">Month</label>
          <select id="inc-filter-month" className="input w-full sm:w-36" value={filterMonth} onChange={(e) => setFilterMonth(+e.target.value)}>
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="inc-filter-year" className="label">Year</label>
          <select id="inc-filter-year" className="input w-full sm:w-28" value={filterYear} onChange={(e) => setFilterYear(+e.target.value)}>
            {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary */}
      {Object.keys(totalByMember).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card bg-emerald-50 border-emerald-100">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Total Income</p>
            <p className="text-xl font-bold text-emerald-700 mt-1"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(records.reduce((s, r) => s + r.amount, 0))}</p>
          </div>
          {Object.entries(totalByMember).map(([name, amt]) => (
            <div key={name} className="card">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{name}</p>
              <p className="text-xl font-bold text-slate-700 mt-1"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(amt)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <LoadingSpinner />
      ) : records.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-sm">No income records for this period.</p>
          <button onClick={openAdd} className="btn-primary mt-4"><Plus size={15} /> Add Income</button>
        </div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="md:hidden space-y-2">
            {records.map((rec) => (
              <div key={rec._id} className="card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: rec.memberId?.color }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-700">{rec.memberId?.name}</span>
                        <span className="badge bg-emerald-50 text-emerald-700 text-xs">{rec.source}</span>
                      </div>
                      {rec.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{rec.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => openEdit(rec)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={13} /></button>
                    <button onClick={() => handleDelete(rec._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                  <div className="text-xs text-slate-400 space-y-0.5">
                    <p>{format(new Date(rec.date), 'dd MMM yyyy')}</p>
                    {rec.savingsAccountId && (
                      <div className="flex items-center gap-1">
                        <Building2 size={10} />
                        <span>{rec.savingsAccountId.name}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-bold text-emerald-600"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(rec.amount)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block card p-0 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Date', 'Member', 'Source', 'Description', 'Account', 'Amount', ''].map((h) => (
                    <th key={h} className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{format(new Date(rec.date), 'dd MMM yyyy')}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: rec.memberId?.color }} />
                        <span className="text-slate-700 font-medium">{rec.memberId?.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="badge bg-emerald-50 text-emerald-700">{rec.source}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{rec.description || '—'}</td>
                    <td className="py-3 px-4">
                      {rec.savingsAccountId ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 size={13} className="text-slate-400" />
                          <span className="text-xs text-slate-600">{rec.savingsAccountId.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600 whitespace-nowrap"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(rec.amount)}</td>
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
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Income' : 'Add Income'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {saveError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{saveError}</p>}

          <div>
            <label htmlFor="inc-member" className="label">Member *</label>
            <select id="inc-member" className="input" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} required>
              <option value="">Select member</option>
              {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="inc-amount" className="label">Amount (<DirhamSymbol className="h-[0.75em] w-auto inline align-middle" />) *</label>
              <input id="inc-amount" type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="1" placeholder="0" />
            </div>
            <div>
              <label htmlFor="inc-date" className="label">Date *</label>
              <input id="inc-date" type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
          </div>

          <div>
            <label htmlFor="inc-source" className="label">Source *</label>
            <select id="inc-source" className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} required>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="inc-description" className="label">Description</label>
            <input id="inc-description" type="text" className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. June salary" />
          </div>

          {/* Optional savings account */}
          <div>
            <label htmlFor="inc-account" className="label">Savings Account <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
            <select id="inc-account" className="input" value={form.savingsAccountId} onChange={(e) => setForm({ ...form, savingsAccountId: e.target.value })}>
              <option value="">— None —</option>
              {savingsAccounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}{a.bankName ? ` — ${a.bankName}` : ''} ({a.memberId?.name})
                </option>
              ))}
            </select>
            {selectedAccount && (
              <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                <Building2 size={11} />
                <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(form.amount || 0)} will be added to <strong>{selectedAccount.name}</strong>&apos;s balance
              </p>
            )}
          </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Income'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
