import { format } from 'date-fns';
import {
  ArrowLeft, ArrowRight, CalendarDays, CreditCard, Edit2, RefreshCw,
  Scale, TrendingDown, TrendingUp, Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CategoryGoalsWidget from '../components/CategoryGoalsWidget';
import DirhamSymbol from '../components/DirhamSymbol';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { balanceApi, creditCardsApi, fmt, reportsApi, savingsApi } from '../services/api';

const budgetMonths = Array.from({ length: 12 }, (_, index) => ({
  value: index + 1,
  label: format(new Date(2026, index, 1), 'MMMM'),
}));

const years = [2024, 2025, 2026, 2027, 2028];

function Money({ value, className = '' }) {
  return (
    <span className={className}>
      <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />
      {fmt(value || 0)}
    </span>
  );
}

function statusClass(status) {
  if (status === 'over') return 'bg-rose-50 text-rose-600 border-rose-100';
  if (status === 'watch') return 'bg-amber-50 text-amber-600 border-amber-100';
  if (status === 'ok') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  return 'bg-slate-50 text-slate-500 border-slate-100';
}

function statusLabel(status) {
  if (status === 'over') return 'Over';
  if (status === 'watch') return 'Watch';
  if (status === 'ok') return 'On track';
  return 'Unset';
}

function monthDate(month, year) {
  return new Date(year, month - 1, 1);
}

export default function Dashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState(null);
  const [budgets, setBudgets] = useState(null);
  const [balances, setBalances] = useState([]);
  const [savingsAccounts, setSavingsAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balanceModal, setBalanceModal] = useState(false);
  const [balanceForms, setBalanceForms] = useState({});
  const [savingBalance, setSavingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState('');

  const selectedDate = useMemo(() => monthDate(month, year), [month, year]);
  const selectedLabel = format(selectedDate, 'MMMM yyyy');

  const loadBalance = async (params = { month, year }) => {
    const { data } = await balanceApi.get(params);
    setBalances(data);
  };

  const loadDashboard = async (nextMonth = month, nextYear = year) => {
    setLoading(true);
    try {
      const params = { month: nextMonth, year: nextYear };
      const [reportResult, budgetResult, savingsResult] = await Promise.all([
        reportsApi.get({ period: 'monthly', ...params }),
        creditCardsApi.getBudgets(params),
        savingsApi.getAll(params),
        loadBalance(params),
      ]);
      setReport(reportResult.data);
      setBudgets(budgetResult.data);
      setSavingsAccounts(savingsResult.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(month, year);
  }, [month, year]);

  const shiftMonth = (delta) => {
    const next = new Date(year, month - 1 + delta, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  };

  const openBalanceEdit = () => {
    const forms = {};
    balances.forEach((balance) => {
      forms[balance.memberId] = { openingBalance: balance.openingBalance, notes: balance.notes };
    });
    setBalanceForms(forms);
    setBalanceError('');
    setBalanceModal(true);
  };

  const saveBalance = async (event) => {
    event.preventDefault();
    setSavingBalance(true);
    setBalanceError('');
    try {
      await Promise.all(
        Object.entries(balanceForms).map(([memberId, value]) =>
          balanceApi.update(memberId, {
            openingBalance: parseFloat(value.openingBalance) || 0,
            notes: value.notes,
          })
        )
      );
      await loadBalance({ month, year });
      setBalanceModal(false);
    } catch (err) {
      setBalanceError(err.response?.data?.error || err.message || 'Failed to save');
    } finally {
      setSavingBalance(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const summary = report?.summary || {};
  const budgetRows = budgets?.rows || [];
  const budgetTotals = budgets?.totals || { budgeted: 0, spent: 0, recoveredAmount: 0, paid: 0, balance: 0 };
  const expenseByCategory = report?.expenseByCategory || [];
  const totalCurrentBalance = balances.reduce((sum, balance) => sum + (balance.currentBalance || 0), 0);
  const totalSavingsBalance = savingsAccounts.reduce((sum, account) => sum + (account.balance || 0), 0);
  const availableFunds = totalCurrentBalance + totalSavingsBalance;
  const monthResult = (summary.totalIncome || 0) - (summary.totalExpense || 0);
  const budgetConsumed = budgetTotals.budgeted > 0 ? Math.round((budgetTotals.spent / budgetTotals.budgeted) * 100) : 0;

  const realityRows = [
    {
      label: 'Income recorded',
      value: summary.totalIncome || 0,
      detail: 'Income entered for the selected month.',
      tone: 'text-emerald-700',
    },
    {
      label: 'Net expenses',
      value: summary.totalExpense || 0,
      detail: 'Expenses after recoveries. Credit-card purchases are included here.',
      tone: 'text-rose-700',
    },
    {
      label: 'Card payments logged',
      value: budgetTotals.paid || 0,
      detail: 'Transfers paid to credit cards this month. Shown separately so spend is not double-counted.',
      tone: 'text-slate-700',
    },
    {
      label: 'Monthly result',
      value: monthResult,
      detail: 'Income minus net expenses for this month.',
      tone: monthResult >= 0 ? 'text-emerald-700' : 'text-rose-700',
    },
    {
      label: 'Available funds as of period end',
      value: availableFunds,
      detail: 'Current account plus savings balances as of the selected month-end, or today for the current month.',
      tone: availableFunds >= 0 ? 'text-emerald-700' : 'text-rose-700',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Monthly operating view for {selectedLabel}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 sm:flex sm:items-end">
            <button onClick={() => shiftMonth(-1)} className="btn-secondary px-3" title="Previous month">
              <ArrowLeft size={15} />
            </button>
            <div>
              <label htmlFor="dashboard-month" className="label">Month</label>
              <select id="dashboard-month" className="input w-full sm:w-36" value={month} onChange={(event) => setMonth(+event.target.value)}>
                {budgetMonths.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="dashboard-year" className="label">Year</label>
              <select id="dashboard-year" className="input w-full sm:w-28" value={year} onChange={(event) => setYear(+event.target.value)}>
                {years.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <button onClick={() => shiftMonth(1)} className="btn-secondary px-3" title="Next month">
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-lg border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Month Result</p>
            {monthResult >= 0 ? <TrendingUp size={16} className="text-emerald-500" /> : <TrendingDown size={16} className="text-rose-500" />}
          </div>
          <p className={`text-2xl font-bold mt-2 ${monthResult >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}><Money value={monthResult} /></p>
          <p className="text-xs text-slate-400 mt-1">Income minus net expenses</p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Available Funds</p>
            <Wallet size={16} className="text-indigo-500" />
          </div>
          <p className={`text-2xl font-bold mt-2 ${availableFunds >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}><Money value={availableFunds} /></p>
          <p className="text-xs text-slate-400 mt-1">Current + savings balance</p>
        </div>
        <div className="rounded-lg border border-violet-100 bg-violet-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Card Budget Left</p>
            <CreditCard size={16} className="text-violet-500" />
          </div>
          <p className={`text-2xl font-bold mt-2 ${budgetTotals.balance < 0 ? 'text-rose-700' : 'text-violet-700'}`}><Money value={budgetTotals.balance} /></p>
          <p className="text-xs text-violet-500 mt-1">{budgetConsumed}% consumed</p>
        </div>
        <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-cyan-600 uppercase tracking-wide">Recovered</p>
            <RefreshCw size={16} className="text-cyan-500" />
          </div>
          <p className="text-2xl font-bold text-cyan-700 mt-2"><Money value={budgetTotals.recoveredAmount || 0} /></p>
          <p className="text-xs text-cyan-600 mt-1">Removed from card budgets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="card p-0 overflow-hidden xl:col-span-2">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Scale size={16} className="text-indigo-500" />
            <div>
              <h2 className="font-semibold text-slate-700">Accounting Reality</h2>
              <p className="text-xs text-slate-400">Compact monthly view without double-counting card payments</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {realityRows.map((row) => (
                  <tr key={row.label} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 px-4 min-w-[190px]">
                      <p className="font-semibold text-slate-700">{row.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{row.detail}</p>
                    </td>
                    <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${row.tone}`}><Money value={row.value} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-0 overflow-hidden xl:col-span-3">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className="text-violet-500" />
              <div>
                <h2 className="font-semibold text-slate-700">Monthly Card Budgets</h2>
                <p className="text-xs text-slate-400">Net spend after recoveries for {selectedLabel}</p>
              </div>
            </div>
            <Link to="/credit-cards" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
              Manage <ArrowRight size={13} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Card', 'Budget', 'Net Spent', 'Paid', 'Balance', 'Status'].map((heading) => (
                    <th key={heading} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {budgetRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-sm text-slate-400">No active cards found.</td>
                  </tr>
                ) : budgetRows.map((card) => (
                  <tr key={card._id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="py-3 px-4 min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: card.color }} />
                        <div>
                          <p className="font-medium text-slate-700">{card.bankName}</p>
                          <p className="text-xs text-slate-400">{card.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap"><Money value={card.budgeted} /></td>
                    <td className="py-3 px-4 font-semibold text-violet-700 whitespace-nowrap">
                      <Money value={card.spent} />
                      {(card.recoveredAmount || 0) > 0 && (
                        <p className="text-xs font-normal text-cyan-600">Recovered <Money value={card.recoveredAmount} /></p>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-700 whitespace-nowrap"><Money value={card.paid} /></td>
                    <td className={`py-3 px-4 font-semibold whitespace-nowrap ${card.balance < 0 ? 'text-rose-700' : 'text-slate-700'}`}><Money value={card.balance} /></td>
                    <td className="py-3 px-4">
                      <span className={`badge border ${statusClass(card.status)}`}>{statusLabel(card.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-emerald-500" />
            <div>
              <h2 className="font-semibold text-slate-700">Account Balances</h2>
              <p className="text-xs text-slate-400">As of {balances[0]?.asOf ? format(new Date(balances[0].asOf), 'dd MMM yyyy') : selectedLabel}</p>
            </div>
          </div>
          <button onClick={openBalanceEdit} className="btn-secondary py-1.5 px-3 text-xs">
            <Edit2 size={12} /> Opening Balances
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Owner', 'Current Account', 'Carry Forward', 'Opening Balance', 'Savings Accounts'].map((heading) => (
                  <th key={heading} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {balances.map((balance) => {
                const memberSavings = savingsAccounts.filter((account) => account.memberId?._id === balance.memberId);
                const memberSavingsTotal = memberSavings.reduce((sum, account) => sum + (account.balance || 0), 0);
                return (
                  <tr key={balance.memberId} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: balance.memberColor }} />
                        <span className="font-semibold text-slate-700">{balance.memberName}</span>
                      </div>
                    </td>
                    <td className={`py-3 px-4 font-bold whitespace-nowrap ${balance.currentBalance < 0 ? 'text-rose-700' : 'text-indigo-700'}`}><Money value={balance.currentBalance} /></td>
                    <td className="py-3 px-4 font-semibold text-slate-600 whitespace-nowrap"><Money value={balance.balanceLastMonth} /></td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap"><Money value={balance.openingBalance} /></td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-emerald-700 whitespace-nowrap"><Money value={memberSavingsTotal} /></p>
                      {memberSavings.length > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5">{memberSavings.map((account) => account.name).join(', ')}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CategoryGoalsWidget expenseByCategory={expenseByCategory} />

      <Modal isOpen={balanceModal} onClose={() => setBalanceModal(false)} title="Edit Opening Balances">
        <form onSubmit={saveBalance} className="space-y-5">
          {balanceError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{balanceError}</p>}
          <p className="text-xs text-slate-400">
            Enter the balance each person had before they started tracking in this app. Recorded income, expenses, and transfers are applied automatically.
          </p>
          {balances.map((balance) => (
            <div key={balance.memberId} className="border border-slate-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: balance.memberColor }} />
                <span className="font-semibold text-slate-700 text-sm">{balance.memberName}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Opening Balance</label>
                  <input
                    type="number"
                    className="input"
                    value={balanceForms[balance.memberId]?.openingBalance ?? ''}
                    onChange={(event) =>
                      setBalanceForms((previous) => ({
                        ...previous,
                        [balance.memberId]: { ...previous[balance.memberId], openingBalance: event.target.value },
                      }))
                    }
                    placeholder="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input
                    type="text"
                    className="input"
                    value={balanceForms[balance.memberId]?.notes ?? ''}
                    onChange={(event) =>
                      setBalanceForms((previous) => ({
                        ...previous,
                        [balance.memberId]: { ...previous[balance.memberId], notes: event.target.value },
                      }))
                    }
                    placeholder="Optional"
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
