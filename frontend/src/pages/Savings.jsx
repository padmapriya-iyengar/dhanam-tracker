import { Building2, Edit2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import DirhamSymbol from '../components/DirhamSymbol';
import { useApp } from '../context/AppContext';
import { fmt, savingsApi } from '../services/api';

const ACCOUNT_TYPES = [
  { value: 'savings', label: 'Savings Account' },
  { value: 'current', label: 'Current Account' },
  { value: 'fixed_deposit', label: 'Fixed Deposit' },
  { value: 'investment', label: 'Investment / Stocks' },
  { value: 'other', label: 'Other' },
];

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f97316', '#ec4899', '#f59e0b', '#8b5cf6', '#ef4444'];

const emptyForm = {
  name: '', bankName: '', accountType: 'savings',
  openingBalance: '', memberId: '', color: '#6366f1', notes: '',
};

export default function Savings() {
  const { members } = useApp();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = async () => {
    const { data } = await savingsApi.getAll();
    setAccounts(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, memberId: members[0]?._id || '' });
    setSaveError('');
    setModalOpen(true);
  };

  const openEdit = (acc) => {
    setEditing(acc._id);
    setForm({
      name: acc.name,
      bankName: acc.bankName || '',
      accountType: acc.accountType,
      openingBalance: acc.openingBalance ?? 0,
      memberId: acc.memberId._id,
      color: acc.color,
      notes: acc.notes || '',
    });
    setSaveError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      if (editing) await savingsApi.update(editing, form);
      else await savingsApi.create(form);
      setModalOpen(false);
      await load();
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this savings account?')) return;
    await savingsApi.delete(id);
    await load();
  };

  // Group by member
  const byMember = members.map((m) => ({
    member: m,
    accounts: accounts.filter((a) => a.memberId._id === m._id),
    total: accounts.filter((a) => a.memberId._id === m._id).reduce((s, a) => s + a.balance, 0),
  }));

  const grandTotal = accounts.reduce((s, a) => s + a.balance, 0);

  const typeLabel = Object.fromEntries(ACCOUNT_TYPES.map((t) => [t.value, t.label]));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Savings Accounts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track balances across all your bank accounts</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={15} /> Add Account
        </button>
      </div>

      {/* Grand Total */}
      {accounts.length > 0 && (
        <div className="card bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">Total Savings (All Accounts)</p>
          <p className="text-3xl font-bold mt-1"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(grandTotal)}</p>
          <p className="text-xs text-indigo-200 mt-1">{accounts.length} account{accounts.length !== 1 ? 's' : ''} across {members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Per-member sections */}
      {byMember.map(({ member, accounts: memberAccounts, total }) => (
        <div key={member._id} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: member.color }} />
              <h2 className="font-semibold text-slate-700">{member.name}</h2>
            </div>
            {memberAccounts.length > 0 && (
              <span className="text-sm font-semibold text-slate-500"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(total)}</span>
            )}
          </div>

          {memberAccounts.length === 0 ? (
            <div className="card border-dashed border-2 border-slate-200 text-center py-8">
              <Building2 size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No accounts added for {member.name}</p>
              <button
                onClick={() => {
                  setEditing(null);
                  setForm({ ...emptyForm, memberId: member._id });
                  setSaveError('');
                  setModalOpen(true);
                }}
                className="btn-secondary mt-3 mx-auto text-xs py-1.5"
              >
                <Plus size={13} /> Add Account
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {memberAccounts.map((acc) => (
                <div key={acc._id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: acc.color + '20' }}
                      >
                        <Building2 size={18} style={{ color: acc.color }} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{acc.name}</p>
                        {acc.bankName && <p className="text-xs text-slate-400">{acc.bankName}</p>}
                        <span className="badge bg-slate-100 text-slate-500 mt-1">{typeLabel[acc.accountType]}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => openEdit(acc)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(acc._id)} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-50">
                    <p className="text-2xl font-bold text-slate-800"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(acc.balance)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Opening <DirhamSymbol className="h-[0.75em] w-auto inline align-middle mr-0.5" />{fmt(acc.openingBalance || 0)}
                      {' '}· Calculated live
                    </p>
                  </div>

                  {acc.notes && <p className="text-xs text-slate-400 mt-2 italic">{acc.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {accounts.length === 0 && (
        <div className="card text-center py-14">
          <Building2 size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="font-medium text-slate-500">No savings accounts yet</p>
          <p className="text-sm text-slate-400 mt-1">Add your bank accounts to track balances in one place</p>
          <button onClick={openAdd} className="btn-primary mt-4">
            <Plus size={15} /> Add Account
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Account' : 'Add Savings Account'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {saveError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{saveError}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Account Name *</label>
              <input type="text" className="input" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required placeholder="e.g. HSBC Savings" />
            </div>
            <div>
              <label className="label">Bank Name</label>
              <input type="text" className="input" value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                placeholder="e.g. HSBC, Emirates NBD" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Account Type</label>
              <select className="input" value={form.accountType}
                onChange={(e) => setForm({ ...form, accountType: e.target.value })}>
                {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Owner *</label>
              <select className="input" value={form.memberId}
                onChange={(e) => setForm({ ...form, memberId: e.target.value })} required>
                <option value="">Select member</option>
                {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <div>
              <label className="label">Opening Balance (<DirhamSymbol className="h-[0.75em] w-auto inline align-middle" />) *</label>
            <input type="number" className="input" value={form.openingBalance}
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
              required placeholder="0" step="0.01" />
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-lg transition-transform ${form.color === c ? 'scale-110 ring-2 ring-offset-1 ring-slate-400' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <input type="text" className="input" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Emergency fund" />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
