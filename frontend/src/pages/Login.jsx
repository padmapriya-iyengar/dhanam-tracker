import { ArrowLeft, Lock, Mail, UserPlus, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { authApi } from '../services/api';
import { useApp } from '../context/AppContext';

const demoCredentials = { email: 'demo@example.com', password: 'demo' };
const googleClientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID;

function GoogleButton({ onCredential, disabled, onConfigurationError }) {
  const target = useRef(null);
  useEffect(() => {
    if (!googleClientId || !target.current) return undefined;
    const render = () => {
      if (!window.google || !target.current) return;
      window.google.accounts.id.initialize({ client_id: googleClientId, callback: ({ credential }) => onCredential(credential) });
      target.current.innerHTML = '';
      window.google.accounts.id.renderButton(target.current, { theme: 'outline', size: 'medium', shape: 'rectangular', width: Math.min(target.current.clientWidth || 400, 400), text: 'continue_with' });
    };
    let script = document.querySelector('script[data-dhanam-google]');
    if (!script) {
      script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.dataset.dhanamGoogle = 'true'; document.head.appendChild(script);
    }
    script.addEventListener('load', render); render();
    return () => script?.removeEventListener('load', render);
  }, [onCredential]);
  if (!googleClientId) return <button type="button" className="btn-secondary w-full justify-center" disabled={disabled} onClick={onConfigurationError}>
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.38l-3.24-2.53c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.13H3.05v2.61A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.92A6 6 0 0 1 6.08 12c0-.67.12-1.32.32-1.92V7.47H3.05A10 10 0 0 0 2 12c0 1.61.39 3.14 1.05 4.53l3.35-2.61Z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.95 5.47l3.35 2.61c.79-2.37 3-4.13 5.6-4.13Z"/></svg>
    Continue with Google
  </button>;
  return <div className={`flex min-h-10 w-full justify-center overflow-hidden rounded-lg ${disabled ? 'pointer-events-none opacity-50' : ''}`} ref={target} />;
}

export default function Login() {
  const { login, establishSession } = useApp();
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action') || '';
  const initialToken = params.get('token') || '';
  const inviteToken = params.get('invite') || params.get('inviteToken') || (action === 'accept-invite' || window.location.pathname.includes('accept-invite') ? initialToken : '');
  const initialMode = action === 'reset-password' || window.location.pathname.includes('reset-password') ? 'reset' : action === 'verify-email' || window.location.pathname.includes('verify-email') ? 'verify' : inviteToken ? 'signup' : 'login';
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: '', email: '', password: '', token: initialToken });
  const [error, setError] = useState('');
  const [message, setMessage] = useState(inviteToken ? 'Create an account with the invited email to join the shared household.' : '');
  const [saving, setSaving] = useState(false);

  const run = async (operation) => {
    setSaving(true); setError(''); setMessage('');
    try { await operation(); } catch (err) { setError(err.response?.data?.error || err.message || 'Something went wrong'); } finally { setSaving(false); }
  };
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      if (mode === 'login') return login(form);
      if (mode === 'signup') {
        const { data } = await authApi.signup({ name: form.name, email: form.email, password: form.password, ...(inviteToken ? { inviteToken } : {}) });
        setMessage(data.message); setMode(data.verified ? 'login' : 'verify'); return;
      }
      if (mode === 'verify') return establishSession((await authApi.verifyEmail(form.token)).data);
      if (mode === 'forgot') { setMessage((await authApi.forgotPassword(form.email)).data.message); return; }
      if (mode === 'reset') { setMessage((await authApi.resetPassword(form.token, form.password)).data.message); setMode('login'); }
    });
  };
  const google = (credential) => run(async () => establishSession((await authApi.google(credential, inviteToken)).data));
  const changeMode = (next) => { setMode(next); setError(''); setMessage(''); };

  const titles = { login: 'Sign in to continue', signup: inviteToken ? 'Join your household' : 'Create your account', verify: 'Verify your email', forgot: 'Reset your password', reset: 'Choose a new password' };
  return <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(5,150,105,0.2),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(13,148,136,0.16),_transparent_38%)]" />
    <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white/20 p-5 sm:p-7">
      <div className="flex items-center gap-3 mb-6"><div className="w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center text-white"><Wallet size={22} /></div><div><h1 className="text-xl font-bold text-slate-800">Dhanam Tracker</h1><p className="text-sm text-slate-500">{titles[mode]}</p></div></div>
      <form onSubmit={submit} className="space-y-4">
        {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>}
        {message && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{message}</p>}
        {mode === 'signup' && <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoComplete="name" /></div>}
        {['login', 'signup', 'forgot'].includes(mode) && <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" /></div>}
        {['login', 'signup', 'reset'].includes(mode) && <div><label className="label">{mode === 'reset' ? 'New password' : 'Password'}</label><input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={mode === 'login' ? undefined : 10} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /><p className="text-xs text-slate-400 mt-1">{mode !== 'login' && 'At least 10 characters with letters and numbers.'}</p></div>}
        {['verify', 'reset'].includes(mode) && <div><label className="label">Security token</label><input className="input" value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} required autoCapitalize="none" /></div>}
        <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60" disabled={saving}>{mode === 'signup' ? <UserPlus size={15} /> : mode === 'forgot' ? <Mail size={15} /> : <Lock size={15} />}{saving ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'verify' ? 'Verify email' : mode === 'forgot' ? 'Send reset link' : 'Reset password'}</button>
      </form>
      {(mode === 'login' || mode === 'signup') && <><div className="flex items-center gap-3 my-5"><span className="h-px bg-slate-200 flex-1"/><span className="text-xs text-slate-400">OR</span><span className="h-px bg-slate-200 flex-1"/></div><GoogleButton onCredential={google} disabled={saving} onConfigurationError={() => setError('Google sign-in needs a Web OAuth client ID. Set VITE_GOOGLE_WEB_CLIENT_ID and restart the web app.')} /></>}
      <div className="mt-5 flex flex-col items-stretch gap-2 text-sm sm:flex-row sm:justify-center">
        {mode === 'login' && <><button type="button" className="rounded-lg px-3 py-2 font-semibold text-emerald-700 hover:bg-emerald-50" onClick={() => changeMode('signup')}>Create an account</button><button type="button" className="rounded-lg px-3 py-2 font-semibold text-emerald-700 hover:bg-emerald-50" onClick={() => changeMode('forgot')}>Forgot password?</button></>}
        {mode !== 'login' && <button type="button" className="inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 font-semibold text-emerald-700 hover:bg-emerald-50" onClick={() => changeMode('login')}><ArrowLeft size={14}/> Back to sign in</button>}
      </div>
      {mode === 'login' && <div className="mt-5 pt-5 border-t border-slate-100"><button type="button" className="btn-secondary w-full justify-center" onClick={() => run(() => login(demoCredentials))} disabled={saving}>Open Demo Account</button></div>}
    </div>
  </div>;
}
