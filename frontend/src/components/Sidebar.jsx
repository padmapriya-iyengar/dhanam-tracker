import { ArrowRightLeft, BarChart2, BellRing, Building2, ChevronDown, CreditCard, Home, Landmark, Lightbulb, LogOut, Monitor, Moon, ShoppingCart, Sun, Tag, TrendingUp, UserCog, Users, WalletCards, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

const NAV_STORAGE_KEY = 'dhanam.sidebarGroup';
const dashboardItem = { to: '/', icon: Home, label: 'Dashboard', end: true };
const navGroups = [
  {
    id: 'transactions',
    label: 'Transactions',
    icon: WalletCards,
    routes: ['/expenses', '/income', '/transfers', '/subscriptions', '/message-import'],
    items: [
      { to: '/expenses', icon: ShoppingCart, label: 'Expenses' },
      { to: '/income', icon: TrendingUp, label: 'Income' },
      { to: '/transfers', icon: ArrowRightLeft, label: 'Transfers' },
      { to: '/subscriptions', icon: BellRing, label: 'Recurring Expenses' },
    ],
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: Landmark,
    routes: ['/accounts', '/savings', '/credit-cards'],
    items: [
      { to: '/accounts', icon: Landmark, label: 'Account Overview' },
      { to: '/savings', icon: Building2, label: 'Savings Accounts' },
      { to: '/credit-cards', icon: CreditCard, label: 'Credit Cards' },
    ],
  },
  {
    id: 'insights',
    label: 'Planning & Insights',
    icon: BarChart2,
    routes: ['/reports', '/insights'],
    items: [
      { to: '/reports', icon: BarChart2, label: 'Reports' },
      { to: '/insights', icon: Lightbulb, label: 'AI Insights' },
    ],
  },
  {
    id: 'manage',
    label: 'Manage',
    icon: UserCog,
    routes: ['/categories', '/members', '/users'],
    items: [
      { to: '/categories', icon: Tag, label: 'Categories' },
      { to: '/members', icon: Users, label: 'Members' },
      { to: '/users', icon: UserCog, label: 'Users' },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { currentUser, logout } = useApp();
  const { mode, setMode } = useTheme();
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState(() => localStorage.getItem(NAV_STORAGE_KEY) || 'transactions');

  useEffect(() => {
    const activeGroup = navGroups.find((group) => group.routes.some((route) => location.pathname === route || location.pathname.startsWith(`${route}/`)));
    if (activeGroup) {
      setOpenGroup(activeGroup.id);
      localStorage.setItem(NAV_STORAGE_KEY, activeGroup.id);
    }
  }, [location.pathname]);

  const toggleGroup = (groupId) => {
    const next = openGroup === groupId ? '' : groupId;
    setOpenGroup(next);
    if (next) localStorage.setItem(NAV_STORAGE_KEY, next);
    else localStorage.removeItem(NAV_STORAGE_KEY);
  };

  const navItem = ({ to, icon: Icon, label, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
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
  );

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

        <nav className="flex-1 overflow-y-auto p-3">
          <div className="mb-2">{navItem(dashboardItem)}</div>
          <div className="space-y-1 border-t border-slate-100 pt-2">
            {navGroups.map((group) => {
              const GroupIcon = group.icon;
              const expanded = openGroup === group.id;
              const active = group.routes.some((route) => location.pathname === route || location.pathname.startsWith(`${route}/`));
              const items = currentUser?.isDemo ? group.items.filter((item) => item.to !== '/users') : group.items;
              return (
                <section key={group.id}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={expanded}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide transition-colors ${
                      active ? 'text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    <GroupIcon size={17} className={active ? 'text-indigo-600' : 'text-slate-400'} />
                    <span className="flex-1">{group.label}</span>
                    <ChevronDown size={15} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                  {expanded && <div className="ml-3 mt-0.5 space-y-0.5 border-l border-slate-100 pl-2">{items.map(navItem)}</div>}
                </section>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="mb-3">
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Appearance</p>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'Auto', icon: Monitor },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  title={`${label} theme`}
                  className={`flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10px] font-semibold transition-colors ${
                    mode === value ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>
          </div>
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
