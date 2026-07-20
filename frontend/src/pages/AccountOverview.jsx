import { ArrowDownLeft, ArrowUpRight, CalendarRange, CreditCard, Landmark, RefreshCw, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';
import AccountTransactionLedger from '../components/AccountTransactionLedger';
import DirhamSymbol from '../components/DirhamSymbol';
import LoadingSpinner from '../components/LoadingSpinner';
import { accountsApi, fmt } from '../services/api';

const groups = { current: 'Current Accounts', savings: 'Savings & Investments', credit_card: 'Credit Cards' };

function SummaryCard({ label, amount, icon: Icon, tone }) {
  const tones = { green: 'bg-emerald-50 text-emerald-600', rose: 'bg-rose-50 text-rose-600', indigo: 'bg-indigo-50 text-indigo-600' };
  return <div className="card flex min-w-0 items-center gap-2.5 p-3 sm:gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${tones[tone]}`}><Icon size={18} /></div><div className="min-w-0"><p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">{label}</p><p className="truncate text-base font-bold text-slate-800 sm:text-xl"><DirhamSymbol className="mr-0.5 inline h-[0.8em] w-auto align-middle" />{fmt(amount)}</p></div></div>;
}

export default function AccountOverview() {
  const [accounts, setAccounts] = useState([]);
  const [data, setData] = useState({ records: [], summary: { totalIn: 0, totalOut: 0, net: 0 }, pages: 1 });
  const [filters, setFilters] = useState({ account: '', startDate: '', endDate: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { accountsApi.getAll().then(({ data: result }) => setAccounts(result)).catch((err) => setError(err.response?.data?.error || err.message)).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    setLedgerLoading(true); setError('');
    accountsApi.getTransactions({ ...filters, page, limit: 50 }).then(({ data: result }) => setData(result)).catch((err) => setError(err.response?.data?.error || err.message)).finally(() => setLedgerLoading(false));
  }, [filters, page]);

  const updateFilter = (name, value) => { setFilters((current) => ({ ...current, [name]: value })); setPage(1); };
  if (loading) return <LoadingSpinner />;
  return (
    <div className="space-y-4">
      <div><h1 className="page-title">Account Overview</h1><p className="mt-0.5 text-sm text-slate-500">Every income, expense and transfer in one account ledger</p></div>
      <div className="card p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-[minmax(220px,1fr)_170px_170px_auto] md:items-end">
          <div className="col-span-2 md:col-span-1"><label className="label">Account or card</label><select className="input" value={filters.account} onChange={(e) => updateFilter('account', e.target.value)}><option value="">All accounts and cards</option>{Object.entries(groups).map(([type, label]) => <optgroup key={type} label={label}>{accounts.filter((account) => account.type === type).map((account) => <option key={account.key} value={account.key}>{account.name}{account.bankName ? ` — ${account.bankName}` : ''}</option>)}</optgroup>)}</select></div>
          <div><label className="label">From date</label><input className="input" type="date" value={filters.startDate} max={filters.endDate || undefined} onChange={(e) => updateFilter('startDate', e.target.value)} /></div>
          <div><label className="label">To date</label><input className="input" type="date" value={filters.endDate} min={filters.startDate || undefined} onChange={(e) => updateFilter('endDate', e.target.value)} /></div>
          <button className="btn-secondary col-span-2 justify-center md:col-span-1" onClick={() => { setFilters({ account: '', startDate: '', endDate: '' }); setPage(1); }}><RefreshCw size={15} /> Reset</button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400"><CalendarRange size={14} /><span>{filters.startDate || filters.endDate ? `${filters.startDate || 'Beginning'} to ${filters.endDate || 'Today'}` : 'Showing all dates, newest first'}</span></div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3"><SummaryCard label="Money in" amount={data.summary.totalIn} icon={ArrowDownLeft} tone="green" /><SummaryCard label="Money out" amount={data.summary.totalOut} icon={ArrowUpRight} tone="rose" /><SummaryCard label="Net movement" amount={data.summary.net} icon={filters.account?.startsWith('credit_card') ? CreditCard : filters.account ? Landmark : WalletCards} tone="indigo" /></div>
      <div className="flex items-end justify-between"><div><h2 className="font-semibold text-slate-800">Transaction history</h2><p className="text-xs text-slate-400">{data.total || 0} transaction{data.total === 1 ? '' : 's'}</p></div>{ledgerLoading && <span className="text-xs text-indigo-500">Updating…</span>}</div>
      {error ? <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : <div className={ledgerLoading ? 'opacity-60 transition-opacity' : ''}><AccountTransactionLedger transactions={data.records} page={page} pages={data.pages} onPageChange={setPage} /></div>}
    </div>
  );
}
