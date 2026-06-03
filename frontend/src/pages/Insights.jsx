import { AlertCircle, IndianRupee, Lightbulb, RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { fmt, insightsApi } from '../services/api';

export default function Insights() {
  const [insights, setInsights] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await insightsApi.generate();
      setInsights(data.insights);
      setSummary(data.summary);
      setGeneratedAt(data.generatedAt);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate insights. Please check your AI API key in the backend .env file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">AI Insights</h1>
          <p className="text-sm text-slate-500 mt-0.5">Powered by Claude AI — personalized financial advice for your household</p>
        </div>
        <button onClick={generate} disabled={loading} className="btn-primary">
          {loading ? (
            <><RefreshCw size={15} className="animate-spin" /> Analyzing...</>
          ) : (
            <><Sparkles size={15} /> Generate Insights</>
          )}
        </button>
      </div>

      {/* How it works */}
      {!insights && !loading && !error && (
        <div className="card border-dashed border-2 border-indigo-100 bg-indigo-50/30">
          <div className="text-center py-8 max-w-md mx-auto">
            <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lightbulb size={28} className="text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-700 text-lg mb-2">Get Smart Financial Insights</h3>
            <p className="text-slate-500 text-sm mb-6">
              Click "Generate Insights" and Claude AI will analyze your last 3 months of income and expenses to provide personalized recommendations for your household.
            </p>
            <div className="grid grid-cols-3 gap-3 text-left">
              {[
                { emoji: '📊', label: 'Spending patterns' },
                { emoji: '💰', label: 'Savings tips' },
                { emoji: '📈', label: 'Action plan' },
              ].map(({ emoji, label }) => (
                <div key={label} className="bg-white rounded-xl p-3 text-center border border-indigo-100">
                  <div className="text-2xl mb-1">{emoji}</div>
                  <p className="text-xs font-medium text-slate-600">{label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4">Requires Anthropic API key in backend .env</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card border border-rose-100 bg-rose-50">
          <div className="flex gap-3">
            <AlertCircle size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-rose-700 text-sm">Failed to generate insights</p>
              <p className="text-rose-600 text-sm mt-1">{error}</p>
              <p className="text-xs text-rose-500 mt-2">
                Make sure you've set ANTHROPIC_API_KEY in backend/.env and restarted the server.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="card text-center py-12">
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Sparkles size={24} className="text-indigo-600" />
          </div>
          <p className="font-medium text-slate-700">Analyzing your finances...</p>
          <p className="text-sm text-slate-500 mt-1">Claude is reviewing your last 3 months of data</p>
        </div>
      )}

      {/* Insights Result */}
      {insights && !loading && (
        <>
          {/* Quick Stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="card bg-emerald-50 border-emerald-100">
                <div className="flex items-center gap-2 mb-1">
                  <IndianRupee size={14} className="text-emerald-600" />
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Avg Monthly Income</p>
                </div>
                <p className="text-xl font-bold text-emerald-700">{fmt(Math.round(summary.avgMonthlyIncome))}</p>
              </div>
              <div className="card bg-rose-50 border-rose-100">
                <div className="flex items-center gap-2 mb-1">
                  <IndianRupee size={14} className="text-rose-600" />
                  <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">Avg Monthly Expense</p>
                </div>
                <p className="text-xl font-bold text-rose-700">{fmt(Math.round(summary.avgMonthlyExpense))}</p>
              </div>
              <div className="card bg-indigo-50 border-indigo-100">
                <div className="flex items-center gap-2 mb-1">
                  <IndianRupee size={14} className="text-indigo-600" />
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">3-Month Savings</p>
                </div>
                <p className="text-xl font-bold text-indigo-700">{fmt(summary.savings)}</p>
              </div>
              <div className="card bg-amber-50 border-amber-100">
                <div className="flex items-center gap-2 mb-1">
                  <IndianRupee size={14} className="text-amber-600" />
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Savings Rate</p>
                </div>
                <p className="text-xl font-bold text-amber-700">
                  {summary.totalIncome > 0 ? ((summary.savings / summary.totalIncome) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          )}

          {/* AI Insights Card */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">AI Financial Insights</p>
                {generatedAt && (
                  <p className="text-xs text-slate-400">Generated {new Date(generatedAt).toLocaleString('en-AE')}</p>
                )}
              </div>
              <button onClick={generate} className="ml-auto btn-secondary py-1.5 px-3 text-xs">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
            <div className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-headings:font-semibold prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-700">
              <ReactMarkdown>{insights}</ReactMarkdown>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
