import { Lock, Wallet } from 'lucide-react';
import { useState } from 'react';
import DirhamSymbol from '../components/DirhamSymbol';
import { useApp } from '../context/AppContext';

const demoCredentials = { email: 'demo@example.com', password: 'demo' };

export default function Login() {
  const { login } = useApp();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e, credentials = form) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await login(credentials);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.22),_transparent_35%)]" />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-white/20 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
            <Wallet size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Dhanam Tracker</h1>
            <p className="text-sm text-slate-500">Sign in to continue</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@example.com"
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Password"
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full justify-center" disabled={saving}>
            <Lock size={15} /> {saving ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-slate-100">
          <button
            type="button"
            className="btn-secondary w-full justify-center"
            onClick={(e) => submit(e, demoCredentials)}
            disabled={saving}
          >
            Open Demo Account
          </button>
          <p className="text-xs text-slate-400 mt-3 text-center">
            Demo mode uses sample transactions only. Private income, expense, and savings data require your own login.
          </p>
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center justify-center text-xs text-slate-500">
          AED values use <DirhamSymbol className="h-[0.9em] w-auto mx-1" /> formatting
        </div>
      </div>
    </div>
  );
}
