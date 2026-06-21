import { Edit2, Plus, UserCog } from 'lucide-react';
import { useState } from 'react';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { usersApi } from '../services/api';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f97316', '#ec4899', '#f59e0b', '#8b5cf6', '#ef4444'];
const CURRENCIES = [
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'INR', label: 'INR - Indian Rupee' },
];
const emptyForm = { name: '', email: '', password: '', color: '#6366f1', currency: 'AED' };

export default function Users() {
  const { currentUser, logout, refreshCurrentUser, refreshUsers, users } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setSaveError('');
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setEditing(user._id);
    setForm({ name: user.name, email: user.email, password: '', color: user.color || '#6366f1', currency: user.currency || 'AED' });
    setSaveError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password;
      const { data: savedUser } = editing ? await usersApi.update(editing, payload) : await usersApi.create(payload);
      setModalOpen(false);
      await refreshUsers();
      if (editing === currentUser?._id) refreshCurrentUser(savedUser);
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (user) => {
    if (!confirm(`Deactivate ${user.name}? Their data will remain stored but hidden until reactivated from the database.`)) return;
    await usersApi.delete(user._id);
    await refreshUsers();
    if (user._id === currentUser?._id) logout();
  };

  if (currentUser?.isDemo) {
    return (
      <div className="card text-center py-12">
        <UserCog size={40} className="text-slate-200 mx-auto mb-3" />
        <p className="text-slate-600 font-semibold">User management is not available in demo mode.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage private application users</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={15} /> Add User
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <div key={user._id} className="card flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
              style={{ background: user.color }}
            >
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-800 truncate">{user.name}</p>
                {user._id === currentUser?._id && <span className="badge bg-indigo-50 text-indigo-600">Active</span>}
              </div>
              <p className="text-sm text-slate-500 truncate">{user.email}</p>
              <p className="text-xs text-slate-400 truncate">{user.currency || 'AED'}</p>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => openEdit(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                <Edit2 size={16} />
              </button>
              <button onClick={() => deactivate(user)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                <UserCog size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'Add User'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {saveError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{saveError}</p>}
          <div>
            <label className="label">Name *</label>
            <input type="text" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Padmapriya" />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="name@example.com" />
          </div>
          <div>
            <label className="label">{editing ? 'New Password' : 'Password *'}</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editing}
              placeholder={editing ? 'Leave blank to keep existing password' : 'Set a password'}
            />
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((currency) => (
                <option key={currency.value} value={currency.value}>{currency.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-xl transition-transform ${form.color === c ? 'scale-110 ring-2 ring-offset-1 ring-slate-400' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Add User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
