import { CreditCard, Edit2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { creditCardsApi, fmt } from '../services/api';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f97316', '#ec4899', '#f59e0b', '#8b5cf6', '#ef4444'];
const MONTH_OPTIONS = [3, 6, 12];
const emptyForm = { name: '', bankName: '', memberId: '', lastFourDigits: '', color: '#6366f1' };

export default function CreditCards() {
  const { members } = useApp();
  const [summary, setSummary] = useState([]);
  const [monthly, setMonthly] = useState(null);
  const [monthCount, setMonthCount] = useState(6);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = async (months = monthCount) => {
    setLoading(true);
    const [s, m] = await Promise.all([
      creditCardsApi.getSummary(),
      creditCardsApi.getMonthly(months),
    ]);
    setSummary(s.data);
    setMonthly(m.data);
    setLoading(false);
  };

  useEffect(() => { load(monthCount); }, [monthCount]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, memberId: members[0]?._id || '' });
    setSaveError('');
    setModalOpen(true);
  };

  const openEdit = (card) => {
    setEditing(card._id);
    setForm({ name: card.name, bankName: card.bankName, memberId: card.memberId._id, lastFourDigits: card.lastFourDigits || '', color: card.color });
    setSaveError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      if (editing) await creditCardsApi.update(editing, form);
      else await creditCardsApi.create(form);
      setModalOpen(false);
      await load(monthCount);
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this credit card? Existing expenses will be preserved.')) return;
    await creditCardsApi.delete(id);
    await load(monthCount);
  };

  // Build chart data: one entry per month, one bar per card
  const chartData = monthly?.months.map((m, i) => {
    const entry = { label: m.label };
    monthly.cards.forEach((card) => {
      entry[`${card.bankName} — ${card.name}`] = card.monthlyTotals[i];
    });
    return entry;
  }) || [];

  // Grand total per month (for the table footer)
  const monthlyGrandTotals = monthly?.months.map((_, i) =>
    (monthly?.cards || []).reduce((s, c) => s + c.monthlyTotals[i], 0)
  ) || [];

  const grandTotal = summary.reduce((s, c) => s + c.totalThisMonth, 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Credit Cards</h1>
          <p className="text-sm text-slate-500 mt-0.5">Credit card expenses don&apos;t affect your account balance</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus size={15} /> Add Card</button>
      </div>

      {/* Current month totals per card */}
      {summary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {summary.map((card) => (
            <div key={card._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: card.color + '20' }}>
                    <CreditCard size={18} style={{ color: card.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{card.bankName}</p>
                    <p className="text-xs text-slate-500">{card.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: card.memberId?.color }} />
                      <span className="text-xs text-slate-400">{card.memberId?.name}</span>
                      {card.lastFourDigits && <span className="text-xs text-slate-400 font-mono">••••&nbsp;{card.lastFourDigits}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  <button onClick={() => openEdit(card)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={13} /></button>
                  <button onClick={() => handleDelete(card._id)} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400">This month</p>
                  <p className="text-lg font-bold text-violet-700">{fmt(card.totalThisMonth)}</p>
                  <p className="text-xs text-slate-400">{card.countThisMonth} txn{card.countThisMonth !== 1 ? 's' : ''}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">All time</p>
                  <p className="text-lg font-semibold text-slate-600">{fmt(card.totalAllTime)}</p>
                  <p className="text-xs text-slate-400">{card.countAllTime} txn{card.countAllTime !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {summary.length === 0 && (
        <div className="card text-center py-14">
          <CreditCard size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="font-medium text-slate-500">No credit cards added yet</p>
          <button onClick={openAdd} className="btn-primary mt-4"><Plus size={15} /> Add Card</button>
        </div>
      )}

      {/* Monthly breakdown section */}
      {summary.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Monthly Breakdown by Card</h2>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {MONTH_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMonthCount(m)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${monthCount === m ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {m}M
                </button>
              ))}
            </div>
          </div>

          {/* Stacked bar chart */}
          <div className="card">
            <h3 className="font-semibold text-slate-700 mb-4 text-sm">Spend per Card per Month</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `AED ${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {monthly?.cards.map((card, i) => (
                  <Bar
                    key={card._id}
                    dataKey={`${card.bankName} — ${card.name}`}
                    stackId="a"
                    fill={card.color || COLORS[i % COLORS.length]}
                    radius={i === (monthly.cards.length - 1) ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="card p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wide sticky left-0 bg-slate-50 min-w-[180px]">Card</th>
                  {monthly?.months.map((m) => (
                    <th key={m.label} className="text-right py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{m.label}</th>
                  ))}
                  <th className="text-right py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody>
                {monthly?.cards.map((card) => {
                  const rowTotal = card.monthlyTotals.reduce((s, v) => s + v, 0);
                  return (
                    <tr key={card._id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 px-4 sticky left-0 bg-white hover:bg-slate-50">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: card.color }} />
                          <div>
                            <p className="font-medium text-slate-700">{card.bankName}</p>
                            <p className="text-xs text-slate-400">{card.name}
                              {card.lastFourDigits && <span className="font-mono"> ••••&nbsp;{card.lastFourDigits}</span>}
                              {' · '}<span style={{ color: card.memberId?.color }}>{card.memberId?.name}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      {card.monthlyTotals.map((amt, i) => (
                        <td key={i} className="py-3 px-4 text-right">
                          {amt > 0 ? (
                            <span className="font-medium text-slate-700">{fmt(amt)}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right font-bold text-violet-700">{fmt(rowTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td className="py-3 px-4 font-bold text-slate-700 text-xs uppercase tracking-wide sticky left-0 bg-slate-50">Total</td>
                  {monthlyGrandTotals.map((t, i) => (
                    <td key={i} className="py-3 px-4 text-right font-bold text-slate-700">{t > 0 ? fmt(t) : '—'}</td>
                  ))}
                  <td className="py-3 px-4 text-right font-bold text-violet-700">
                    {fmt(monthlyGrandTotals.reduce((s, v) => s + v, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Credit Card' : 'Add Credit Card'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {saveError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{saveError}</p>}
          <div>
            <label htmlFor="cc-bank" className="label">Bank Name *</label>
            <input id="cc-bank" type="text" className="input" value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              required placeholder="e.g. HSBC, Emirates NBD, Mashreq" />
          </div>
          <div>
            <label htmlFor="cc-name" className="label">Card Name / Type *</label>
            <input id="cc-name" type="text" className="input" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required placeholder="e.g. Platinum Credit Card" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cc-member" className="label">Owner *</label>
              <select id="cc-member" className="input" value={form.memberId}
                onChange={(e) => setForm({ ...form, memberId: e.target.value })} required>
                <option value="">Select member</option>
                {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="cc-last4" className="label">Last 4 Digits</label>
              <input id="cc-last4" type="text" className="input" value={form.lastFourDigits}
                onChange={(e) => setForm({ ...form, lastFourDigits: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="1234" maxLength={4} />
            </div>
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-lg transition-transform ${form.color === c ? 'scale-110 ring-2 ring-offset-1 ring-slate-400' : ''}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Card'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
