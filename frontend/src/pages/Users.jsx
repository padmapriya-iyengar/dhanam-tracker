import { Crown, Plus, ShieldCheck, Trash2, UserCog, Users as UsersIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { householdsApi } from '../services/api';

export default function Users() {
  const { currentUser, households, activeHouseholdId, loadHouseholds } = useApp();
  const active = households.find((item) => item.householdId === activeHouseholdId);
  const canManage = ['owner', 'admin'].includes(active?.role);
  const [members, setMembers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'contributor' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const refresh = async () => activeHouseholdId && setMembers((await householdsApi.members(activeHouseholdId)).data);
  useEffect(() => { refresh().catch((err) => setError(err.response?.data?.error || err.message)); }, [activeHouseholdId]);

  const invite = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const { data } = await householdsApi.invite(activeHouseholdId, form);
      setMessage(data.inviteToken ? `Development invitation token: ${data.inviteToken}` : 'Invitation email sent.');
      setModalOpen(false); setForm({ email: '', role: 'contributor' }); await refresh();
    } catch (err) { setError(err.response?.data?.error || err.message); } finally { setSaving(false); }
  };
  const update = async (membership, data) => {
    try { await householdsApi.updateMember(activeHouseholdId, membership.id, data); await refresh(); await loadHouseholds(); }
    catch (err) { setError(err.response?.data?.error || err.message); }
  };
  const transfer = async (membership) => {
    if (!confirm(`Transfer ownership to ${membership.email}? You will become an administrator.`)) return;
    try { await householdsApi.transferOwnership(activeHouseholdId, membership.id); await refresh(); await loadHouseholds(); }
    catch (err) { setError(err.response?.data?.error || err.message); }
  };

  if (currentUser?.isDemo) return <div className="card text-center py-12"><UserCog size={40} className="text-slate-200 mx-auto mb-3"/><p className="text-slate-600 font-semibold">Collaborator management is unavailable in demo mode.</p></div>;
  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="page-title">Collaborators</h1><p className="text-sm text-slate-500 mt-0.5">People who can view and contribute to {active?.householdName || 'this household'}</p></div>{canManage && <button onClick={() => setModalOpen(true)} className="btn-primary w-full justify-center sm:w-auto"><Plus size={15}/> Invite collaborator</button>}</div>
    {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</p>}
    {message && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 break-all">{message}</p>}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{members.map((member) => <div key={member.id} className="card space-y-3">
      <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center"><UsersIcon size={20}/></div><div className="min-w-0 flex-1"><p className="font-semibold text-slate-800 truncate">{member.email}</p><p className="text-xs text-slate-400 capitalize">{member.status} · {member.role}</p></div>{member.role === 'owner' && <Crown size={18} className="text-amber-500"/>}</div>
      {canManage && member.role !== 'owner' && <div className="flex flex-wrap gap-2"><select className="input flex-1" value={member.role} disabled={active?.role !== 'owner'} onChange={(e) => update(member, { role: e.target.value })}><option value="contributor">Contributor</option><option value="admin">Admin</option></select>{active?.role === 'owner' && member.status === 'active' && <button className="btn-secondary" title="Transfer ownership" onClick={() => transfer(member)}><ShieldCheck size={16}/></button>}<button className="btn-secondary text-rose-600" title="Remove" onClick={() => confirm(`Remove ${member.email}?`) && update(member, { status: 'removed' })}><Trash2 size={16}/></button></div>}
    </div>)}</div>
    <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Invite collaborator" size="sm"><form onSubmit={invite} className="space-y-4"><div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div><div><label className="label">Role</label><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="contributor">Contributor</option><option value="admin">Admin</option></select></div><div className="flex gap-2"><button type="button" className="btn-secondary flex-1 justify-center" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn-primary flex-1 justify-center" disabled={saving}>{saving ? 'Sending…' : 'Send invitation'}</button></div></form></Modal>
  </div>;
}
