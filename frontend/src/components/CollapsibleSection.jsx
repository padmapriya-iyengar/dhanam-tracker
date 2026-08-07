import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

export default function CollapsibleSection({
  storageKey,
  title,
  subtitle,
  summary,
  icon: Icon,
  defaultOpen = true,
  children,
  className = '',
  contentClassName = '',
  allowOverflow = false,
}) {
  const contentId = useId();
  const key = `dhanam.section.${storageKey}`;
  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem(key);
    return saved == null ? defaultOpen : saved === 'open';
  });

  const toggle = () => {
    setOpen((current) => {
      localStorage.setItem(key, current ? 'closed' : 'open');
      return !current;
    });
  };

  return (
    <section className={`${allowOverflow ? 'overflow-visible' : 'overflow-hidden'} rounded-xl border border-slate-100 bg-white shadow-sm ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 sm:px-5"
      >
        {Icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Icon size={17} /></span>}
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-800">{title}</span>
          {subtitle && <span className="mt-0.5 block text-xs text-slate-500">{subtitle}</span>}
        </span>
        {summary && <span className="hidden shrink-0 text-right text-xs font-semibold text-slate-500 sm:block">{summary}</span>}
        <ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div id={contentId} className={`border-t border-slate-100 p-4 sm:p-5 ${contentClassName}`}>{children}</div>}
    </section>
  );
}
