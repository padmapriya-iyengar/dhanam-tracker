import { TrendingDown, TrendingUp } from 'lucide-react';

export default function StatCard({ title, value, subtitle, change, changeLabel, icon: Icon, color = 'indigo' }) {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  const isPositive = parseFloat(change) >= 0;

  return (
    <div className="card flex items-start gap-3">
      {Icon && (
        <div className={`hidden sm:flex p-2.5 rounded-xl flex-shrink-0 ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        <p className="text-lg sm:text-2xl font-bold text-slate-800 mt-0.5 leading-tight">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        {change !== undefined && (
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{Math.abs(change)}% {changeLabel || 'vs last period'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
