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
  const [wizardStep, setWizardStep] = useState(0);
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
    setWizardStep(0);
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
    setWizardStep(0);
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
  const selectedMember = members.find((member) => member._id === form.memberId);
  const savingsWizardSteps = ['Name', 'Type', 'Balance', 'Style', 'Review'];
  const savingsCanContinue = () => {
    if (wizardStep === 0) return Boolean(form.name);
    if (wizardStep === 1) return Boolean(form.accountType) && Boolean(form.memberId);
    if (wizardStep === 2) return form.openingBalance !== '';
    return true;
  };
  const optionClass = (selected) => (
    `w-full rounded-xl border px-3 py-3 text-left transition-colors ${
      selected ? 'border-indigo-200 bg-indigo-50 text-indigo-800' : 'border-slate-100 bg-white text-slate-700 hover:border-indigo-100 hover:bg-slate-50'
    }`
  );
  const renderSavingsWizardStep = () => {
    if (wizardStep === 0) {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">What account is this?</p>
            <p className="mt-1 text-xs text-slate-400">Start with the account name. Bank name is optional.</p>
          </div>
          <div>
            <label className="label">Account Name *</label>
            <input type="text" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. HSBC Savings" />
          </div>
          <div>
            <label className="label">Bank Name</label>
            <input type="text" className="input" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="e.g. HSBC, Emirates NBD" />
          </div>
        </div>
      );
    }
    if (wizardStep === 1) {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">Type and owner</p>
            <p className="mt-1 text-xs text-slate-400">Savings account and first member are selected by default.</p>
          </div>
          <div className="space-y-2">
            {ACCOUNT_TYPES.map((type) => (
              <button key={type.value} type="button" className={optionClass(form.accountType === type.value)} onClick={() => setForm({ ...form, accountType: type.value })}>
                <span className="font-semibold">{type.label}</span>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Owner</p>
            {members.map((member) => (
              <button key={member._id} type="button" className={optionClass(form.memberId === member._id)} onClick={() => setForm({ ...form, memberId: member._id })}>
                <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: member.color }} /><span className="font-semibold">{member.name}</span></span>
              </button>
            ))}
          </div>
        </div>
      );
    }
    if (wizardStep === 2) {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">Opening balance</p>
            <p className="mt-1 text-xs text-slate-400">Enter the starting balance for this account.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <label className="label">Opening Balance</label>
            <div className="flex items-center gap-2">
              <DirhamSymbol className="h-7 w-auto text-slate-500" />
              <input type="number" className="input text-2xl font-bold" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} required placeholder="0" step="0.01" inputMode="decimal" />
            </div>
          </div>
        </div>
      );
    }
    if (wizardStep === 3) {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">Color and notes</p>
            <p className="mt-1 text-xs text-slate-400">Use color to identify this account quickly.</p>
          </div>
          <div>
            <label className="label">Color</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button key={color} type="button" onClick={() => setForm({ ...form, color })} className={`h-8 w-8 rounded-xl transition-transform ${form.color === color ? 'scale-110 ring-2 ring-offset-1 ring-slate-400' : ''}`} style={{ background: color }} />
              ))}
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <input type="text" className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Emergency fund" />
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold text-slate-800">Review account</p>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
          <div className="flex justify-between gap-3 py-1"><span>Name</span><strong className="text-right text-slate-800">{form.name}</strong></div>
          <div className="flex justify-between gap-3 py-1"><span>Bank</span><strong className="text-right text-slate-800">{form.bankName || '-'}</strong></div>
          <div className="flex justify-between gap-3 py-1"><span>Type</span><strong className="text-right text-slate-800">{typeLabel[form.accountType]}</strong></div>
          <div className="flex justify-between gap-3 py-1"><span>Owner</span><strong className="text-right text-slate-800">{selectedMember?.name || '-'}</strong></div>
          <div className="flex justify-between gap-3 py-1"><span>Opening</span><strong className="text-right text-slate-800"><DirhamSymbol className="h-[0.8em] w-auto inline align-middle mr-0.5" />{fmt(form.openingBalance || 0)}</strong></div>
        </div>
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Savings Accounts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track balances across all your bank accounts</p>
        </div>
        <button onClick={openAdd} className="btn-primary w-full justify-center sm:w-auto">
          <Plus size={15} /> Add Account
        </button>
      </div>

      {/* Grand Total */}
      {accounts.length > 0 && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Total Savings</p>
          <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-2xl font-bold text-slate-800">
              <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(grandTotal)}
            </p>
            <p className="text-xs font-medium text-slate-500">
              {accounts.length} account{accounts.length !== 1 ? 's' : ''} across {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Per-member sections */}
      {byMember.map(({ member, accounts: memberAccounts, total }) => (
        <div key={member._id} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
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
                className="btn-secondary mt-3 mx-auto justify-center text-xs py-1.5"
              >
                <Plus size={13} /> Add Account
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {memberAccounts.map((acc) => (
                <div key={acc._id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: acc.color + '20' }}
                      >
                        <Building2 size={18} style={{ color: acc.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{acc.name}</p>
                        {acc.bankName && <p className="text-xs text-slate-400">{acc.bankName}</p>}
                        <span className="badge bg-slate-100 text-slate-500 mt-1">{typeLabel[acc.accountType]}</span>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-0.5">
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
          <button onClick={openAdd} className="btn-primary mt-4 w-full justify-center sm:w-auto">
            <Plus size={15} /> Add Account
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Account' : 'Add Savings Account'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {saveError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{saveError}</p>}

          <div className="sm:hidden">
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                <span>Step {wizardStep + 1} of {savingsWizardSteps.length}</span>
                <span>{savingsWizardSteps[wizardStep]}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${((wizardStep + 1) / savingsWizardSteps.length) * 100}%` }} />
              </div>
            </div>
            {renderSavingsWizardStep()}
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={wizardStep === 0 ? () => setModalOpen(false) : () => setWizardStep((step) => Math.max(step - 1, 0))} className="btn-secondary flex-1">
                {wizardStep === 0 ? 'Cancel' : 'Back'}
              </button>
              {wizardStep === savingsWizardSteps.length - 1 ? (
                <button type="submit" className="btn-primary flex-1" disabled={saving || !savingsCanContinue()}>{saving ? 'Saving...' : editing ? 'Update' : 'Save Account'}</button>
              ) : (
                <button type="button" onClick={() => setWizardStep((step) => Math.min(step + 1, savingsWizardSteps.length - 1))} className="btn-primary flex-1" disabled={!savingsCanContinue()}>Next</button>
              )}
            </div>
          </div>

          <div className="hidden space-y-4 sm:block">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Account'}
            </button>
          </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
