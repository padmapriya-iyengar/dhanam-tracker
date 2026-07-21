import { ArrowDownLeft, ArrowUpRight, CalendarRange, Check, ChevronDown, CreditCard, Landmark, RefreshCw, WalletCards } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AccountTransactionLedger from '../components/AccountTransactionLedger';
import DirhamSymbol from '../components/DirhamSymbol';
import LoadingSpinner from '../components/LoadingSpinner';
import { accountsApi, fmt } from '../services/api';

const groups = { current: 'Current Accounts', savings: 'Savings & Investments', credit_card: 'Credit Cards' };

function AccountSelect({ accounts, value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = accounts.find((account) => account.key === value);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  const choose = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        className="input flex min-w-0 items-center justify-between gap-2 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0 flex-1 truncate">{selected ? `${selected.name}${selected.bankName ? ` — ${selected.bankName}` : ''}` : 'All accounts and cards'}</span>
        <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto overscroll-contain rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
          <button type="button" role="option" aria-selected={!value} onClick={() => choose('')} className={`flex w-full min-w-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${!value ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}>
            <span className="min-w-0 flex-1 truncate">All accounts and cards</span>{!value && <Check size={15} className="shrink-0" />}
          </button>
          {Object.entries(groups).map(([type, label]) => {
            const groupAccounts = accounts.filter((account) => account.type === type);
            if (!groupAccounts.length) return null;
            return <div key={type} className="mt-1 border-t border-slate-100 pt-1 first:mt-0 first:border-0 first:pt-0"><p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>{groupAccounts.map((account) => <button key={account.key} type="button" role="option" aria-selected={value === account.key} onClick={() => choose(account.key)} className={`flex w-full min-w-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${value === account.key ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: account.color || '#94a3b8' }} /><span className="min-w-0 flex-1 truncate">{account.name}{account.bankName ? ` — ${account.bankName}` : ''}</span>{value === account.key && <Check size={15} className="shrink-0" />}</button>)}</div>;
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, amount, icon: Icon, tone }) {
  const tones = { green: 'bg-emerald-50 text-emerald-600', rose: 'bg-rose-50 text-rose-600', indigo: 'bg-indigo-50 text-indigo-600' };
  return <div className="card flex min-w-0 items-center gap-2.5 p-3 sm:gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${tones[tone]}`}><Icon size={18} /></div><div className="min-w-0"><p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">{label}</p><p className="truncate text-base font-bold text-slate-800 sm:text-xl"><DirhamSymbol className="mr-0.5 inline h-[0.8em] w-auto align-middle" />{fmt(amount)}</p></div></div>;
}

export default function AccountOverview() {
  const [accounts, setAccounts] = useState([]);
  const [data, setData] = useState({ records: [], summary: { scope: 'cash', cash: { totalIn: 0, totalOut: 0, net: 0 }, creditCards: { purchases: 0, payments: 0, outstandingMovement: 0 } }, pages: 1 });
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
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-[minmax(220px,1fr)_170px_170px_auto] md:items-end">
          <div className="min-w-0 sm:col-span-2 md:col-span-1"><label className="label">Account or card</label><AccountSelect accounts={accounts} value={filters.account} onChange={(value) => updateFilter('account', value)} /></div>
          <div className="min-w-0"><label className="label">From date</label><input className="input min-w-0" type="date" value={filters.startDate} max={filters.endDate || undefined} onChange={(e) => updateFilter('startDate', e.target.value)} /></div>
          <div className="min-w-0"><label className="label">To date</label><input className="input min-w-0" type="date" value={filters.endDate} min={filters.startDate || undefined} onChange={(e) => updateFilter('endDate', e.target.value)} /></div>
          <button className="btn-secondary justify-center sm:col-span-2 md:col-span-1" onClick={() => { setFilters({ account: '', startDate: '', endDate: '' }); setPage(1); }}><RefreshCw size={15} /> Reset</button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400"><CalendarRange size={14} /><span>{filters.startDate || filters.endDate ? `${filters.startDate || 'Beginning'} to ${filters.endDate || 'Today'}` : 'Showing all dates, newest first'}</span></div>
      </div>
      {data.summary.scope === 'cash' && <div className="space-y-2"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Current &amp; savings cash flow</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3"><SummaryCard label="Money in" amount={data.summary.cash.totalIn} icon={ArrowDownLeft} tone="green" /><SummaryCard label="Money out" amount={data.summary.cash.totalOut} icon={ArrowUpRight} tone="rose" /><div className="col-span-2 sm:col-span-1"><SummaryCard label="Net cash movement" amount={data.summary.cash.net} icon={filters.account ? Landmark : WalletCards} tone="indigo" /></div></div></div>}
      {(!filters.account || data.summary.scope === 'credit_card') && <div className="space-y-2"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Credit card activity</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3"><SummaryCard label="Card purchases" amount={data.summary.creditCards.purchases} icon={CreditCard} tone="rose" /><SummaryCard label="Card payments" amount={data.summary.creditCards.payments} icon={ArrowDownLeft} tone="green" /><div className="col-span-2 sm:col-span-1"><SummaryCard label="Outstanding movement" amount={data.summary.creditCards.outstandingMovement} icon={CreditCard} tone="indigo" /></div></div></div>}
      <div className="flex items-end justify-between"><div><h2 className="font-semibold text-slate-800">Transaction history</h2><p className="text-xs text-slate-400">{data.total || 0} transaction{data.total === 1 ? '' : 's'}</p></div>{ledgerLoading && <span className="text-xs text-indigo-500">Updating…</span>}</div>
      {error ? <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : <div className={ledgerLoading ? 'opacity-60 transition-opacity' : ''}><AccountTransactionLedger transactions={data.records} page={page} pages={data.pages} onPageChange={setPage} /></div>}
    </div>
  );
}
