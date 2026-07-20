import { ArrowRightLeft, BarChart2, BellRing, Building2, CreditCard, Home, Landmark, Lightbulb, LogOut, ShoppingCart, Tag, TrendingUp, UserCog, Users, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard', end: true },
  { to: '/income', icon: TrendingUp, label: 'Income' },
  { to: '/expenses', icon: ShoppingCart, label: 'Expenses' },
  { to: '/subscriptions', icon: BellRing, label: 'Recurring Expenses' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/reports', icon: BarChart2, label: 'Reports' },
  { to: '/insights', icon: Lightbulb, label: 'AI Insights' },
  { to: '/accounts', icon: Landmark, label: 'Account Overview' },
  { to: '/savings', icon: Building2, label: 'Savings' },
  { to: '/credit-cards', icon: CreditCard, label: 'Credit Cards' },
  { to: '/transfers', icon: ArrowRightLeft, label: 'Transfers' },
  { to: '/members', icon: Users, label: 'Members' },
  { to: '/users', icon: UserCog, label: 'Users' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { currentUser, logout } = useApp();
  const visibleNavItems = currentUser?.isDemo ? navItems.filter((item) => item.to !== '/users') : navItems;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-slate-100 flex flex-col
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="2.5" width="11" height="7" rx="1.2" stroke="white" strokeWidth="1.4"/>
                <circle cx="6.5" cy="6" r="1.6" stroke="white" strokeWidth="1.2"/>
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
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {visibleNavItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
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
          {currentUser && (
            <div className="mb-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: currentUser.color }}>
                {currentUser.name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{currentUser.name}</p>
                <p className="text-xs text-slate-400 truncate">{currentUser.isDemo ? 'Demo data' : 'Private data'}</p>
              </div>
              <button onClick={logout} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Log out">
                <LogOut size={16} />
              </button>
            </div>
          )}
          <p className="text-xs text-slate-400 text-center">Dhanam Tracker v1.0</p>
        </div>
      </aside>
    </>
  );
}
