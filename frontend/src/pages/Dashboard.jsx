import { format } from 'date-fns';
import { ArrowRight, Building2, CreditCard, Edit2, PiggyBank, Plus, ShoppingCart, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import { balanceApi, creditCardsApi, expensesApi, fmt, reportsApi, savingsApi } from '../services/api';

const COLORS = ['#6366f1', '#f97316', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

export default function Dashboard() {
  const now = new Date();
  const [report, setReport] = useState(null);
  const [trend, setTrend] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  // balances is an array, one entry per member
  const [balances, setBalances] = useState([]);
  const [ccSummary, setCcSummary] = useState([]);
  const [savingsAccounts, setSavingsAccounts] = useState([]);
  const [balanceModal, setBalanceModal] = useState(false);
  // balanceForms: { [memberId]: { openingBalance, notes } }
  const [balanceForms, setBalanceForms] = useState({});
  const [savingBalance, setSavingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState('');

  const loadBalance = async () => {
    const { data } = await balanceApi.get();
    setBalances(data);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [r, t, e, cc, sa] = await Promise.all([
          reportsApi.get({ period: 'monthly', month: now.getMonth() + 1, year: now.getFullYear() }),
          reportsApi.getTrend({ months: 6 }),
          expensesApi.getAll({ page: 1, limit: 8 }),
          creditCardsApi.getSummary(),
          savingsApi.getAll(),
          loadBalance(),
        ]);
        setReport(r.data);
        setTrend(t.data);
        setRecent(e.data.records);
        setCcSummary(cc.data);
        setSavingsAccounts(sa.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openBalanceEdit = () => {
    const forms = {};
    balances.forEach((b) => {
      forms[b.memberId] = { openingBalance: b.openingBalance, notes: b.notes };
    });
    setBalanceForms(forms);
    setBalanceError('');
    setBalanceModal(true);
  };

  const saveBalance = async (e) => {
    e.preventDefault();
    setSavingBalance(true);
    setBalanceError('');
    try {
      await Promise.all(
        Object.entries(balanceForms).map(([memberId, val]) =>
          balanceApi.update(memberId, {
            openingBalance: parseFloat(val.openingBalance) || 0,
            notes: val.notes,
          })
        )
      );
      await loadBalance();
      setBalanceModal(false);
    } catch (err) {
      setBalanceError(err.response?.data?.error || err.message || 'Failed to save');
    } finally {
      setSavingBalance(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const { summary, expenseByCategory } = report || {};
  const topCategories = expenseByCategory?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">{format(now, 'MMMM yyyy')} overview</p>
        </div>
        <div className="flex gap-2">
          <Link to="/income" className="btn-secondary">
            <TrendingUp size={15} /> Add Income
          </Link>
          <Link to="/expenses" className="btn-primary">
            <Plus size={15} /> Add Expense
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Income"
          value={fmt(summary?.totalIncome || 0)}
          icon={TrendingUp}
          color="green"
          change={summary?.incomeChange}
        />
        <StatCard
          title="Total Expenses"
          value={fmt(summary?.totalExpense || 0)}
          icon={ShoppingCart}
          color="red"
          change={summary?.expenseChange}
        />
        <StatCard
          title="Net Savings"
          value={fmt(summary?.savings || 0)}
          icon={Wallet}
          color={summary?.savings >= 0 ? 'green' : 'red'}
        />
        <StatCard
          title="Savings Rate"
          value={`${summary?.savingsRate || 0}%`}
          subtitle="of total income"
          icon={TrendingDown}
          color="indigo"
        />
      </div>

      {/* Balance Card — per member */}
      <div className="card border-indigo-100 bg-gradient-to-r from-indigo-50 to-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <PiggyBank size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Current Account</p>
              <p className="text-xs text-slate-400">as of {format(now, 'dd MMM yyyy')}</p>
            </div>
          </div>
          <button onClick={openBalanceEdit} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors" title="Edit opening balances">
            <Edit2 size={14} />
          </button>
        </div>

        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${balances.length}, 1fr)` }}>
          {balances.map((b) => (
            <div key={b.memberId} className="bg-white rounded-xl border border-indigo-100 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: b.memberColor }} />
                <span className="text-sm font-semibold text-slate-700">{b.memberName}</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xl font-bold text-indigo-700">{fmt(b.currentBalance)}</p>
                  <p className="text-xs text-slate-400">Current (today)</p>
                </div>
                <div className="flex gap-4 pt-1 border-t border-slate-50">
                  <div>
                    <p className="text-sm font-semibold text-slate-600">{fmt(b.balanceLastMonth)}</p>
                    <p className="text-xs text-slate-400">Carry-forward (last month)</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-400">{fmt(b.openingBalance)}</p>
                    <p className="text-xs text-slate-400">Opening</p>
                  </div>
                </div>
              </div>
              {b.notes && <p className="text-xs text-slate-400 mt-2 italic">{b.notes}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Savings Accounts Snapshot */}
      {savingsAccounts.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Building2 size={15} className="text-emerald-600" />
              </div>
              <p className="font-semibold text-slate-700 text-sm">Savings Accounts</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-emerald-700">
                {fmt(savingsAccounts.reduce((s, a) => s + a.balance, 0))}
              </span>
              <Link to="/savings" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
                View all <ArrowRight size={13} />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {savingsAccounts.map((acc) => (
              <div key={acc._id} className="rounded-xl border border-slate-100 p-3 hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: acc.color + '25' }}>
                    <Building2 size={12} style={{ color: acc.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{acc.name}</p>
                    {acc.bankName && <p className="text-xs text-slate-400 truncate">{acc.bankName}</p>}
                  </div>
                </div>
                <p className="text-base font-bold text-emerald-700">{fmt(acc.balance)}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: acc.memberId?.color }} />
                  <span className="text-xs text-slate-400">{acc.memberId?.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credit Card Snapshot */}
      {ccSummary.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
                <CreditCard size={15} className="text-violet-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-700 text-sm">Credit Card Spend — This Month</p>
                <p className="text-xs text-slate-400">Does not affect account balance</p>
              </div>
            </div>
            <Link to="/credit-cards" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
              View details <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {ccSummary.map((card) => (
              <div key={card._id} className="rounded-xl border border-slate-100 p-3 hover:border-violet-200 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: card.color + '25' }}>
                    <CreditCard size={12} style={{ color: card.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{card.bankName}</p>
                    <p className="text-xs text-slate-400 truncate">{card.name}</p>
                  </div>
                </div>
                <p className="text-base font-bold text-violet-700">{fmt(card.totalThisMonth)}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-slate-400">{card.countThisMonth} txn{card.countThisMonth !== 1 ? 's' : ''}</p>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: card.memberId?.color }} />
                    <span className="text-xs text-slate-400">{card.memberId?.name}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Grand total tile */}
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
              <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide mb-2">Total</p>
              <p className="text-base font-bold text-violet-700">
                {fmt(ccSummary.reduce((s, c) => s + c.totalThisMonth, 0))}
              </p>
              <p className="text-xs text-violet-400 mt-0.5">
                {ccSummary.reduce((s, c) => s + c.countThisMonth, 0)} transactions
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Trend Bar Chart */}
        <div className="card xl:col-span-3">
          <h3 className="font-semibold text-slate-700 mb-4">6-Month Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trend} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `AED ${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="savings" name="Savings" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="card xl:col-span-2">
          <h3 className="font-semibold text-slate-700 mb-4">Expenses by Category</h3>
          {topCategories.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={topCategories} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
                    {topCategories.map((_, i) => (
                      <Cell key={i} fill={topCategories[i]?.color || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {topCategories.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color || COLORS[i % COLORS.length] }} />
                      <span className="text-slate-600 truncate max-w-[100px]">{c.name}</span>
                    </div>
                    <span className="font-medium text-slate-700">{fmt(c.total)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-slate-400">No expenses this month</div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-700">Recent Expenses</h3>
          <Link to="/expenses" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
            View all <ArrowRight size={13} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            No expenses yet.{' '}
            <Link to="/expenses" className="text-indigo-600 hover:underline">
              Add your first expense
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((exp) => (
              <div key={exp._id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: exp.categoryId?.color || '#6366f1' }}
                  >
                    {exp.categoryId?.name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{exp.description || exp.categoryId?.name}</p>
                    <p className="text-xs text-slate-400">
                      {exp.memberId?.name} · {format(new Date(exp.date), 'dd MMM')}
                      {exp.subCategoryId && ` · ${exp.subCategoryId.name}`}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-rose-600">{fmt(exp.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Opening Balances Modal — one row per member */}
      <Modal isOpen={balanceModal} onClose={() => setBalanceModal(false)} title="Edit Opening Balances">
        <form onSubmit={saveBalance} className="space-y-5">
          {balanceError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{balanceError}</p>}
          <p className="text-xs text-slate-400">
            Enter the balance each person had before they started tracking in this app. Income and expenses recorded will be added/subtracted automatically.
          </p>
          {balances.map((b) => (
            <div key={b.memberId} className="border border-slate-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: b.memberColor }} />
                <span className="font-semibold text-slate-700 text-sm">{b.memberName}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Opening Balance (AED)</label>
                  <input
                    type="number"
                    className="input"
                    value={balanceForms[b.memberId]?.openingBalance ?? ''}
                    onChange={(e) =>
                      setBalanceForms((prev) => ({
                        ...prev,
                        [b.memberId]: { ...prev[b.memberId], openingBalance: e.target.value },
                      }))
                    }
                    placeholder="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="label">Notes (optional)</label>
                  <input
                    type="text"
                    className="input"
                    value={balanceForms[b.memberId]?.notes ?? ''}
                    onChange={(e) =>
                      setBalanceForms((prev) => ({
                        ...prev,
                        [b.memberId]: { ...prev[b.memberId], notes: e.target.value },
                      }))
                    }
                    placeholder="e.g. Savings as of Jan 2026"
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setBalanceModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={savingBalance}>
              {savingBalance ? 'Saving...' : 'Save All'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
