import { format } from 'date-fns';
import {
  ArrowLeft, ArrowRight, CalendarDays, ChevronDown, ChevronRight, CreditCard, Edit2, RefreshCw,
  Scale, TrendingDown, TrendingUp, Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CategoryGoalsWidget from '../components/CategoryGoalsWidget';
import CollapsibleSection from '../components/CollapsibleSection';
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
  const [detailModal, setDetailModal] = useState(null);
  const [expandedUpcomingCardId, setExpandedUpcomingCardId] = useState(null);
  const [expandedRecurringGroupKey, setExpandedRecurringGroupKey] = useState(null);
  const [expandedSalarySection, setExpandedSalarySection] = useState(null);
  const [expandedBudgetCardId, setExpandedBudgetCardId] = useState(null);
  const [expandedBalanceMemberId, setExpandedBalanceMemberId] = useState(null);

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
  const funding = report?.funding || {};
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
      detail: 'Account plus savings balances as of the selected month-end, or today for the current month.',
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

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <p className="text-sm font-semibold text-slate-700">Personal record keeping</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Dhanam Tracker is a personal record-keeping application. It does not provide banking, payment processing, lending, investment, or money transfer services.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <button type="button" onClick={() => setDetailModal('salary')} className="group rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-left transition hover:border-emerald-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Salary left to use</p><ChevronRight size={17} className="text-emerald-400 transition-transform group-hover:translate-x-0.5" /></div><p className="mt-2 text-2xl font-bold text-emerald-700"><Money value={funding.salaryRemaining} /></p><p className="mt-1 text-xs text-emerald-600">Salary funding less account and committed debits · View details</p></button>
        <div className={`rounded-lg border p-4 ${(funding.savingsRequired || 0) > 0 ? 'border-rose-100 bg-rose-50' : 'border-slate-100 bg-white'}`}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Borrow from savings</p><p className={`mt-2 text-2xl font-bold ${(funding.savingsRequired || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'}`}><Money value={funding.savingsRequired} /></p><p className="mt-1 text-xs text-slate-400">Shortfall after this month's obligations</p></div>
        <button type="button" onClick={() => setDetailModal('cards')} className="group rounded-lg border border-rose-100 bg-white p-4 text-left transition hover:border-rose-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-200"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-rose-600">{month === now.getMonth() + 1 && year === now.getFullYear() ? 'Card payments pending as of today' : 'Card payments pending at month end'}</p><ChevronRight size={17} className="text-rose-300 transition-transform group-hover:translate-x-0.5" /></div><p className="mt-2 text-2xl font-bold text-rose-700"><Money value={funding.cardsDue} /></p><p className="mt-1 text-xs text-slate-400">Closed statement balances less applicable payments · View details</p></button>
        <button type="button" onClick={() => setDetailModal('recurring')} className="group rounded-lg border border-amber-100 bg-amber-50 p-4 text-left transition hover:border-amber-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-200"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pending recurring transfers</p><ChevronRight size={17} className="text-amber-400 transition-transform group-hover:translate-x-0.5" /></div><p className="mt-2 text-2xl font-bold text-amber-700"><Money value={funding.pendingRecurring} /></p><p className="mt-1 text-xs text-amber-700">Committed items not recorded yet · View details</p></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <button type="button" onClick={() => setDetailModal('upcoming')} className="group rounded-lg border border-violet-100 bg-violet-50 p-4 text-left transition hover:border-violet-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-200">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Upcoming card bill</p>
            <ChevronRight size={17} className="text-violet-400 transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="mt-2 text-2xl font-bold text-violet-700"><Money value={funding.upcomingCardBill} /></p>
          <p className="mt-1 text-xs text-violet-500">Purchases in each card's upcoming statement cycle · View details</p>
        </button>
        <div className="rounded-lg border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Available Funds</p>
            <Wallet size={16} className="text-indigo-500" />
          </div>
          <p className={`text-2xl font-bold mt-2 ${availableFunds >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}><Money value={availableFunds} /></p>
          <p className="text-xs text-slate-400 mt-1">Account + savings balance</p>
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
        <CollapsibleSection
          storageKey="dashboard-accounting-reality"
          title="Accounting Reality"
          subtitle="Compact monthly view without double-counting card payments."
          summary={`Result ${fmt(monthResult)}`}
          icon={Scale}
          defaultOpen
          className="xl:col-span-2"
          contentClassName="p-0 sm:p-0"
        >
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
        </CollapsibleSection>

        <CollapsibleSection
          storageKey="dashboard-card-budgets"
          title="Monthly Card Budgets"
          subtitle={`Net spend after recoveries for ${selectedLabel}.`}
          summary={`${budgetConsumed}% consumed`}
          icon={CreditCard}
          defaultOpen
          className="xl:col-span-3"
          contentClassName="p-0 sm:p-0"
        >
          <div className="flex justify-end border-b border-slate-100 px-4 py-2">
            <Link to="/credit-cards" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
              Manage <ArrowRight size={13} />
            </Link>
          </div>
          <div className="md:hidden divide-y divide-slate-100">
            {budgetRows.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No active cards found.</div>
            ) : budgetRows.map((card) => (
              <div key={card._id} className="px-4 py-3">
                <button type="button" onClick={() => setExpandedBudgetCardId((current) => current === card._id ? null : card._id)} className="flex w-full items-start justify-between gap-3 text-left">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: card.color }} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{card.bankName}</p>
                      <p className="truncate text-xs text-slate-400">{card.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2"><div className="text-right"><p className={`font-bold ${card.balance < 0 ? 'text-rose-700' : 'text-slate-700'}`}><Money value={card.balance} /></p><span className={`badge border ${statusClass(card.status)}`}>{statusLabel(card.status)}</span></div><ChevronDown size={16} className={`mt-1 text-slate-400 transition-transform ${expandedBudgetCardId === card._id ? 'rotate-180' : ''}`} /></div>
                </button>

                {expandedBudgetCardId === card._id && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Budget</p>
                    <p className="mt-1 text-sm font-bold text-slate-800"><Money value={card.budgeted} /></p>
                  </div>
                  <div className="rounded-lg bg-violet-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-500">Net Spent</p>
                    <p className="mt-1 text-sm font-bold text-violet-700"><Money value={card.spent} /></p>
                    {(card.recoveredAmount || 0) > 0 && (
                      <p className="mt-0.5 text-[11px] font-medium text-cyan-600">Recovered <Money value={card.recoveredAmount} /></p>
                    )}
                  </div>
                  <div className="rounded-lg bg-emerald-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Paid</p>
                    <p className="mt-1 text-sm font-bold text-emerald-700"><Money value={card.paid} /></p>
                  </div>
                  <div className={`rounded-lg px-3 py-2 ${card.balance < 0 ? 'bg-rose-50' : 'bg-slate-50'}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${card.balance < 0 ? 'text-rose-500' : 'text-slate-400'}`}>Balance</p>
                    <p className={`mt-1 text-sm font-bold ${card.balance < 0 ? 'text-rose-700' : 'text-slate-800'}`}><Money value={card.balance} /></p>
                  </div>
                </div>
                )}
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
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
        </CollapsibleSection>
      </div>

      <CollapsibleSection
        storageKey="dashboard-account-balances"
        title="Account Balances"
        subtitle={`As of ${balances[0]?.asOf ? format(new Date(balances[0].asOf), 'dd MMM yyyy') : selectedLabel}.`}
        summary={`Available ${fmt(availableFunds)}`}
        icon={CalendarDays}
        defaultOpen={false}
        contentClassName="p-0 sm:p-0"
      >
        <div className="flex justify-end border-b border-slate-100 px-4 py-2">
          <button onClick={openBalanceEdit} className="btn-secondary py-1.5 px-3 text-xs whitespace-nowrap">
            <Edit2 size={12} /> Opening Balances
          </button>
        </div>
        <div className="md:hidden divide-y divide-slate-100">
          {balances.map((balance) => {
            const memberSavings = savingsAccounts.filter((account) => account.memberId?._id === balance.memberId);
            const memberSavingsTotal = memberSavings.reduce((sum, account) => sum + (account.balance || 0), 0);
            return (
              <div key={balance.memberId} className="px-4 py-3">
                <button type="button" onClick={() => setExpandedBalanceMemberId((current) => current === balance.memberId ? null : balance.memberId)} className="flex w-full items-center justify-between gap-3 text-left"><div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: balance.memberColor }} />
                  <p className="min-w-0 truncate text-sm font-semibold text-slate-800">{balance.memberName}</p>
                </div><div className="flex items-center gap-2"><p className={`font-bold ${balance.currentBalance < 0 ? 'text-rose-700' : 'text-indigo-700'}`}><Money value={balance.currentBalance} /></p><ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedBalanceMemberId === balance.memberId ? 'rotate-180' : ''}`} /></div></button>

                {expandedBalanceMemberId === balance.memberId && <>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className={`rounded-lg px-3 py-2 ${balance.currentBalance < 0 ? 'bg-rose-50' : 'bg-indigo-50'}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${balance.currentBalance < 0 ? 'text-rose-500' : 'text-indigo-500'}`}>Account</p>
                    <p className={`mt-1 text-sm font-bold ${balance.currentBalance < 0 ? 'text-rose-700' : 'text-indigo-700'}`}><Money value={balance.currentBalance} /></p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Carry Forward</p>
                    <p className="mt-1 text-sm font-bold text-slate-700"><Money value={balance.balanceLastMonth} /></p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Opening Balance</p>
                    <p className="mt-1 text-sm font-bold text-slate-700"><Money value={balance.openingBalance} /></p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Savings</p>
                    <p className="mt-1 text-sm font-bold text-emerald-700"><Money value={memberSavingsTotal} /></p>
                  </div>
                </div>

                {memberSavings.length > 0 && (
                  <div className="mt-2 rounded-lg border border-slate-100 bg-white px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Savings Accounts</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{memberSavings.map((account) => account.name).join(', ')}</p>
                  </div>
                )}
                </>}
              </div>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Owner', 'Account', 'Carry Forward', 'Opening Balance', 'Savings Accounts'].map((heading) => (
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
      </CollapsibleSection>

      <CategoryGoalsWidget expenseByCategory={expenseByCategory} />

      <Modal isOpen={detailModal === 'salary'} onClose={() => setDetailModal(null)} title={`Salary left to use · ${selectedLabel}`} size="lg">
        <div className="space-y-5">
          <div className="overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50">
            <button type="button" onClick={() => setExpandedSalarySection((current) => current === 'funding' ? null : 'funding')} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-emerald-100/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-200"><div className="min-w-0"><p className="font-semibold text-emerald-800">Salary funding</p><p className="mt-0.5 text-xs text-emerald-600">{funding.salaryItems?.length || 0} salary record{funding.salaryItems?.length === 1 ? '' : 's'} from the previous month</p></div><div className="flex shrink-0 items-center gap-2"><span className="text-xl font-bold text-emerald-700"><Money value={funding.salaryFunding ?? funding.incomeAvailable} /></span><ChevronDown size={16} className={`text-emerald-500 transition-transform ${expandedSalarySection === 'funding' ? 'rotate-180' : ''}`} /></div></button>
            {expandedSalarySection === 'funding' && <div className="border-t border-emerald-100 px-4 py-2">
              {(funding.salaryItems || []).map((item) => <div key={item.incomeId} className="flex items-center justify-between gap-4 py-1 text-sm"><div className="min-w-0"><p className="truncate text-emerald-800">{item.description}</p><p className="text-xs text-emerald-600">{format(new Date(item.date), 'dd MMM yyyy')}{item.member ? ` · ${item.member}` : ''}</p></div><span className="shrink-0 font-semibold text-emerald-700"><Money value={item.amount} /></span></div>)}
              {!funding.salaryItems?.length && <p className="text-sm text-emerald-600">No salary funding is assigned to this month.</p>}
            </div>}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <button type="button" onClick={() => setExpandedSalarySection((current) => current === 'account' ? null : 'account')} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-200"><div><p className="font-semibold text-slate-700">Account debits</p><p className="text-xs text-slate-400">{funding.currentDebitItems?.length || 0} recorded debit{funding.currentDebitItems?.length === 1 ? '' : 's'}</p></div><div className="flex items-center gap-2"><span className="font-bold text-rose-700">− <Money value={funding.currentAccountDebits} /></span><ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedSalarySection === 'account' ? 'rotate-180' : ''}`} /></div></button>
            {expandedSalarySection === 'account' && <div className="border-t border-slate-100 px-4 py-2">
            {(funding.currentDebitItems || []).map((item) => <div key={item.id || item.expenseId} className="flex items-center justify-between gap-4 py-1 text-sm"><div className="min-w-0"><p className="truncate text-slate-700">{item.description}</p><p className="text-xs text-slate-400">{format(new Date(item.date), 'dd MMM yyyy')}{item.member ? ` · ${item.member}` : ''}{item.card ? ` · ${item.card}` : ''}{item.type === 'card_payment' ? ' · Card payment' : ''}</p></div><span className="shrink-0 text-slate-600"><Money value={item.amount} /></span></div>)}
            {!funding.currentDebitItems?.length && <p className="text-sm text-slate-400">No account debits assigned to this month.</p>}
            </div>}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <button type="button" onClick={() => setExpandedSalarySection((current) => current === 'savings' ? null : 'savings')} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-200"><div><p className="font-semibold text-slate-700">Savings debits</p><p className="text-xs text-slate-400">{funding.savingsDebitItems?.length || 0} recorded debit{funding.savingsDebitItems?.length === 1 ? '' : 's'}</p></div><div className="flex items-center gap-2"><span className="font-bold text-rose-700">− <Money value={funding.savingsDebits} /></span><ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedSalarySection === 'savings' ? 'rotate-180' : ''}`} /></div></button>
            {expandedSalarySection === 'savings' && <div className="border-t border-slate-100 px-4 py-2">
            {(funding.savingsDebitItems || []).map((item) => <div key={item.id || item.expenseId} className="flex items-center justify-between gap-4 py-1 text-sm"><div className="min-w-0"><p className="truncate text-slate-700">{item.description}</p><p className="text-xs text-slate-400">{format(new Date(item.date), 'dd MMM yyyy')}{item.account ? ` · ${item.account}` : ''}{item.member ? ` · ${item.member}` : ''}{item.card ? ` · ${item.card}` : ''}{item.type === 'card_payment' ? ' · Card payment' : ''}</p></div><span className="shrink-0 text-slate-600"><Money value={item.amount} /></span></div>)}
            {!funding.savingsDebitItems?.length && <p className="text-sm text-slate-400">No savings debits assigned to this month.</p>}
            </div>}
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between gap-4 border-b border-slate-200 pb-2"><span className="font-semibold text-slate-600">Expense-type transfers</span><span className="font-semibold text-rose-700">− <Money value={funding.transferExpenses} /></span></div>
            <div className="py-2">
              {(funding.transferExpenseItems || []).map((item) => (
                <div key={item.transferId} className="flex items-start justify-between gap-4 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-700">{item.description}</p>
                    <p className="text-xs text-slate-400">{format(new Date(item.date), 'dd MMM yyyy')} · {item.from} → {item.to}</p>
                    {item.notes && <p className="mt-0.5 truncate text-xs text-slate-400">{item.notes}</p>}
                  </div>
                  <span className="shrink-0 font-semibold text-slate-600"><Money value={item.amount} /></span>
                </div>
              ))}
              {!funding.transferExpenseItems?.length && <p className="py-1 text-slate-400">No expense-type transfers assigned to this month.</p>}
            </div>
            <div className="flex justify-between gap-4 py-1"><span className="text-slate-500">Pending account-funded recurring commitments</span><span className="font-semibold text-rose-700">− <Money value={funding.pendingSalaryRecurring ?? funding.pendingRecurring} /></span></div>
            {(funding.pendingRecurring || 0) > (funding.pendingSalaryRecurring ?? funding.pendingRecurring ?? 0) && <p className="pb-1 text-xs text-slate-400">Credit-card commitments are excluded here and flow into upcoming card bills.</p>}
            <div className="flex justify-between gap-4 py-1"><span className="text-slate-500">Closed card payments pending</span><span className="font-semibold text-rose-700">− <Money value={funding.cardsDue} /></span></div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-4"><span className="font-semibold text-slate-800">Salary left to use</span><span className="text-2xl font-bold text-emerald-700"><Money value={funding.salaryRemaining} /></span></div>
          {(funding.savingsRequired || 0) > 0 && <div className="flex items-center justify-between rounded-lg bg-rose-50 p-3"><span className="text-sm font-semibold text-rose-700">Shortfall requiring savings</span><span className="font-bold text-rose-700"><Money value={funding.savingsRequired} /></span></div>}
          <div className="grid grid-cols-2 gap-2"><Link to="/income" onClick={() => setDetailModal(null)} className="btn-secondary justify-center">Open income</Link><Link to="/expenses" onClick={() => setDetailModal(null)} className="btn-secondary justify-center">Open expenses</Link></div>
        </div>
      </Modal>

      <Modal isOpen={detailModal === 'cards'} onClose={() => setDetailModal(null)} title={`Closed card statements · ${selectedLabel}`} size="lg">
        <div className="space-y-3">
          {!funding.cardDues?.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No card statements are due in this month.</p>}
          {(funding.cardDues || []).map((card) => (
            <div key={card.creditCardId} className="rounded-xl border border-slate-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-semibold text-slate-800">{card.name}</p><p className="mt-0.5 text-xs text-slate-400">Cycle {format(new Date(card.cycleStart), 'dd MMM')}–{format(new Date(card.cycleEnd), 'dd MMM yyyy')} · Due {format(new Date(card.dueDate), 'dd MMM yyyy')}</p></div>
                <span className={`badge border ${card.remaining > 0 ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>{card.remaining > 0 ? 'Pending' : 'Paid'}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div><p className="text-xs text-slate-400">Statement</p><p className="mt-1 font-semibold text-slate-700"><Money value={card.amount} /></p></div>
                <div><p className="text-xs text-slate-400">Payments</p><p className="mt-1 font-semibold text-emerald-700"><Money value={card.paid} /></p></div>
                <div><p className="text-xs text-slate-400">Remaining</p><p className={`mt-1 font-bold ${card.remaining > 0 ? 'text-rose-700' : 'text-emerald-700'}`}><Money value={card.remaining} /></p></div>
              </div>
              {card.estimated && <p className="mt-3 text-xs text-amber-600">Estimated from recorded transactions because no official statement amount is saved.</p>}
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4"><span className="font-semibold text-slate-700">Total pending</span><span className="text-xl font-bold text-rose-700"><Money value={funding.cardsDue} /></span></div>
          <Link to="/credit-cards" onClick={() => setDetailModal(null)} className="btn-secondary w-full justify-center">Open credit cards</Link>
        </div>
      </Modal>

      <Modal isOpen={detailModal === 'upcoming'} onClose={() => setDetailModal(null)} title={`Upcoming card bills · ${selectedLabel}`} size="lg">
        <div className="space-y-3">
          {!funding.upcomingCardBills?.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No purchases are recorded in upcoming card cycles.</p>}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_6rem_8rem_2rem] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid"><span>Card</span><span>Cycle</span><span className="text-right">Txns</span><span className="text-right">Projected</span><span /></div>
            {(funding.upcomingCardBills || []).map((card) => (
              <div key={card.creditCardId} className="border-b border-slate-100 last:border-b-0">
                <button type="button" onClick={() => setExpandedUpcomingCardId((current) => current === card.creditCardId ? null : card.creditCardId)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-violet-100 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_6rem_8rem_2rem] sm:gap-4">
                  <div className="min-w-0"><p className="truncate font-semibold text-slate-800">{card.name}</p><p className="truncate text-xs text-slate-400 sm:hidden">{format(new Date(card.cycleStart), 'dd MMM')}–{format(new Date(card.cycleEnd), 'dd MMM yyyy')} · {card.transactionCount} txn{card.transactionCount === 1 ? '' : 's'}</p></div>
                  <p className="hidden truncate text-sm text-slate-500 sm:block">{format(new Date(card.cycleStart), 'dd MMM')}–{format(new Date(card.cycleEnd), 'dd MMM yyyy')}</p>
                  <p className="hidden text-right text-sm text-slate-500 sm:block">{card.transactionCount}</p>
                  <div className="flex items-center justify-end gap-2"><p className="font-bold text-violet-700"><Money value={card.remaining ?? card.amount} /></p><ChevronDown size={16} className={`text-slate-400 transition-transform sm:hidden ${expandedUpcomingCardId === card.creditCardId ? 'rotate-180' : ''}`} /></div>
                  <ChevronDown size={16} className={`hidden text-slate-400 transition-transform sm:block ${expandedUpcomingCardId === card.creditCardId ? 'rotate-180' : ''}`} />
                </button>
                {expandedUpcomingCardId === card.creditCardId && (
                  <div className="border-t border-slate-100 bg-violet-50/40 px-4 py-3">
                    <div className="grid grid-cols-3 gap-3 text-sm"><div><p className="text-xs text-slate-400">Purchases</p><p className="mt-1 font-semibold text-slate-700"><Money value={card.purchases ?? card.amount} /></p></div><div><p className="text-xs text-slate-400">Payments</p><p className="mt-1 font-semibold text-emerald-700"><Money value={card.paid} /></p></div><div><p className="text-xs text-slate-400">Projected</p><p className="mt-1 font-bold text-violet-700"><Money value={card.remaining ?? card.amount} /></p></div></div>
                    <p className="mt-3 text-xs text-violet-500">Projected from purchases less applicable payments recorded in this open cycle. The final statement may change until the cycle closes.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-4"><span className="font-semibold text-slate-700">Projected total</span><span className="text-xl font-bold text-violet-700"><Money value={funding.upcomingCardBill} /></span></div>
          <Link to="/credit-cards" onClick={() => setDetailModal(null)} className="btn-secondary w-full justify-center">Open credit cards</Link>
        </div>
      </Modal>

      <Modal isOpen={detailModal === 'recurring'} onClose={() => setDetailModal(null)} title={`Pending recurring transfers · ${selectedLabel}`} size="lg">
        <div className="space-y-3">
          {!funding.pendingRecurringItems?.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No recurring commitments are pending in this month.</p>}
          {(funding.pendingRecurringGroups || []).map((group) => (
            <div key={group.key} className="overflow-hidden rounded-xl border border-slate-100">
              <button type="button" onClick={() => setExpandedRecurringGroupKey((current) => current === group.key ? null : group.key)} className="flex w-full items-center justify-between gap-4 bg-amber-50 px-4 py-3 text-left transition hover:bg-amber-100/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-200">
                <div className="min-w-0"><p className="truncate font-semibold text-slate-800">{group.source}</p><p className="mt-0.5 truncate text-xs text-slate-500">{group.member} · {group.sourceType} · Next due day {group.nextDueDay} · {group.items.length} item{group.items.length === 1 ? '' : 's'}</p></div>
                <div className="flex shrink-0 items-center gap-2"><p className="font-bold text-amber-700"><Money value={group.amount} /></p><ChevronDown size={16} className={`text-amber-500 transition-transform ${expandedRecurringGroupKey === group.key ? 'rotate-180' : ''}`} /></div>
              </button>
              {expandedRecurringGroupKey === group.key && (
                <div className="divide-y divide-slate-100 px-4">
                  {group.items.map((item) => (
                    <div key={item.subscriptionId} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0"><p className="truncate font-medium text-slate-700">{item.name}</p><p className="mt-0.5 text-xs text-slate-400">Due day {item.dayOfMonth}</p></div>
                      <p className="shrink-0 font-semibold text-slate-600"><Money value={item.amount} /></p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4"><span className="font-semibold text-slate-700">Total reserved</span><span className="text-xl font-bold text-amber-700"><Money value={funding.pendingRecurring} /></span></div>
          <Link to="/subscriptions" onClick={() => setDetailModal(null)} className="btn-secondary w-full justify-center">Open recurring records</Link>
        </div>
      </Modal>

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
