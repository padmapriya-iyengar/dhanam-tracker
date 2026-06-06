import { format } from 'date-fns';
import { BarChart2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line,
  LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import DirhamSymbol from '../components/DirhamSymbol';
import { fmt, reportsApi } from '../services/api';

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'halfyearly', label: 'Half-Yearly' },
  { value: 'yearly', label: 'Yearly' },
];

const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(2024, i, 1), 'MMMM') }));
const COLORS = ['#6366f1', '#f97316', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

function getWeekNumber(d) {
  const oneJan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
}

export default function Reports() {
  const now = new Date();
  const [period, setPeriod] = useState('monthly');
  const [params, setParams] = useState({
    month: now.getMonth() + 1, year: now.getFullYear(), week: getWeekNumber(now),
    quarter: Math.ceil((now.getMonth() + 1) / 3), half: now.getMonth() < 6 ? 1 : 2,
    date: format(now, 'yyyy-MM-dd'),
  });
  const [report, setReport] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const queryParams = { period, ...params };
    try {
      const [r, t] = await Promise.all([
        reportsApi.get(queryParams),
        reportsApi.getTrend({ months: 12 }),
      ]);
      setReport(r.data);
      setTrend(t.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [period, JSON.stringify(params)]);

  const { summary, expenseByCategory, expenseByMember, incomeByMember, dailyTrend } = report || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Analyze your financial data across any time period</p>
      </div>

      {/* Period Selector */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-full sm:w-auto">
            <label className="label">Period</label>
            <div className="overflow-x-auto pb-1">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-max min-w-full sm:w-auto">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPeriod(opt.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      period === opt.value ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {period === 'daily' && (
            <div>
              <label className="label">Date</label>
              <input type="date" className="input w-44" value={params.date}
                onChange={(e) => setParams({ ...params, date: e.target.value })} />
            </div>
          )}

          {period === 'weekly' && (
            <>
              <div>
                <label className="label">Week</label>
                <input type="number" className="input w-24" value={params.week} min="1" max="52"
                  onChange={(e) => setParams({ ...params, week: +e.target.value })} />
              </div>
              <div>
                <label className="label">Year</label>
                <select className="input w-28" value={params.year} onChange={(e) => setParams({ ...params, year: +e.target.value })}>
                  {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}

          {period === 'monthly' && (
            <>
              <div>
                <label className="label">Month</label>
                <select className="input w-36" value={params.month} onChange={(e) => setParams({ ...params, month: +e.target.value })}>
                  {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Year</label>
                <select className="input w-28" value={params.year} onChange={(e) => setParams({ ...params, year: +e.target.value })}>
                  {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}

          {period === 'quarterly' && (
            <>
              <div>
                <label className="label">Quarter</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((q) => (
                    <button key={q} onClick={() => setParams({ ...params, quarter: q })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${params.quarter === q ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                      Q{q}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Year</label>
                <select className="input w-28" value={params.year} onChange={(e) => setParams({ ...params, year: +e.target.value })}>
                  {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}

          {period === 'halfyearly' && (
            <>
              <div>
                <label className="label">Half</label>
                <div className="flex gap-1">
                  {[1, 2].map((h) => (
                    <button key={h} onClick={() => setParams({ ...params, half: h })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${params.half === h ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                      H{h} ({h === 1 ? 'Jan–Jun' : 'Jul–Dec'})
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Year</label>
                <select className="input w-28" value={params.year} onChange={(e) => setParams({ ...params, year: +e.target.value })}>
                  {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}

          {period === 'yearly' && (
            <div>
              <label className="label">Year</label>
              <select className="input w-28" value={params.year} onChange={(e) => setParams({ ...params, year: +e.target.value })}>
                {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? <LoadingSpinner /> : !summary ? null : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard title="Total Income" value={<><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(summary.totalIncome)}</>} icon={TrendingUp} color="green" change={summary.incomeChange} />
            <StatCard title="Total Expenses" value={<><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(summary.totalExpense)}</>} icon={BarChart2} color="red" change={summary.expenseChange} />
            <StatCard title="Net Savings" value={<><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(summary.savings)}</>} icon={Wallet} color={summary.savings >= 0 ? 'green' : 'red'} />
            <StatCard title="Savings Rate" value={`${summary.savingsRate}%`} icon={TrendingDown} color="indigo" />
          </div>

          {/* Previous Period Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">vs Previous Period</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Income</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(summary.totalIncome)}</p>
                    <p className="text-xs text-slate-400">prev: <DirhamSymbol className="h-[0.75em] w-auto inline align-middle mr-0.5" />{fmt(summary.prevTotalIncome)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Expenses</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(summary.totalExpense)}</p>
                    <p className="text-xs text-slate-400">prev: <DirhamSymbol className="h-[0.75em] w-auto inline align-middle mr-0.5" />{fmt(summary.prevTotalExpense)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Income/Expense by Member */}
            <div className="card">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">By Member</p>
              <div className="space-y-2">
                {incomeByMember?.map((m, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                      <span className="text-sm text-slate-600">{m.name} — Income</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(m.total)}</span>
                  </div>
                ))}
                {expenseByMember?.map((m, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                      <span className="text-sm text-slate-600">{m.name} — Expenses</span>
                    </div>
                    <span className="text-sm font-semibold text-rose-600"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(m.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Category breakdown */}
            <div className="card">
              <h3 className="font-semibold text-slate-700 mb-4">Expense by Category</h3>
              {expenseByCategory?.length ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={expenseByCategory} layout="vertical" barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={110} />
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Bar dataKey="total" name="Amount" radius={[0, 4, 4, 0]}>
                      {expenseByCategory.map((c, i) => (
                        <Cell key={i} fill={c.color || COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-slate-400 py-8 text-center">No expense data</p>}
            </div>

            {/* 12-month trend */}
            <div className="card">
              <h3 className="font-semibold text-slate-700 mb-4">12-Month Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fill="url(#incG)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f97316" fill="url(#expG)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Trend (if available) */}
          {dailyTrend?.length > 1 && (
            <div className="card">
              <h3 className="font-semibold text-slate-700 mb-4">Daily Spending This Period</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category Table */}
          {expenseByCategory?.length > 0 && (
            <div className="card p-0 overflow-hidden overflow-x-auto">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-700">Category Breakdown</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left py-3 px-5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Category</th>
                    <th className="text-right py-3 px-5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Transactions</th>
                    <th className="text-right py-3 px-5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Amount</th>
                    <th className="text-right py-3 px-5 font-semibold text-slate-500 text-xs uppercase tracking-wide">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseByCategory.map((c, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: c.color || COLORS[i % COLORS.length] }} />
                          <span className="text-slate-700 font-medium">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-right text-slate-500">{c.count}</td>
                      <td className="py-3 px-5 text-right font-semibold text-slate-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(c.total)}</td>
                      <td className="py-3 px-5 text-right text-slate-500">
                        {summary.totalExpense > 0 ? ((c.total / summary.totalExpense) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
