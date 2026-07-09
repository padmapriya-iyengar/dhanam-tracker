import {
  AlertCircle, CheckCircle2, Coins, Lightbulb, ListChecks, PiggyBank, RefreshCw,
  Sparkles, Target, TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import DirhamSymbol from '../components/DirhamSymbol';
import { fmt, insightsApi } from '../services/api';

const sectionConfig = {
  'overall financial health': {
    title: 'Overall Financial Health',
    eyebrow: 'Household snapshot',
    icon: TrendingUp,
    accent: 'border-l-indigo-500',
    iconClass: 'bg-indigo-50 text-indigo-600',
  },
  'spending insights': {
    title: 'Spending Insights',
    eyebrow: 'Where money is moving',
    icon: Target,
    accent: 'border-l-sky-500',
    iconClass: 'bg-sky-50 text-sky-600',
  },
  'top 3 spending insights': {
    title: 'Spending Insights',
    eyebrow: 'Where money is moving',
    icon: Target,
    accent: 'border-l-sky-500',
    iconClass: 'bg-sky-50 text-sky-600',
  },
  'savings opportunities': {
    title: 'Savings Opportunities',
    eyebrow: 'Near-term reductions',
    icon: PiggyBank,
    accent: 'border-l-emerald-500',
    iconClass: 'bg-emerald-50 text-emerald-600',
  },
  'positive patterns': {
    title: 'Positive Patterns',
    eyebrow: 'What is working',
    icon: CheckCircle2,
    accent: 'border-l-amber-500',
    iconClass: 'bg-amber-50 text-amber-600',
  },
  'action plan': {
    title: 'Action Plan',
    eyebrow: 'Next month',
    icon: ListChecks,
    accent: 'border-l-violet-500',
    iconClass: 'bg-violet-50 text-violet-600',
  },
};

const normalizeHeading = (value) => value
  .toLowerCase()
  .replace(/\s+[-–—].*$/, '')
  .replace(/\s*\([^)]*\)/g, '')
  .replace(/^\d+\.\s*/, '')
  .trim();

function splitInsightsIntoSections(markdown) {
  if (!markdown) return [];

  const headingRegex = /^#{1,3}\s+(.+)$/gm;
  const matches = [...markdown.matchAll(headingRegex)];

  if (matches.length) {
    return matches.map((match, index) => {
      const heading = match[1].replace(/\*\*/g, '').trim();
      const start = match.index + match[0].length;
      const end = matches[index + 1]?.index ?? markdown.length;
      return { heading, body: markdown.slice(start, end).trim() };
    }).filter((section) => section.body);
  }

  const knownHeadings = [
    'Overall Financial Health',
    'Top 3 Spending Insights',
    'Spending Insights',
    'Savings Opportunities',
    'Positive Patterns',
    'Action Plan',
  ];
  const plainHeadingRegex = new RegExp(`^(${knownHeadings.join('|')})(?:\\s*[-–—].*)?$`, 'gmi');
  const plainMatches = [...markdown.matchAll(plainHeadingRegex)];

  if (!plainMatches.length) return [{ heading: 'Financial Insights', body: markdown.trim() }];

  return plainMatches.map((match, index) => {
    const heading = match[1].trim();
    const start = match.index + match[0].length;
    const end = plainMatches[index + 1]?.index ?? markdown.length;
    return { heading, body: markdown.slice(start, end).trim() };
  }).filter((section) => section.body);
}

function InsightSection({ section }) {
  const key = normalizeHeading(section.heading);
  const config = sectionConfig[key] || {
    title: section.heading,
    eyebrow: 'AI recommendation',
    icon: Sparkles,
    accent: 'border-l-slate-300',
    iconClass: 'bg-slate-100 text-slate-600',
  };
  const Icon = config.icon;

  return (
    <section className={`bg-white rounded-lg shadow-sm border border-slate-100 border-l-4 ${config.accent} p-5`}>
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.iconClass}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{config.eyebrow}</p>
          <h2 className="text-base font-bold text-slate-800 leading-tight">{config.title}</h2>
        </div>
      </div>
      <div className="insight-markdown">
        <ReactMarkdown>{section.body}</ReactMarkdown>
      </div>
    </section>
  );
}

export default function Insights() {
  const [insights, setInsights] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [model, setModel] = useState(null);
  const insightSections = splitInsightsIntoSections(insights);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await insightsApi.generate();
      setInsights(data.insights);
      setSummary(data.summary);
      setGeneratedAt(data.generatedAt);
      setModel(data.model);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate insights. Please check your OpenAI API key in the backend .env file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">AI Insights</h1>
          <p className="text-sm text-slate-500 mt-0.5">Powered by OpenAI — personalized financial advice for your household</p>
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
              Click "Generate Insights" and OpenAI will analyze your last 3 months of income and expenses to provide personalized recommendations for your household.
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
            <p className="text-xs text-slate-400 mt-4">Requires OPENAI_API_KEY in backend .env</p>
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
                Make sure you've set OPENAI_API_KEY in backend/.env and restarted the server.
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
          <p className="text-sm text-slate-500 mt-1">OpenAI is reviewing your last 3 months of data</p>
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
                  <Coins size={14} className="text-emerald-600" />
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Avg Monthly Income</p>
                </div>
                <p className="text-xl font-bold text-emerald-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(Math.round(summary.avgMonthlyIncome))}</p>
              </div>
              <div className="card bg-rose-50 border-rose-100">
                <div className="flex items-center gap-2 mb-1">
                  <Coins size={14} className="text-rose-600" />
                  <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">Avg Monthly Expense</p>
                </div>
                <p className="text-xl font-bold text-rose-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(Math.round(summary.avgMonthlyExpense))}</p>
              </div>
              <div className="card bg-indigo-50 border-indigo-100">
                <div className="flex items-center gap-2 mb-1">
                  <Coins size={14} className="text-indigo-600" />
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">3-Month Savings</p>
                </div>
                <p className="text-xl font-bold text-indigo-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(summary.savings)}</p>
              </div>
              <div className="card bg-amber-50 border-amber-100">
                <div className="flex items-center gap-2 mb-1">
                  <Coins size={14} className="text-amber-600" />
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Savings Rate</p>
                </div>
                <p className="text-xl font-bold text-amber-700">
                  {summary.totalIncome > 0 ? ((summary.savings / summary.totalIncome) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          )}

          {/* AI Insights */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">AI Financial Insights</p>
                {generatedAt && (
                  <p className="text-xs text-slate-400">
                    Generated {new Date(generatedAt).toLocaleString('en-AE')}{model ? ` with ${model}` : ''}
                  </p>
                )}
              </div>
              <button onClick={generate} className="ml-auto btn-secondary py-1.5 px-3 text-xs">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {insightSections.map((section) => (
                <InsightSection key={section.heading} section={section} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
