import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatAssistant from './ChatAssistant';
import LoadingSpinner from './LoadingSpinner';
import { useApp } from '../context/AppContext';
import Login from '../pages/Login';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser, loading } = useApp();

  if (loading) return <LoadingSpinner />;
  if (!currentUser) return <Login />;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:ml-60 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                <rect x="1" y="2.5" width="11" height="7" rx="1.2" stroke="white" strokeWidth="1.4"/>
                <circle cx="6.5" cy="6" r="1.6" stroke="white" strokeWidth="1.2"/>
                <ellipse cx="14" cy="14.2" rx="3" ry="1.1" stroke="white" strokeWidth="1.3"/>
                <ellipse cx="14" cy="12.6" rx="3" ry="1.1" stroke="white" strokeWidth="1.3"/>
                <line x1="11" y1="12.6" x2="11" y2="14.2" stroke="white" strokeWidth="1.3"/>
                <line x1="17" y1="12.6" x2="17" y2="14.2" stroke="white" strokeWidth="1.3"/>
              </svg>
            </div>
            <span className="font-bold text-slate-800 text-base">Dhanam</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
        <ChatAssistant />
      </div>
    </div>
  );
}
