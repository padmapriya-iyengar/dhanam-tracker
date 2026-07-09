import { ChevronDown, ChevronRight, Edit2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import { categoriesApi } from '../services/api';

const COLORS = ['#6366f1', '#f97316', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#d946ef', '#94a3b8'];
const catForm = { name: '', description: '', color: '#6366f1', icon: 'tag' };
const subForm = { name: '', description: '' };

export default function Categories() {
  const { categories, refreshCategories } = useApp();
  const [expanded, setExpanded] = useState({});
  const [catModal, setCatModal] = useState(false);
  const [subModal, setSubModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [editingSub, setEditingSub] = useState(null);
  const [activeCatId, setActiveCatId] = useState(null);
  const [catFormData, setCatFormData] = useState(catForm);
  const [subFormData, setSubFormData] = useState(subForm);
  const [saving, setSaving] = useState(false);
  const [catError, setCatError] = useState('');
  const [subError, setSubError] = useState('');

  const toggleExpand = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const openAddCat = () => { setEditingCat(null); setCatFormData(catForm); setCatError(''); setCatModal(true); };
  const openEditCat = (cat) => {
    setEditingCat(cat._id);
    setCatFormData({ name: cat.name, description: cat.description || '', color: cat.color, icon: cat.icon || 'tag' });
    setCatError('');
    setCatModal(true);
  };

  const openAddSub = (catId) => { setEditingSub(null); setActiveCatId(catId); setSubFormData(subForm); setSubError(''); setSubModal(true); };
  const openEditSub = (sub, catId) => {
    setEditingSub(sub._id);
    setActiveCatId(catId);
    setSubFormData({ name: sub.name, description: sub.description || '' });
    setSubError('');
    setSubModal(true);
  };

  const saveCat = async (e) => {
    e.preventDefault();
    setSaving(true);
    setCatError('');
    try {
      if (editingCat) await categoriesApi.update(editingCat, catFormData);
      else await categoriesApi.create(catFormData);
      setCatModal(false);
      await refreshCategories();
    } catch (err) {
      setCatError(err.response?.data?.error || err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const deleteCat = async (id) => {
    if (!confirm('Delete this category and all its sub-categories?')) return;
    await categoriesApi.delete(id);
    await refreshCategories();
  };

  const saveSub = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSubError('');
    try {
      if (editingSub) await categoriesApi.updateSub(editingSub, subFormData);
      else await categoriesApi.createSub(activeCatId, subFormData);
      setSubModal(false);
      await refreshCategories();
    } catch (err) {
      setSubError(err.response?.data?.error || err.message || 'Failed to save sub-category');
    } finally {
      setSaving(false);
    }
  };

  const deleteSub = async (id) => {
    if (!confirm('Delete this sub-category?')) return;
    await categoriesApi.deleteSub(id);
    refreshCategories();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="text-sm text-slate-500 mt-0.5">{categories.length} categories configured</p>
        </div>
        <button onClick={openAddCat} className="btn-primary w-full justify-center sm:w-auto">
          <Plus size={15} /> Add Category
        </button>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat._id} className="card p-0 overflow-hidden">
            <div className="flex items-start justify-between gap-2 px-4 py-3">
              <button
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
                onClick={() => toggleExpand(cat._id)}
              >
                <div className="w-8 h-8 rounded-lg flex flex-shrink-0 items-center justify-center" style={{ background: cat.color + '20' }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{cat.name}</p>
                  {cat.description && <p className="text-xs text-slate-400">{cat.description}</p>}
                </div>
                <span className="ml-auto flex-shrink-0 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {cat.subCategories?.length || 0} subs
                </span>
                {expanded[cat._id] ? <ChevronDown size={16} className="mt-0.5 flex-shrink-0 text-slate-400" /> : <ChevronRight size={16} className="mt-0.5 flex-shrink-0 text-slate-400" />}
              </button>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button onClick={() => openEditCat(cat)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => deleteCat(cat._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {expanded[cat._id] && (
              <div className="border-t border-slate-50 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sub-Categories</p>
                  <button onClick={() => openAddSub(cat._id)} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium">
                    <Plus size={12} /> Add Sub
                  </button>
                </div>
                {cat.subCategories?.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No sub-categories yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {cat.subCategories?.map((sub) => (
                      <div key={sub._id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
                        <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{sub.name}</span>
                        <div className="flex items-center gap-0.5 ml-2">
                          <button onClick={() => openEditSub(sub, cat._id)} className="p-1 text-slate-300 hover:text-indigo-600 transition-colors">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => deleteSub(sub._id)} className="p-1 text-slate-300 hover:text-rose-600 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Category Modal */}
      <Modal isOpen={catModal} onClose={() => setCatModal(false)} title={editingCat ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={saveCat} className="space-y-4">
          {catError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{catError}</p>}
          <div>
            <label htmlFor="cat-name" className="label">Name *</label>
            <input id="cat-name" type="text" className="input" value={catFormData.name} onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })} required placeholder="e.g. Food & Dining" />
          </div>
          <div>
            <label htmlFor="cat-desc" className="label">Description</label>
            <input id="cat-desc" type="text" className="input" value={catFormData.description} onChange={(e) => setCatFormData({ ...catFormData, description: e.target.value })} placeholder="Brief description" />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCatFormData({ ...catFormData, color: c })}
                  className={`w-7 h-7 rounded-lg transition-transform ${catFormData.color === c ? 'scale-110 ring-2 ring-offset-1 ring-slate-400' : ''}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          {(() => {
            const idleLabel = editingCat ? 'Update' : 'Add Category';
            const submitLabel = saving ? 'Saving...' : idleLabel;
            return (
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
                <button type="button" onClick={() => setCatModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{submitLabel}</button>
              </div>
            );
          })()}
        </form>
      </Modal>

      {/* Sub-Category Modal */}
      <Modal isOpen={subModal} onClose={() => setSubModal(false)} title={editingSub ? 'Edit Sub-Category' : 'Add Sub-Category'} size="sm">
        <form onSubmit={saveSub} className="space-y-4">
          {subError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{subError}</p>}
          <div>
            <label htmlFor="sub-name" className="label">Name *</label>
            <input id="sub-name" type="text" className="input" value={subFormData.name} onChange={(e) => setSubFormData({ ...subFormData, name: e.target.value })} required placeholder="e.g. Groceries" />
          </div>
          <div>
            <label htmlFor="sub-desc" className="label">Description</label>
            <input id="sub-desc" type="text" className="input" value={subFormData.description} onChange={(e) => setSubFormData({ ...subFormData, description: e.target.value })} placeholder="Brief description" />
          </div>
          {(() => {
            const idleLabel = editingSub ? 'Update' : 'Add';
            const submitLabel = saving ? 'Saving...' : idleLabel;
            return (
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
                <button type="button" onClick={() => setSubModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>{submitLabel}</button>
              </div>
            );
          })()}
        </form>
      </Modal>
    </div>
  );
}
