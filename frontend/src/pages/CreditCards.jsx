import { AlertTriangle, CalendarDays, CreditCard, Edit2, Plus, Save, Target, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import DirhamSymbol from '../components/DirhamSymbol';
import { useApp } from '../context/AppContext';
import { creditCardsApi, fmt } from '../services/api';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f97316', '#ec4899', '#f59e0b', '#8b5cf6', '#ef4444'];
const MONTH_OPTIONS = [3, 6, 12];
const emptyForm = {
  name: '', bankName: '', memberId: '', lastFourDigits: '',
  cycleStartDay: 15, cycleEndDay: 14, paymentDueDay: 5, color: '#6366f1',
};
const emptyStatementForm = {
  openingBalance: '', fees: '', interest: '', refunds: '', statementAmount: '', notes: '',
};
const emptyBudgetForm = { budgetAmount: '', notes: '' };
const budgetMonths = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: format(new Date(2024, i, 1), 'MMMM'),
}));

export default function CreditCards() {
  const { members } = useApp();
  const [summary, setSummary] = useState([]);
  const [monthly, setMonthly] = useState(null);
  const [monthCount, setMonthCount] = useState(6);
  const now = new Date();
  const [budgetMonth, setBudgetMonth] = useState(now.getMonth() + 1);
  const [budgetYear, setBudgetYear] = useState(now.getFullYear());
  const [budgets, setBudgets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [budgetForm, setBudgetForm] = useState(emptyBudgetForm);
  const [editing, setEditing] = useState(null);
  const [budgetCard, setBudgetCard] = useState(null);
  const [saving, setSaving] = useState(false);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [budgetError, setBudgetError] = useState('');
  const [cycles, setCycles] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [selectedCycleIndex, setSelectedCycleIndex] = useState(0);
  const [reconciliation, setReconciliation] = useState(null);
  const [statementForm, setStatementForm] = useState(emptyStatementForm);
  const [statementSaving, setStatementSaving] = useState(false);

  const loadBudgets = async (month = budgetMonth, year = budgetYear) => {
    const { data } = await creditCardsApi.getBudgets({ month, year });
    setBudgets(data);
  };

  const load = async (months = monthCount) => {
    setLoading(true);
    const [s, m, b] = await Promise.all([
      creditCardsApi.getSummary(),
      creditCardsApi.getMonthly(months),
      creditCardsApi.getBudgets({ month: budgetMonth, year: budgetYear }),
    ]);
    setSummary(s.data);
    setMonthly(m.data);
    setBudgets(b.data);
    if (!selectedCardId && s.data[0]?._id) setSelectedCardId(s.data[0]._id);
    setLoading(false);
  };

  useEffect(() => { load(monthCount); }, [monthCount]);
  useEffect(() => { loadBudgets(budgetMonth, budgetYear); }, [budgetMonth, budgetYear]);

  const loadCycles = async (cardId = selectedCardId) => {
    if (!cardId) return;
    setReconciliation(null);
    const { data } = await creditCardsApi.getCycles({ cardId, count: 8 });
    setCycles(data[0]?.cycles || []);
    setSelectedCycleIndex(0);
  };

  const loadReconciliation = async () => {
    const cycle = cycles[selectedCycleIndex];
    if (!selectedCardId || !cycle) return;
    const { data } = await creditCardsApi.getReconciliation({
      cardId: selectedCardId,
      cycleStart: cycle.cycleStart,
      cycleEnd: cycle.cycleEnd,
    });
    setReconciliation(data);
    setStatementForm({
      openingBalance: data.statement?.openingBalance ?? '',
      fees: data.statement?.fees ?? '',
      interest: data.statement?.interest ?? '',
      refunds: data.statement?.refunds ?? '',
      statementAmount: data.statement?.statementAmount ?? '',
      notes: data.statement?.notes || '',
    });
  };

  useEffect(() => { loadCycles(selectedCardId); }, [selectedCardId]);
  useEffect(() => { loadReconciliation(); }, [selectedCardId, selectedCycleIndex, cycles]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, memberId: members[0]?._id || '' });
    setSaveError('');
    setModalOpen(true);
  };

  const openEdit = (card) => {
    setEditing(card._id);
    setForm({
      name: card.name,
      bankName: card.bankName,
      memberId: card.memberId._id,
      lastFourDigits: card.lastFourDigits || '',
      cycleStartDay: card.cycleStartDay || ((card.cycleEndDay || card.statementDay || 14) === 31 ? 1 : (card.cycleEndDay || card.statementDay || 14) + 1),
      cycleEndDay: card.cycleEndDay || card.statementDay || 14,
      paymentDueDay: card.paymentDueDay || 5,
      color: card.color,
    });
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

  const openBudget = (card) => {
    setBudgetCard(card);
    setBudgetForm({
      budgetAmount: card.budgeted || '',
      notes: card.notes || '',
    });
    setBudgetError('');
    setBudgetModalOpen(true);
  };

  const saveBudget = async (event) => {
    event.preventDefault();
    if (!budgetCard) return;
    setBudgetSaving(true);
    setBudgetError('');
    try {
      await creditCardsApi.saveBudget(budgetCard._id, {
        ...budgetForm,
        month: budgetMonth,
        year: budgetYear,
      });
      setBudgetModalOpen(false);
      await loadBudgets(budgetMonth, budgetYear);
      await load(monthCount);
    } catch (err) {
      setBudgetError(err.response?.data?.error || err.message || 'Failed to save card budget');
    } finally {
      setBudgetSaving(false);
    }
  };

  const saveStatement = async (e) => {
    e.preventDefault();
    if (!reconciliation) return;
    setStatementSaving(true);
    try {
      await creditCardsApi.saveStatement({
        ...statementForm,
        creditCardId: selectedCardId,
        cycleStart: reconciliation.cycle.cycleStart,
        cycleEnd: reconciliation.cycle.cycleEnd,
      });
      await loadReconciliation();
    } finally {
      setStatementSaving(false);
    }
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
  const outstandingTotal = summary.reduce((s, c) => s + c.outstandingAllTime, 0);
  const selectedCycle = cycles[selectedCycleIndex];
  const reconciliationDifference = Math.abs(reconciliation?.difference || 0);
  const budgetRows = budgets?.rows || [];
  const budgetTotals = budgets?.totals || { budgeted: 0, spent: 0, paid: 0, balance: 0 };
  const budgetConsumed = budgetTotals.budgeted > 0 ? Math.round((budgetTotals.spent / budgetTotals.budgeted) * 100) : 0;
  const budgetStatusClass = (status) => {
    if (status === 'over') return 'bg-rose-50 text-rose-700 border-rose-100';
    if (status === 'watch') return 'bg-amber-50 text-amber-700 border-amber-100';
    if (status === 'ok') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    return 'bg-slate-50 text-slate-500 border-slate-100';
  };
  const budgetStatusLabel = (status) => {
    if (status === 'over') return 'Over budget';
    if (status === 'watch') return 'Near limit';
    if (status === 'ok') return 'On track';
    return 'No budget';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Credit Cards</h1>
          <p className="text-sm text-slate-500 mt-0.5">Credit card expenses don&apos;t affect your account balance</p>
        </div>
        <button onClick={openAdd} className="btn-primary w-full justify-center sm:w-auto"><Plus size={15} /> Add Card</button>
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
                    <p className="text-xs text-slate-400 mt-0.5">Cycle {card.cycleStartDay || ((card.cycleEndDay || card.statementDay || 14) === 31 ? 1 : (card.cycleEndDay || card.statementDay || 14) + 1)}-{card.cycleEndDay || card.statementDay || 14} · Due {card.paymentDueDay || 5}</p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  <button onClick={() => openEdit(card)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={13} /></button>
                  <button onClick={() => handleDelete(card._id)} className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-slate-400">Spend</p>
                  <p className="text-lg font-bold text-violet-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(card.totalThisMonth)}</p>
                  <p className="text-xs text-slate-400">{card.countThisMonth} txn{card.countThisMonth !== 1 ? 's' : ''}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Paid</p>
                  <p className="text-lg font-semibold text-emerald-600"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(card.paymentsAllTime || 0)}</p>
                  <p className="text-xs text-slate-400">Transfers</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Outstanding</p>
                  <p className="text-lg font-semibold text-slate-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(card.outstandingAllTime || 0)}</p>
                  <p className="text-xs text-slate-400">All time</p>
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

      {summary.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Target size={16} className="text-indigo-500" />
                <h2 className="font-semibold text-slate-700">Monthly Card Budgets</h2>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">Track selected-month credit card spend against each card&apos;s budget.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
              <div>
                <label htmlFor="cc-budget-month" className="label">Month</label>
                <select id="cc-budget-month" className="input w-full sm:w-36" value={budgetMonth} onChange={(e) => setBudgetMonth(+e.target.value)}>
                  {budgetMonths.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="cc-budget-year" className="label">Year</label>
                <select id="cc-budget-year" className="input w-full sm:w-28" value={budgetYear} onChange={(e) => setBudgetYear(+e.target.value)}>
                  {[2024, 2025, 2026, 2027, 2028].map((year) => <option key={year}>{year}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
              <p className="text-xs text-slate-400">Budgeted</p>
              <p className="text-xl font-bold text-slate-800"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(budgetTotals.budgeted)}</p>
            </div>
            <div className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-2">
              <p className="text-xs text-violet-500">Net Spent</p>
              <p className="text-xl font-bold text-violet-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(budgetTotals.spent)}</p>
            </div>
            <div className="rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2">
              <p className="text-xs text-cyan-600">Recovered</p>
              <p className="text-xl font-bold text-cyan-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(budgetTotals.recoveredAmount || 0)}</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
              <p className="text-xs text-emerald-600">Balance</p>
              <p className={`text-xl font-bold ${budgetTotals.balance < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(budgetTotals.balance)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
              <p className="text-xs text-slate-400">Consumed</p>
              <p className={`text-xl font-bold ${budgetConsumed > 100 ? 'text-rose-700' : 'text-slate-800'}`}>{budgetConsumed}%</p>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {budgetRows.map((card) => {
              const percentWidth = Math.min(card.consumedPercent || 0, 100);
              return (
                <div key={card._id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: card.color }} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{card.bankName}</p>
                        <p className="truncate text-xs text-slate-400">{card.name}{card.lastFourDigits ? ` **** ${card.lastFourDigits}` : ''}</p>
                      </div>
                    </div>
                    <span className={`badge flex-shrink-0 border ${budgetStatusClass(card.status)}`}>{budgetStatusLabel(card.status)}</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Budgeted</p>
                      <p className="mt-1 text-sm font-bold text-slate-800"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(card.budgeted)}</p>
                    </div>
                    <div className="rounded-lg bg-violet-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-500">Net Spent</p>
                      <p className="mt-1 text-sm font-bold text-violet-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(card.spent)}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{card.transactionCount} txn{card.transactionCount !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Paid So Far</p>
                      <p className="mt-1 text-sm font-bold text-emerald-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(card.paid)}</p>
                    </div>
                    <div className={`rounded-lg px-3 py-2 ${card.balance < 0 ? 'bg-rose-50' : 'bg-slate-50'}`}>
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${card.balance < 0 ? 'text-rose-500' : 'text-slate-400'}`}>Balance</p>
                      <p className={`mt-1 text-sm font-bold ${card.balance < 0 ? 'text-rose-700' : 'text-slate-800'}`}><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(card.balance)}</p>
                    </div>
                  </div>

                  {(card.recoveredAmount || 0) > 0 && (
                    <p className="mt-2 rounded-lg bg-cyan-50 px-3 py-2 text-xs font-medium text-cyan-700">
                      Gross <DirhamSymbol className="h-[0.75em] w-auto inline align-middle mr-0.5" />{fmt(card.grossSpent || 0)}
                      {' - '}recovered <DirhamSymbol className="h-[0.75em] w-auto inline align-middle mr-0.5" />{fmt(card.recoveredAmount)}
                    </p>
                  )}

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-500">Consumed</span>
                      <span className={`font-semibold ${card.consumedPercent > 100 ? 'text-rose-700' : 'text-slate-700'}`}>{card.consumedPercent}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${card.consumedPercent > 100 ? 'bg-rose-500' : card.consumedPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${percentWidth}%` }} />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-400">As of {format(new Date(card.asOf), 'dd MMM yyyy')}</p>
                    <button onClick={() => openBudget(card)} className="btn-secondary py-1.5 px-3 text-xs whitespace-nowrap">
                      {card.budgeted > 0 ? 'Edit Budget' : 'Set Budget'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block card p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Paid For', 'Date', 'Budgeted', 'Net Spent', 'Paid So Far', '% Consumed', 'Balance', 'Status', ''].map((header) => (
                    <th key={header} className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {budgetRows.map((card) => {
                  const percentWidth = Math.min(card.consumedPercent || 0, 100);
                  return (
                    <tr key={card._id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 px-4 min-w-[190px]">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: card.color }} />
                          <div>
                            <p className="font-medium text-slate-700">{card.bankName}</p>
                            <p className="text-xs text-slate-400">{card.name}{card.lastFourDigits ? ` **** ${card.lastFourDigits}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{format(new Date(card.asOf), 'dd MMM yyyy')}</td>
                      <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(card.budgeted)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-violet-700 whitespace-nowrap">
                        <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(card.spent)}
                        <p className="text-xs font-normal text-slate-400">{card.transactionCount} txn{card.transactionCount !== 1 ? 's' : ''}</p>
                        {(card.recoveredAmount || 0) > 0 && (
                          <p className="text-xs font-normal text-cyan-600">
                            Gross <DirhamSymbol className="h-[0.75em] w-auto inline align-middle mr-0.5" />{fmt(card.grossSpent || 0)}
                            {' - '}recovered <DirhamSymbol className="h-[0.75em] w-auto inline align-middle mr-0.5" />{fmt(card.recoveredAmount)}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-700 whitespace-nowrap">
                        <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(card.paid)}
                      </td>
                      <td className="py-3 px-4 min-w-[150px]">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-semibold ${card.consumedPercent > 100 ? 'text-rose-700' : 'text-slate-700'}`}>{card.consumedPercent}%</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${card.consumedPercent > 100 ? 'bg-rose-500' : card.consumedPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${percentWidth}%` }} />
                        </div>
                      </td>
                      <td className={`py-3 px-4 font-semibold whitespace-nowrap ${card.balance < 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                        <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(card.balance)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge border ${budgetStatusClass(card.status)}`}>{budgetStatusLabel(card.status)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => openBudget(card)} className="btn-secondary py-1.5 px-3 whitespace-nowrap">
                          {card.budgeted > 0 ? 'Edit Budget' : 'Set Budget'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly breakdown section */}
      {summary.length > 0 && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-700">Monthly Breakdown by Card</h2>
              <span className="text-sm font-semibold text-slate-500">Outstanding: <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(outstandingTotal)}</span>
            </div>
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
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
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
          <div className="md:hidden space-y-3">
            {monthly?.cards.map((card) => {
              const rowTotal = card.monthlyTotals.reduce((s, v) => s + v, 0);
              return (
                <div key={card._id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: card.color }} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{card.bankName}</p>
                        <p className="truncate text-xs text-slate-400">{card.name}
                          {card.lastFourDigits && <span className="font-mono"> **** {card.lastFourDigits}</span>}
                          {' · '}<span style={{ color: card.memberId?.color }}>{card.memberId?.name}</span>
                        </p>
                      </div>
                    </div>
                    <p className="flex-shrink-0 text-sm font-bold text-violet-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(rowTotal)}</p>
                  </div>

                  <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100">
                    {monthly?.months.map((month, index) => {
                      const amount = card.monthlyTotals[index] || 0;
                      return (
                        <div key={month.label} className="flex items-center justify-between gap-3 px-3 py-2">
                          <span className="text-xs font-medium text-slate-500">{month.label}</span>
                          <span className={`text-sm font-semibold ${amount > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                            {amount > 0 ? <><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(amount)}</> : '-'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">Total</p>
                <p className="text-sm font-bold text-violet-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(monthlyGrandTotals.reduce((s, v) => s + v, 0))}</p>
              </div>
            </div>
          </div>

          <div className="hidden md:block card p-0 overflow-x-auto">
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
                            <span className="font-medium text-slate-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(amt)}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right font-bold text-violet-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(rowTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td className="py-3 px-4 font-bold text-slate-700 text-xs uppercase tracking-wide sticky left-0 bg-slate-50">Total</td>
                  {monthlyGrandTotals.map((t, i) => (
                    <td key={i} className="py-3 px-4 text-right font-bold text-slate-700">{t > 0 ? <><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(t)}</> : '—'}</td>
                  ))}
                  <td className="py-3 px-4 text-right font-bold text-violet-700">
                    <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(monthlyGrandTotals.reduce((s, v) => s + v, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {summary.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-semibold text-slate-700">Credit Card Reconciliation</h2>
              <p className="text-sm text-slate-500">Compare each bank statement cycle with recorded card expenses.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 md:min-w-[520px]">
              <div>
                <label htmlFor="recon-card" className="label">Card</label>
                <select id="recon-card" className="input" value={selectedCardId} onChange={(e) => setSelectedCardId(e.target.value)}>
                  {summary.map((card) => (
                    <option key={card._id} value={card._id}>
                      {card.bankName} - {card.name}{card.lastFourDigits ? ` ${card.lastFourDigits}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="recon-cycle" className="label">Statement Period</label>
                <select id="recon-cycle" className="input" value={selectedCycleIndex} onChange={(e) => setSelectedCycleIndex(+e.target.value)}>
                  {cycles.map((cycle, index) => (
                    <option key={cycle.cycleStart} value={index}>{cycle.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {reconciliation && selectedCycle && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-3">
              <div className="card">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <CalendarDays size={15} />
                      <span>{reconciliation.cycle.label}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mt-1">
                      {reconciliation.card.bankName} - {reconciliation.card.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Due {format(new Date(reconciliation.cycle.dueDate), 'dd MMM yyyy')} · {reconciliation.count} recorded txn{reconciliation.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {reconciliationDifference > 0.5 && (
                    <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-sm">
                      <AlertTriangle size={15} />
                      Possible missing transactions
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">Recorded Purchases</p>
                    <p className="text-xl font-bold text-violet-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(reconciliation.purchases)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">Payments</p>
                    <p className="text-xl font-bold text-emerald-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(reconciliation.payments || 0)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">Calculated Closing</p>
                    <p className="text-xl font-bold text-slate-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(reconciliation.calculatedClosing)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-400">Statement Amount</p>
                    <p className="text-xl font-bold text-slate-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(reconciliation.statement.statementAmount || 0)}</p>
                  </div>
                  <div className={`rounded-lg p-3 ${reconciliationDifference > 0.5 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                    <p className="text-xs text-slate-500">Difference</p>
                    <p className={`text-xl font-bold ${reconciliationDifference > 0.5 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(reconciliation.difference)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 md:hidden space-y-2">
                  {(reconciliation.transactions || reconciliation.expenses).map((txn) => {
                    const isPayment = txn.type === 'payment';
                    return (
                      <div key={`${txn.type || 'expense'}-${txn._id}`} className="rounded-lg border border-slate-100 bg-white px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`badge ${isPayment ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'}`}>
                                {isPayment ? 'Payment' : 'Purchase'}
                              </span>
                              <span className="text-xs text-slate-400">{format(new Date(txn.date), 'dd MMM yyyy')}</span>
                            </div>
                            <p className="mt-2 truncate text-sm font-semibold text-slate-800">{txn.label || txn.categoryId?.name || 'Uncategorized'}</p>
                            <p className="mt-0.5 truncate text-xs text-slate-400">{txn.description || '-'}</p>
                          </div>
                          <p className={`flex-shrink-0 text-sm font-bold ${isPayment ? 'text-emerald-700' : 'text-violet-700'}`}>
                            {isPayment ? '-' : ''}
                            <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(txn.amount)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {(reconciliation.transactions || reconciliation.expenses).length === 0 && (
                    <div className="rounded-lg border border-slate-100 py-6 text-center text-sm text-slate-400">No recorded card transactions in this cycle.</div>
                  )}
                </div>

                <div className="mt-4 hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 font-semibold text-slate-500 text-xs uppercase">Date</th>
                        <th className="text-left py-2 font-semibold text-slate-500 text-xs uppercase">Type</th>
                        <th className="text-left py-2 font-semibold text-slate-500 text-xs uppercase">Category</th>
                        <th className="text-left py-2 font-semibold text-slate-500 text-xs uppercase">Description</th>
                        <th className="text-right py-2 font-semibold text-slate-500 text-xs uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reconciliation.transactions || reconciliation.expenses).map((txn) => {
                        const isPayment = txn.type === 'payment';
                        return (
                          <tr key={`${txn.type || 'expense'}-${txn._id}`} className="border-b border-slate-50">
                            <td className="py-2 text-slate-500 whitespace-nowrap">{format(new Date(txn.date), 'dd MMM yyyy')}</td>
                            <td className="py-2">
                              <span className={`badge ${isPayment ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'}`}>
                                {isPayment ? 'Payment' : 'Purchase'}
                              </span>
                            </td>
                            <td className="py-2 text-slate-700">{txn.label || txn.categoryId?.name || 'Uncategorized'}</td>
                            <td className="py-2 text-slate-500 max-w-[220px] truncate">{txn.description || '-'}</td>
                            <td className={`py-2 text-right font-semibold ${isPayment ? 'text-emerald-700' : 'text-violet-700'}`}>
                              {isPayment ? '-' : ''}
                              <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(txn.amount)}
                            </td>
                          </tr>
                        );
                      })}
                      {(reconciliation.transactions || reconciliation.expenses).length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-sm text-slate-400">No recorded card transactions in this cycle.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <form onSubmit={saveStatement} className="card space-y-3">
                <h3 className="font-semibold text-slate-700 text-sm">Statement Numbers</h3>
                {[
                  ['openingBalance', 'Opening Balance'],
                  ['fees', 'Fees'],
                  ['interest', 'Interest'],
                  ['refunds', 'Refunds'],
                  ['statementAmount', 'Closing / Statement Amount'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label htmlFor={`stmt-${key}`} className="label">{label}</label>
                    <input
                      id={`stmt-${key}`}
                      type="number"
                      className="input"
                      value={statementForm[key]}
                      onChange={(e) => setStatementForm({ ...statementForm, [key]: e.target.value })}
                      step="0.01"
                      placeholder="0"
                    />
                  </div>
                ))}
                <div>
                  <label htmlFor="stmt-notes" className="label">Notes</label>
                  <textarea
                    id="stmt-notes"
                    className="input resize-none"
                    rows={2}
                    value={statementForm.notes}
                    onChange={(e) => setStatementForm({ ...statementForm, notes: e.target.value })}
                  />
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  Opening + purchases + fees + interest - refunds - payments = calculated closing.
                </div>
                <button type="submit" className="btn-primary w-full justify-center" disabled={statementSaving}>
                  <Save size={15} /> {statementSaving ? 'Saving...' : 'Save Statement'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={budgetModalOpen} onClose={() => setBudgetModalOpen(false)} title="Set Card Budget" size="sm">
        <form onSubmit={saveBudget} className="space-y-4">
          {budgetError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{budgetError}</p>}
          {budgetCard && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-sm font-semibold text-slate-700">{budgetCard.bankName} - {budgetCard.name}</p>
              <p className="text-xs text-slate-400">
                {budgetMonths.find((month) => month.value === budgetMonth)?.label} {budgetYear}
                {' - '}Spent <DirhamSymbol className="h-[0.75em] w-auto inline align-middle mr-0.5" />{fmt(budgetCard.spent || 0)}
              </p>
            </div>
          )}
          <div>
            <label htmlFor="cc-budget-amount" className="label">Budget Amount *</label>
            <input
              id="cc-budget-amount"
              type="number"
              className="input"
              value={budgetForm.budgetAmount}
              onChange={(e) => setBudgetForm({ ...budgetForm, budgetAmount: e.target.value })}
              min="0"
              step="0.01"
              required
              placeholder="0"
            />
          </div>
          <div>
            <label htmlFor="cc-budget-notes" className="label">Notes</label>
            <textarea
              id="cc-budget-notes"
              className="input resize-none"
              rows={2}
              value={budgetForm.notes}
              onChange={(e) => setBudgetForm({ ...budgetForm, notes: e.target.value })}
              placeholder="Optional note for this month"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setBudgetModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={budgetSaving}>{budgetSaving ? 'Saving...' : 'Save Budget'}</button>
          </div>
        </form>
      </Modal>

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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cc-cycle-start-day" className="label">Cycle Start Day</label>
              <input id="cc-cycle-start-day" type="number" className="input" value={form.cycleStartDay}
                onChange={(e) => setForm({ ...form, cycleStartDay: e.target.value })}
                min={1} max={31} />
            </div>
            <div>
              <label htmlFor="cc-cycle-end-day" className="label">Cycle End Day</label>
              <input id="cc-cycle-end-day" type="number" className="input" value={form.cycleEndDay}
                onChange={(e) => setForm({ ...form, cycleEndDay: e.target.value })}
                min={1} max={31} />
            </div>
          </div>
          <div>
            <label htmlFor="cc-due-day" className="label">Payment Due Day</label>
            <input id="cc-due-day" type="number" className="input" value={form.paymentDueDay}
              onChange={(e) => setForm({ ...form, paymentDueDay: e.target.value })}
              min={1} max={31} />
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
