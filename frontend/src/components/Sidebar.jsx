import { BarChart2, Building2, CreditCard, Home, Lightbulb, ShoppingCart, Tag, TrendingUp, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard', end: true },
  { to: '/income', icon: TrendingUp, label: 'Income' },
  { to: '/expenses', icon: ShoppingCart, label: 'Expenses' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/reports', icon: BarChart2, label: 'Reports' },
  { to: '/insights', icon: Lightbulb, label: 'AI Insights' },
  { to: '/savings', icon: Building2, label: 'Savings' },
  { to: '/credit-cards', icon: CreditCard, label: 'Credit Cards' },
  { to: '/members', icon: Users, label: 'Members' },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-white border-r border-slate-100 flex flex-col fixed inset-y-0 left-0 z-30">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Banknote */}
              <rect x="1" y="2.5" width="11" height="7" rx="1.2" stroke="white" strokeWidth="1.4"/>
              <circle cx="6.5" cy="6" r="1.6" stroke="white" strokeWidth="1.2"/>
              {/* Coin stack */}
              <ellipse cx="14" cy="14.2" rx="3" ry="1.1" stroke="white" strokeWidth="1.3"/>
              <ellipse cx="14" cy="12.6" rx="3" ry="1.1" stroke="white" strokeWidth="1.3"/>
              <line x1="11" y1="12.6" x2="11" y2="14.2" stroke="white" strokeWidth="1.3"/>
              <line x1="17" y1="12.6" x2="17" y2="14.2" stroke="white" strokeWidth="1.3"/>
            </svg>
          </div>
          <div>
            <p className="font-bold text-slate-800 text-base leading-tight">Dhanam</p>
            <p className="text-xs text-slate-400">Family Finance</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">Dhanam Tracker v1.0</p>
      </div>
    </aside>
  );
}
