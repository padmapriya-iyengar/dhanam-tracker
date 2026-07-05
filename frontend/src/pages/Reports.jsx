import { format } from 'date-fns';
import { BarChart2, ChevronDown, ChevronRight, Share2, SlidersHorizontal, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line,
  LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import DirhamSymbol from '../components/DirhamSymbol';
import { useApp } from '../context/AppContext';
import { fmt, getCurrencyCode, reportsApi } from '../services/api';

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'halfyearly', label: 'Half-Yearly' },
  { value: 'yearly', label: 'Yearly' },
];

const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: format(new Date(2024, i, 1), 'MMMM') }));
const COLORS = ['#6366f1', '#f97316', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];
const REPORT_IMAGE_WIDTH = 1200;

function getWeekNumber(d) {
  const oneJan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
}

function periodLabel(period, params) {
  if (period === 'daily') return format(new Date(params.date), 'dd MMM yyyy');
  if (period === 'weekly') return `Week ${params.week}, ${params.year}`;
  if (period === 'monthly') return `${months.find((m) => m.value === params.month)?.label || 'Month'} ${params.year}`;
  if (period === 'quarterly') return `Q${params.quarter} ${params.year}`;
  if (period === 'halfyearly') return `H${params.half} ${params.year}`;
  return `${params.year}`;
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawText(ctx, text, x, y, options = {}) {
  ctx.fillStyle = options.color || '#1e293b';
  ctx.font = `${options.weight || 400} ${options.size || 16}px ${options.family || 'Inter, Arial, sans-serif'}`;
  ctx.textAlign = options.align || 'left';
  ctx.textBaseline = options.baseline || 'alphabetic';
  ctx.fillText(text, x, y);
}

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let output = text;
  while (output.length > 1 && ctx.measureText(`${output}...`).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output}...`;
}

function drawCard(ctx, x, y, width, height, label, value, bg, border, accent) {
  ctx.fillStyle = bg;
  roundedRect(ctx, x, y, width, height, 14);
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.stroke();
  drawText(ctx, label, x + 22, y + 34, { size: 14, weight: 700, color: accent });
  drawText(ctx, value, x + 22, y + 78, { size: 30, weight: 800, color: '#0f172a' });
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
}

async function buildCustomReportImage({ report, period, params, currency }) {
  const rows = report.bySubCategory || [];
  const visibleRows = rows.slice(0, 18);
  const chartHeight = Math.max(260, visibleRows.length * 34 + 64);
  const tableHeight = rows.length > 0 ? Math.min(rows.length, 14) * 42 + 72 : 0;
  const height = 96 + 112 + 24 + chartHeight + 24 + tableHeight + 40;
  const canvas = document.createElement('canvas');
  const scale = Math.max(2, window.devicePixelRatio || 1);
  canvas.width = REPORT_IMAGE_WIDTH * scale;
  canvas.height = height * scale;
  canvas.style.width = `${REPORT_IMAGE_WIDTH}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, REPORT_IMAGE_WIDTH, height);

  drawText(ctx, 'Dhanam Custom Sub-Category Report', 40, 42, { size: 28, weight: 800, color: '#0f172a' });
  drawText(ctx, periodLabel(period, params), 40, 70, { size: 16, weight: 600, color: '#64748b' });
  drawText(ctx, `Generated ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, REPORT_IMAGE_WIDTH - 40, 70, {
    size: 14, weight: 600, color: '#94a3b8', align: 'right',
  });

  const cardWidth = 354;
  drawCard(ctx, 40, 104, cardWidth, 96, 'TOTAL SPEND', `${currency} ${fmt(report.summary.totalExpense)}`, '#fff1f2', '#fecdd3', '#e11d48');
  drawCard(ctx, 423, 104, cardWidth, 96, 'TRANSACTIONS', String(report.summary.count), '#f8fafc', '#e2e8f0', '#475569');
  drawCard(ctx, 806, 104, cardWidth, 96, 'SELECTED AREAS', String(report.bySubCategory.length), '#eef2ff', '#c7d2fe', '#4f46e5');

  const chartX = 40;
  const chartY = 224;
  const chartWidth = 1120;
  roundedRect(ctx, chartX, chartY, chartWidth, chartHeight, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.stroke();
  drawText(ctx, 'Spend by Sub-Category', chartX + 24, chartY + 36, { size: 18, weight: 800, color: '#1e293b' });

  if (visibleRows.length === 0) {
    drawText(ctx, 'No expenses found for this selection.', chartX + chartWidth / 2, chartY + chartHeight / 2, {
      size: 18, weight: 600, color: '#94a3b8', align: 'center',
    });
  } else {
    const max = Math.max(...visibleRows.map((row) => row.total), 1);
    const labelWidth = 230;
    const barX = chartX + labelWidth + 34;
    const barMaxWidth = chartWidth - labelWidth - 96;
    let y = chartY + 74;
    visibleRows.forEach((row, index) => {
      const barWidth = Math.max(3, (row.total / max) * barMaxWidth);
      const color = row.color || COLORS[index % COLORS.length];
      drawText(ctx, truncateText(ctx, row.subCategoryName || row.categoryName || 'Uncategorized', labelWidth), chartX + labelWidth, y + 15, {
        size: 14, color: '#334155', align: 'right',
      });
      ctx.fillStyle = color;
      roundedRect(ctx, barX, y, barWidth, 20, 5);
      ctx.fill();
      drawText(ctx, `${currency} ${fmt(row.total)}`, Math.min(barX + barWidth + 12, chartX + chartWidth - 24), y + 15, {
        size: 13, weight: 700, color: '#475569',
      });
      y += 34;
    });
  }

  if (rows.length > 0) {
    const tableY = chartY + chartHeight + 24;
    roundedRect(ctx, 40, tableY, 1120, tableHeight, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();
    drawText(ctx, 'Breakdown', 64, tableY + 36, { size: 18, weight: 800, color: '#1e293b' });
    drawText(ctx, 'TRANSACTIONS', 875, tableY + 36, { size: 12, weight: 800, color: '#64748b', align: 'right' });
    drawText(ctx, 'AMOUNT', 1130, tableY + 36, { size: 12, weight: 800, color: '#64748b', align: 'right' });

    rows.slice(0, 14).forEach((row, index) => {
      const y = tableY + 66 + index * 42;
      ctx.strokeStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.moveTo(64, y - 16);
      ctx.lineTo(1136, y - 16);
      ctx.stroke();
      ctx.fillStyle = row.color || COLORS[index % COLORS.length];
      ctx.beginPath();
      ctx.arc(72, y, 5, 0, Math.PI * 2);
      ctx.fill();
      drawText(ctx, truncateText(ctx, row.categoryName || 'Category', 250), 90, y + 5, { size: 14, weight: 700, color: '#334155' });
      drawText(ctx, truncateText(ctx, row.subCategoryName || 'Uncategorized', 360), 370, y + 5, { size: 14, color: '#475569' });
      drawText(ctx, String(row.count), 875, y + 5, { size: 14, weight: 700, color: '#475569', align: 'right' });
      drawText(ctx, `${currency} ${fmt(row.total)}`, 1130, y + 5, { size: 14, weight: 800, color: '#1e293b', align: 'right' });
    });
  }

  return canvasToBlob(canvas);
}

export default function Reports() {
  const now = new Date();
  const { categories } = useApp();
  const [period, setPeriod] = useState('monthly');
  const [params, setParams] = useState({
    month: now.getMonth() + 1, year: now.getFullYear(), week: getWeekNumber(now),
    quarter: Math.ceil((now.getMonth() + 1) / 3), half: now.getMonth() < 6 ? 1 : 2,
    date: format(now, 'yyyy-MM-dd'),
  });
  const [report, setReport] = useState(null);
  const [customReport, setCustomReport] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [excludeRecurring, setExcludeRecurring] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sharingImage, setSharingImage] = useState(false);

  const load = async () => {
    setLoading(true);
    const queryParams = { period, ...params, excludeRecurring };
    try {
      const [r, t] = await Promise.all([
        reportsApi.get(queryParams),
        reportsApi.getTrend({ months: 12, excludeRecurring }),
      ]);
      setReport(r.data);
      setTrend(t.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [period, JSON.stringify(params), excludeRecurring]);

  const { summary, expenseByCategory, expenseByMember, incomeByMember, dailyTrend } = report || {};
  const customQueryParams = { period, ...params, excludeRecurring };

  const loadCustomReport = async (selection = {}) => {
    setCustomLoading(true);
    const categoryIds = selection.categoryIds ?? selectedCategoryIds;
    const subCategoryIds = selection.subCategoryIds ?? selectedSubCategoryIds;
    try {
      const { data } = await reportsApi.getCustom({
        ...customQueryParams,
        categoryIds: categoryIds.join(','),
        subCategoryIds: subCategoryIds.join(','),
      });
      setCustomReport(data);
    } finally {
      setCustomLoading(false);
    }
  };

  useEffect(() => { loadCustomReport(); }, [period, JSON.stringify(params), excludeRecurring]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const toggleWholeCategory = (categoryId) => {
    setSelectedCategoryIds((prev) => (
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    ));
  };

  const toggleSubCategory = (subCategoryId) => {
    setSelectedSubCategoryIds((prev) => (
      prev.includes(subCategoryId) ? prev.filter((id) => id !== subCategoryId) : [...prev, subCategoryId]
    ));
  };

  const shareCustomReportImage = async () => {
    if (!customReport || sharingImage) return;
    setSharingImage(true);
    try {
      const currency = getCurrencyCode();
      const blob = await buildCustomReportImage({ report: customReport, period, params, currency });
      if (!blob) throw new Error('Could not create report image');

      const fileName = `dhanam-custom-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
          title: 'Dhanam Custom Report',
          text: 'Dhanam custom sub-category report',
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    } finally {
      setSharingImage(false);
    }
  };

  const selectedCount = selectedCategoryIds.length + selectedSubCategoryIds.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Analyze your financial data across any time period</p>
      </div>

      {/* Period Selector */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="w-full sm:w-auto">
            <label className="label">Period</label>
            <div className="overflow-x-auto pb-1">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-max min-w-full sm:w-auto">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPeriod(opt.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      period === opt.value ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {period === 'daily' && (
            <div>
              <label className="label">Date</label>
              <input type="date" className="input w-44" value={params.date}
                onChange={(e) => setParams({ ...params, date: e.target.value })} />
            </div>
          )}

          {period === 'weekly' && (
            <>
              <div>
                <label className="label">Week</label>
                <input type="number" className="input w-24" value={params.week} min="1" max="52"
                  onChange={(e) => setParams({ ...params, week: +e.target.value })} />
              </div>
              <div>
                <label className="label">Year</label>
                <select className="input w-28" value={params.year} onChange={(e) => setParams({ ...params, year: +e.target.value })}>
                  {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}

          {period === 'monthly' && (
            <>
              <div>
                <label className="label">Month</label>
                <select className="input w-36" value={params.month} onChange={(e) => setParams({ ...params, month: +e.target.value })}>
                  {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Year</label>
                <select className="input w-28" value={params.year} onChange={(e) => setParams({ ...params, year: +e.target.value })}>
                  {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}

          {period === 'quarterly' && (
            <>
              <div>
                <label className="label">Quarter</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((q) => (
                    <button key={q} onClick={() => setParams({ ...params, quarter: q })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${params.quarter === q ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                      Q{q}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Year</label>
                <select className="input w-28" value={params.year} onChange={(e) => setParams({ ...params, year: +e.target.value })}>
                  {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}

          {period === 'halfyearly' && (
            <>
              <div>
                <label className="label">Half</label>
                <div className="flex gap-1">
                  {[1, 2].map((h) => (
                    <button key={h} onClick={() => setParams({ ...params, half: h })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${params.half === h ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                      H{h} ({h === 1 ? 'Jan–Jun' : 'Jul–Dec'})
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Year</label>
                <select className="input w-28" value={params.year} onChange={(e) => setParams({ ...params, year: +e.target.value })}>
                  {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}

          {period === 'yearly' && (
            <div>
              <label className="label">Year</label>
              <select className="input w-28" value={params.year} onChange={(e) => setParams({ ...params, year: +e.target.value })}>
                {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-indigo-600"
              checked={excludeRecurring}
              onChange={(e) => setExcludeRecurring(e.target.checked)}
            />
            <span className="text-sm font-medium text-slate-600">Exclude recurring expenses</span>
          </label>
        </div>
        {excludeRecurring && (
          <p className="text-xs text-slate-400 mt-3">
            Reports exclude expenses matching active recurring expense category and sub-category templates.
          </p>
        )}
      </div>

      <div className="card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-indigo-500" />
              <h2 className="font-semibold text-slate-700">Custom Sub-Category Report</h2>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Pick any combination of categories and sub-categories for the selected period.</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <button
                type="button"
                className="btn-secondary py-2 px-3"
                onClick={() => {
                  setSelectedCategoryIds([]);
                  setSelectedSubCategoryIds([]);
                  loadCustomReport({ categoryIds: [], subCategoryIds: [] });
                }}
              >
                Clear
              </button>
            )}
            {customReport && (
              <button type="button" className="btn-secondary py-2 px-3 inline-flex items-center gap-2" onClick={shareCustomReportImage} disabled={sharingImage}>
                <Share2 size={16} />
                {sharingImage ? 'Preparing...' : 'Share Image'}
              </button>
            )}
            <button type="button" className="btn-primary" onClick={loadCustomReport} disabled={customLoading}>
              {customLoading ? 'Drawing...' : 'Draw Report'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Selection</span>
              <span className="text-xs text-slate-400">{selectedCount} selected</span>
            </div>
            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
              {categories.map((category) => {
                const subCategories = category.subCategories || [];
                const expanded = expandedCategories[category._id] ?? true;
                const wholeCategorySelected = selectedCategoryIds.includes(category._id);
                return (
                  <div key={category._id} className="p-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => toggleCategory(category._id)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                        {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                      </button>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: category.color || '#6366f1' }} />
                      <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={wholeCategorySelected}
                          onChange={() => toggleWholeCategory(category._id)}
                          className="rounded border-slate-300 text-indigo-600"
                        />
                        <span className="text-sm font-semibold text-slate-700 truncate">{category.name}</span>
                      </label>
                    </div>
                    {expanded && (
                      <div className="mt-2 ml-8 space-y-1.5">
                        {subCategories.length === 0 ? (
                          <p className="text-xs text-slate-400">No sub-categories configured.</p>
                        ) : subCategories.map((subCategory) => (
                          <label key={subCategory._id} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedSubCategoryIds.includes(subCategory._id)}
                              onChange={() => toggleSubCategory(subCategory._id)}
                              className="rounded border-slate-300 text-indigo-600"
                            />
                            <span className="truncate">{subCategory.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-w-0">
            {customLoading ? (
              <LoadingSpinner />
            ) : !customReport ? (
              <div className="h-full min-h-[260px] rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-sm text-slate-400 text-center px-6">
                Select sub-categories from one or more categories, then draw a report.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                    <p className="text-xs text-rose-500 font-semibold uppercase tracking-wide">Total Spend</p>
                    <p className="text-2xl font-bold text-rose-700 mt-1">
                      <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(customReport.summary.totalExpense)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Transactions</p>
                    <p className="text-2xl font-bold text-slate-700 mt-1">{customReport.summary.count}</p>
                  </div>
                  <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 col-span-2 md:col-span-1">
                    <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide">Selected Areas</p>
                    <p className="text-2xl font-bold text-indigo-700 mt-1">{customReport.bySubCategory.length}</p>
                  </div>
                </div>

                {customReport.bySubCategory.length > 0 ? (
                  <div className="rounded-xl border border-slate-100 p-3">
                    <h3 className="font-semibold text-slate-700 text-sm mb-3">Spend by Sub-Category</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={customReport.bySubCategory} layout="vertical" barSize={16}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="subCategoryName" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={130} />
                        <Tooltip formatter={(v) => fmt(v)} />
                        <Bar dataKey="total" name="Amount" radius={[0, 4, 4, 0]}>
                          {customReport.bySubCategory.map((item, index) => (
                            <Cell key={`${item.subCategoryId || item.categoryId}-${index}`} fill={item.color || COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-100 py-10 text-center text-sm text-slate-400">No expenses found for this selection.</div>
                )}

                {customReport.bySubCategory.length > 0 && (
                  <div className="rounded-xl border border-slate-100 overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wide">Category</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wide">Sub-Category</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wide">Transactions</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wide">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customReport.bySubCategory.map((row, index) => (
                          <tr key={`${row.subCategoryId || row.categoryId}-${index}`} className="border-b border-slate-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: row.color || COLORS[index % COLORS.length] }} />
                                <span className="text-slate-700">{row.categoryName}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{row.subCategoryName}</td>
                            <td className="py-3 px-4 text-right text-slate-500">{row.count}</td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-700">
                              <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(row.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : !summary ? null : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard title="Total Income" value={<><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(summary.totalIncome)}</>} icon={TrendingUp} color="green" change={summary.incomeChange} />
            <StatCard title="Total Expenses" value={<><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(summary.totalExpense)}</>} icon={BarChart2} color="red" change={summary.expenseChange} />
            <StatCard title="Net Savings" value={<><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(summary.savings)}</>} icon={Wallet} color={summary.savings >= 0 ? 'green' : 'red'} />
            <StatCard title="Savings Rate" value={`${summary.savingsRate}%`} icon={TrendingDown} color="indigo" />
          </div>

          {/* Previous Period Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">vs Previous Period</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Income</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(summary.totalIncome)}</p>
                    <p className="text-xs text-slate-400">prev: <DirhamSymbol className="h-[0.75em] w-auto inline align-middle mr-0.5" />{fmt(summary.prevTotalIncome)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Expenses</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(summary.totalExpense)}</p>
                    <p className="text-xs text-slate-400">prev: <DirhamSymbol className="h-[0.75em] w-auto inline align-middle mr-0.5" />{fmt(summary.prevTotalExpense)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Income/Expense by Member */}
            <div className="card">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">By Member</p>
              <div className="space-y-2">
                {incomeByMember?.map((m, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                      <span className="text-sm text-slate-600">{m.name} — Income</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(m.total)}</span>
                  </div>
                ))}
                {expenseByMember?.map((m, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                      <span className="text-sm text-slate-600">{m.name} — Expenses</span>
                    </div>
                    <span className="text-sm font-semibold text-rose-600"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(m.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Category breakdown */}
            <div className="card">
              <h3 className="font-semibold text-slate-700 mb-4">Expense by Category</h3>
              {expenseByCategory?.length ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={expenseByCategory} layout="vertical" barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={110} />
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Bar dataKey="total" name="Amount" radius={[0, 4, 4, 0]}>
                      {expenseByCategory.map((c, i) => (
                        <Cell key={i} fill={c.color || COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-slate-400 py-8 text-center">No expense data</p>}
            </div>

            {/* 12-month trend */}
            <div className="card">
              <h3 className="font-semibold text-slate-700 mb-4">12-Month Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fill="url(#incG)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f97316" fill="url(#expG)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Trend (if available) */}
          {dailyTrend?.length > 1 && (() => {
            const avgSpend = Math.round(dailyTrend.reduce((s, d) => s + d.expenses, 0) / dailyTrend.length);
            return (
              <div className="card">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 className="font-semibold text-slate-700">Daily Spending This Period</h3>
                  <span className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5 whitespace-nowrap">
                    Excl. Finance &amp; Loans
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => fmt(v)} />
                    <ReferenceLine
                      y={avgSpend}
                      stroke="#f97316"
                      strokeDasharray="4 3"
                      strokeWidth={1.5}
                      label={{
                        value: `Avg: ${getCurrencyCode()} ${fmt(avgSpend)}`,
                        position: 'insideTopRight',
                        fontSize: 10,
                        fill: '#f97316',
                        fontWeight: 600,
                      }}
                    />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Total spent this period</span>
                  <span className="font-semibold text-slate-700 text-sm">
                    <DirhamSymbol className="h-[0.75em] w-auto inline align-middle mr-0.5" />
                    {fmt(dailyTrend.reduce((s, d) => s + d.expenses, 0))}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Category Table */}
          {expenseByCategory?.length > 0 && (() => {
            const breakdownCategories = expenseByCategory.filter((c) => c.name !== 'Finance & Loans');
            const breakdownTotal = breakdownCategories.reduce((s, c) => s + c.total, 0);
            return breakdownCategories.length > 0 && (
              <div className="card p-0 overflow-hidden overflow-x-auto">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-slate-700">Category Breakdown</h3>
                  <span className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5 whitespace-nowrap">Excl. Finance &amp; Loans</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left py-3 px-5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Category</th>
                      <th className="text-right py-3 px-5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Transactions</th>
                      <th className="text-right py-3 px-5 font-semibold text-slate-500 text-xs uppercase tracking-wide">Amount</th>
                      <th className="text-right py-3 px-5 font-semibold text-slate-500 text-xs uppercase tracking-wide">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdownCategories.map((c, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: c.color || COLORS[i % COLORS.length] }} />
                            <span className="text-slate-700 font-medium">{c.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-5 text-right text-slate-500">{c.count}</td>
                        <td className="py-3 px-5 text-right font-semibold text-slate-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(c.total)}</td>
                        <td className="py-3 px-5 text-right text-slate-500">
                          {breakdownTotal > 0 ? ((c.total / breakdownTotal) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td className="py-3 px-5 font-semibold text-slate-700">Total</td>
                      <td className="py-3 px-5 text-right font-semibold text-slate-700">{breakdownCategories.reduce((s, c) => s + c.count, 0)}</td>
                      <td className="py-3 px-5 text-right font-semibold text-slate-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(breakdownTotal)}</td>
                      <td className="py-3 px-5 text-right font-semibold text-slate-700">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
