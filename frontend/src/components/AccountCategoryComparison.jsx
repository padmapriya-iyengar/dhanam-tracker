import { BarChart3, Plus, X } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import DirhamSymbol from './DirhamSymbol';
import { accountsApi, fmt } from '../services/api';

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (value) => {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1));
};

export default function AccountCategoryComparison({ account }) {
  const now = new Date();
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [months, setMonths] = useState([monthKey(previous), monthKey(now)]);
  const [candidate, setCandidate] = useState(monthKey(now));
  const [data, setData] = useState({ rows: [], totals: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const orderedMonths = useMemo(() => [...months].sort(), [months]);

  useEffect(() => {
    if (!account || !orderedMonths.length) { setData({ rows: [], totals: {} }); return; }
    setLoading(true); setError('');
    accountsApi.getCategoryComparison({ account, months: orderedMonths.join(',') })
      .then(({ data: result }) => setData(result))
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, [account, orderedMonths.join(',')]);

  const addMonth = () => {
    if (candidate && !months.includes(candidate)) setMonths((current) => [...current, candidate]);
  };
  const removeMonth = (month) => setMonths((current) => current.filter((value) => value !== month));

  return (
    <section className="card min-w-0 p-0">
      <div className="border-b border-slate-100 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="flex items-center gap-2"><BarChart3 size={17} className="text-indigo-500" /><h2 className="font-semibold text-slate-800">Monthly category comparison</h2></div><p className="mt-0.5 text-xs text-slate-500">Compare expense categories and subcategories for the selected account.</p></div>
          <div className="flex gap-2"><input type="month" className="input min-w-0 flex-1 sm:w-40" value={candidate} onChange={(event) => setCandidate(event.target.value)} /><button type="button" className="btn-secondary shrink-0 px-3" onClick={addMonth}><Plus size={15} /> Add</button></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{orderedMonths.map((month) => <span key={month} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{monthLabel(month)}<button type="button" className="rounded-full p-0.5 hover:bg-indigo-100" onClick={() => removeMonth(month)} aria-label={`Remove ${monthLabel(month)}`}><X size={12} /></button></span>)}</div>
      </div>
      {!account ? <div className="px-4 py-10 text-center text-sm text-slate-400">Select an account or credit card above to compare its monthly spending.</div>
        : !orderedMonths.length ? <div className="px-4 py-10 text-center text-sm text-slate-400">Add at least one month to begin.</div>
          : error ? <div className="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
            : loading ? <div className="px-4 py-10 text-center text-sm text-indigo-500">Loading comparison…</div>
              : !data.rows.length ? <div className="px-4 py-10 text-center text-sm text-slate-400">No expenses found for the selected months.</div>
                : <div className="overflow-x-auto"><table className="w-full min-w-max text-sm"><thead><tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400"><th className="sticky left-0 z-10 min-w-48 bg-slate-50 px-4 py-3">Category / Subcategory</th>{orderedMonths.map((month) => <th key={month} className="min-w-32 px-4 py-3 text-right">{monthLabel(month)}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{data.rows.map((row) => <Fragment key={row.id}><tr className="bg-white font-semibold text-slate-700"><td className="sticky left-0 z-10 bg-white px-4 py-2.5"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />{row.name}</td>{orderedMonths.map((month) => <td key={month} className="px-4 py-2.5 text-right"><DirhamSymbol className="mr-0.5 inline h-[0.78em] w-auto align-middle" />{fmt(row.values[month] || 0)}</td>)}</tr>{row.subcategories.map((sub) => <tr key={`${row.id}-${sub.id}`} className="text-slate-500"><td className="sticky left-0 z-10 bg-white py-2 pl-9 pr-4 text-xs">{sub.name}</td>{orderedMonths.map((month) => <td key={month} className="px-4 py-2 text-right text-xs"><DirhamSymbol className="mr-0.5 inline h-[0.75em] w-auto align-middle" />{fmt(sub.values[month] || 0)}</td>)}</tr>)}</Fragment>)}</tbody><tfoot><tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-800"><td className="sticky left-0 z-10 bg-slate-50 px-4 py-3">Total</td>{orderedMonths.map((month) => <td key={month} className="px-4 py-3 text-right"><DirhamSymbol className="mr-0.5 inline h-[0.78em] w-auto align-middle" />{fmt(data.totals[month] || 0)}</td>)}</tr></tfoot></table></div>}
    </section>
  );
}
