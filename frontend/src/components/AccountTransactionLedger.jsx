import { ArrowDownLeft, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, ReceiptText } from 'lucide-react';
import DirhamSymbol from './DirhamSymbol';
import { fmt } from '../services/api';

const typeStyles = {
  income: 'bg-emerald-50 text-emerald-700',
  expense: 'bg-rose-50 text-rose-700',
  transfer: 'bg-indigo-50 text-indigo-700',
};

function Amount({ transaction }) {
  const positive = transaction.direction === 'in';
  const neutral = transaction.direction === 'transfer';
  return (
    <div className="shrink-0 text-right">
      <p className={`whitespace-nowrap text-sm font-bold sm:text-base ${neutral ? 'text-indigo-600' : positive ? 'text-emerald-600' : 'text-rose-600'}`}>
        {!neutral && (positive ? '+' : '-')}
        <DirhamSymbol className="mr-0.5 inline h-[0.8em] w-auto align-middle" />{fmt(transaction.amount)}
      </p>
      <p className="hidden text-[10px] text-slate-400 sm:block">{positive ? 'Money in' : neutral ? 'Movement' : 'Money out'}</p>
      {Number.isFinite(transaction.balanceBefore) && (
        <p className="mt-0.5 whitespace-nowrap text-[10px] font-normal text-slate-400 sm:text-[11px]">
          Before <DirhamSymbol className="mr-0.5 inline-block h-2.5 w-auto align-middle" />{fmt(transaction.balanceBefore)}
          <span className="mx-1 text-slate-300">→</span>
          <DirhamSymbol className="mr-0.5 inline-block h-2.5 w-auto align-middle" />{fmt(transaction.balanceAfter)}
        </p>
      )}
    </div>
  );
}

export default function AccountTransactionLedger({ transactions, page, pages, onPageChange }) {
  if (!transactions.length) {
    return <div className="card py-14 text-center"><ReceiptText className="mx-auto mb-3 text-slate-200" size={34} /><p className="font-medium text-slate-600">No transactions found</p><p className="mt-1 text-sm text-slate-400">Try another account or date range.</p></div>;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="divide-y divide-slate-100">
        {transactions.map((transaction) => {
          const Icon = transaction.direction === 'in' ? ArrowDownLeft : transaction.direction === 'out' ? ArrowUpRight : ArrowRight;
          return (
            <div key={`${transaction.type}-${transaction.id}`} className="flex items-start gap-2.5 px-3 py-3 sm:items-center sm:gap-3 sm:px-4 sm:py-2.5">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${typeStyles[transaction.type]}`}><Icon size={17} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-800 sm:text-base">{transaction.title}</p>
                  <span className={`badge hidden shrink-0 capitalize sm:inline-flex ${typeStyles[transaction.type]}`}>{transaction.type}</span>
                </div>
                <p className="truncate text-xs text-slate-500 sm:text-sm">{transaction.description || transaction.account}</p>
                <div className="mt-0.5 flex min-w-0 items-center gap-x-1 overflow-hidden whitespace-nowrap text-[11px] text-slate-400 sm:gap-x-1.5 sm:text-xs">
                  <span>{new Date(transaction.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  {transaction.description && <><span>•</span><span className="truncate">{transaction.account}</span></>}
                  {transaction.category && <><span className="hidden sm:inline">•</span><span className="hidden truncate sm:inline">{transaction.category}</span></>}
                  {transaction.owner && <><span className="hidden md:inline">•</span><span className="hidden truncate md:inline">{transaction.owner}</span></>}
                  {transaction.notes && <><span className="hidden lg:inline">•</span><span className="hidden truncate lg:inline">{transaction.notes}</span></>}
                </div>
              </div>
              <Amount transaction={transaction} />
            </div>
          );
        })}
      </div>
      {pages > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500"><span>Page {page} of {pages}</span><div className="flex gap-2"><button className="btn-secondary px-2 py-1.5" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={16} /></button><button className="btn-secondary px-2 py-1.5" disabled={page >= pages} onClick={() => onPageChange(page + 1)}><ChevronRight size={16} /></button></div></div>}
    </div>
  );
}
