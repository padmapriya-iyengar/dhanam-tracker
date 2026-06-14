import { Pencil, RefreshCw, X, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import DirhamSymbol from './DirhamSymbol';
import { categoryGoalsApi, fmt } from '../services/api';

const DEFAULT_GOAL = 5000;

function getBarColor(pct) {
  if (pct >= 100) return 'bg-rose-500';
  if (pct >= 80) return 'bg-amber-400';
  if (pct >= 50) return 'bg-blue-500';
  return 'bg-emerald-500';
}

function getTextColor(pct) {
  if (pct >= 100) return 'text-rose-500';
  if (pct >= 80) return 'text-amber-500';
  if (pct >= 50) return 'text-blue-500';
  return 'text-emerald-600';
}

function CategoryRow({ category, goalFromDB, onGoalSaved }) {
  const { categoryId, name, color, total } = category;
  const [goal, setGoal] = useState(goalFromDB ?? DEFAULT_GOAL);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setGoal(goalFromDB ?? DEFAULT_GOAL); }, [goalFromDB]);

  const pct = goal > 0 ? Math.min((total / goal) * 100, 100) : 0;
  const isOver = total > goal;

  const startEdit = () => { setDraft(String(goal)); setEditing(true); };
  const cancelEdit = () => setEditing(false);

  const commitEdit = async () => {
    const val = parseFloat(draft);
    if (!isNaN(val) && val > 0) {
      setSaving(true);
      try {
        await categoryGoalsApi.update(categoryId, val);
        setGoal(val);
        onGoalSaved?.();
      } finally {
        setSaving(false);
      }
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
            style={{ background: color || '#6366f1' }}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700 truncate">{name}</p>
            <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5 flex-wrap">
              <span>
                <DirhamSymbol className="h-[0.75em] w-auto inline align-middle" />
                {fmt(total)} spent of{' '}
              </span>
              {editing ? (
                <span className="flex items-center gap-1.5 mt-1 w-full">
                  <DirhamSymbol className="h-[0.75em] w-auto inline align-middle text-slate-500 flex-shrink-0" />
                  <input
                    autoFocus
                    type="number"
                    inputMode="numeric"
                    min={1}
                    className="w-24 text-xs bg-indigo-50 border border-indigo-300 rounded px-2 py-1 text-slate-700 outline-none focus:ring-1 focus:ring-indigo-400"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={handleKeyDown}
                    disabled={saving}
                  />
                  <button
                    onMouseDown={commitEdit}
                    className="p-1.5 text-emerald-500 hover:text-emerald-600 active:text-emerald-700 transition-colors rounded-md hover:bg-emerald-50"
                    title="Save"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onMouseDown={cancelEdit}
                    className="p-1.5 text-slate-400 hover:text-slate-600 active:text-slate-700 transition-colors rounded-md hover:bg-slate-100"
                    title="Cancel"
                  >
                    <X size={14} />
                  </button>
                </span>
              ) : (
                <button
                  onClick={startEdit}
                  className="inline-flex items-center gap-0.5 text-indigo-500 active:text-indigo-700 hover:text-indigo-700 hover:underline transition-colors"
                  title="Edit goal"
                >
                  <DirhamSymbol className="h-[0.75em] w-auto inline align-middle" />
                  {fmt(goal)} goal
                  <Pencil size={10} className="ml-0.5 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Percentage badge */}
        <span className={`text-xs sm:text-sm font-bold flex-shrink-0 ${getTextColor(isOver ? 100 : pct)}`}>
          {isOver
            ? `${(((total - goal) / goal) * 100).toFixed(0)}% over`
            : `${pct.toFixed(0)}% used`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(isOver ? 100 : pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Status line */}
      <p className="text-xs text-slate-400">
        {isOver ? (
          <span className="text-rose-500 font-medium">
            Over budget by <DirhamSymbol className="h-[0.75em] w-auto inline align-middle" />
            {fmt(total - goal)}
          </span>
        ) : (
          <>
            <DirhamSymbol className="h-[0.75em] w-auto inline align-middle" />
            {fmt(goal - total)} remaining
          </>
        )}
      </p>
    </div>
  );
}

export default function CategoryGoalsWidget({ expenseByCategory }) {
  const [goalsMap, setGoalsMap] = useState({});
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const categories = expenseByCategory || [];

  const loadGoals = async () => {
    try {
      const { data } = await categoryGoalsApi.getAll();
      setGoalsMap(data);
      setLastUpdated(new Date());
    } catch {
      // fall back to defaults silently
    }
  };

  useEffect(() => { loadGoals(); }, []);

  const overCount = categories.filter((c) => c.total > (goalsMap[c.categoryId] ?? DEFAULT_GOAL)).length;

  if (categories.length === 0) {
    return (
      <div className="card flex items-center justify-center h-28 text-sm text-slate-400">
        No expense categories this month.
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="font-semibold text-slate-700">Category Goals</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Monthly limits ·{' '}
            <span className="text-indigo-500 sm:hidden">tap any goal to edit</span>
            <span className="text-indigo-500 hidden sm:inline">click any goal amount to edit</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {overCount > 0 && (
            <span className="bg-rose-50 text-rose-500 text-xs font-semibold px-2 py-0.5 rounded-full border border-rose-100">
              {overCount} over budget
            </span>
          )}
          <button
            onClick={loadGoals}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400 mb-5">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
          On track (&lt;50%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block flex-shrink-0" />
          Halfway (50–80%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block flex-shrink-0" />
          Nearing limit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block flex-shrink-0" />
          Over budget
        </span>
      </div>

      {/* Category rows */}
      <div className="space-y-5">
        {categories.map((cat, i) => (
          <div key={cat.categoryId} className={i > 0 ? 'pt-5 border-t border-slate-50' : ''}>
            <CategoryRow
              category={cat}
              goalFromDB={goalsMap[cat.categoryId]}
              onGoalSaved={loadGoals}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 text-slate-300 text-xs mt-5 pt-4 border-t border-slate-50">
        <RefreshCw size={11} />
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>
    </div>
  );
}
