import { Edit2, Plus, User } from 'lucide-react';
import { useState } from 'react';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { membersApi } from '../services/api';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f97316', '#ec4899', '#f59e0b', '#8b5cf6', '#ef4444'];
const emptyForm = { name: '', role: 'other', color: '#6366f1' };

export default function Members() {
  const { members, refreshMembers } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const openAdd = () => { setEditing(null); setForm(emptyForm); setSaveError(''); setModalOpen(true); };
  const openEdit = (m) => {
    setEditing(m._id);
    setForm({ name: m.name, role: m.role, color: m.color });
    setSaveError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    try {
      if (editing) await membersApi.update(editing, form);
      else await membersApi.create(form);
      setModalOpen(false);
      await refreshMembers();
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Failed to save member');
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = { self: 'Self', husband: 'Kiran / Partner', other: 'Other' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your household members</p>
        </div>
        <button onClick={openAdd} className="btn-primary w-full justify-center sm:w-auto">
          <Plus size={15} /> Add Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((m) => (
          <div key={m._id} className="card flex items-center gap-3 sm:gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
              style={{ background: m.color }}
            >
              {m.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800">{m.name}</p>
              <p className="text-sm text-slate-500">{roleLabel[m.role] || m.role}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: m.color }} />
                <span className="text-xs text-slate-400">{m.color}</span>
              </div>
            </div>
            <button onClick={() => openEdit(m)} className="flex-shrink-0 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              <Edit2 size={16} />
            </button>
          </div>
        ))}

        {members.length === 0 && (
          <div className="col-span-3 card text-center py-12">
            <User size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No members yet. Run the seed script to add default members.</p>
            <button onClick={openAdd} className="btn-primary mt-4 w-full justify-center sm:w-auto">
              <Plus size={15} /> Add Member
            </button>
          </div>
        )}
      </div>

      <div className="card bg-indigo-50 border-indigo-100">
        <p className="text-sm text-indigo-700 font-medium mb-1">Tip: Default Members</p>
        <p className="text-xs text-indigo-600">
          Run <code className="bg-indigo-100 px-1.5 py-0.5 rounded font-mono">npm run seed</code> from the backend folder to automatically create default members (Padmapriya & Kiran) and 12 expense categories with sub-categories.
        </p>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Member' : 'Add Member'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          {saveError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{saveError}</p>}
          <div>
            <label className="label">Name *</label>
            <input type="text" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Padmapriya" />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="self">Self</option>
              <option value="husband">Kiran / Partner</option>
              <option value="other">Other</option>
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
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
