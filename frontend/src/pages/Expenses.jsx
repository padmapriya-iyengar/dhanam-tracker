import { format } from 'date-fns';
import { ChevronDown, CreditCard, Edit2, Filter, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import DirhamSymbol from '../components/DirhamSymbol';
import { useApp } from '../context/AppContext';
import { creditCardsApi, expensesApi, fmt, savingsApi } from '../services/api';

const PAYMENT_METHODS = [
  { value: 'current_account', label: 'Current Account' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'savings', label: 'Savings' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_LABELS = {
  current_account: 'Current Account',
  upi: 'Current Account',
  debit_card: 'Current Account',
  credit_card: 'Credit Card',
  savings: 'Savings',
  cash: 'Cash',
  netbanking: 'Current Account',
  other: 'Other',
  card: 'Card',
};

const RECOVERY_SOURCES = [
  { value: 'bank_reimbursement', label: 'Bank Reimbursement' },
  { value: 'family_transfer', label: 'Family Transfer' },
  { value: 'employer', label: 'Employer' },
  { value: 'friend', label: 'Friend' },
  { value: 'other', label: 'Other' },
];

const BUDGET_TREATMENTS = [
  { value: 'reduce_expense', label: 'Reduce expense in reports/budgets' },
  { value: 'ignore_for_budget', label: 'Track only, keep expense in budgets' },
];

const months = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: format(new Date(2024, i, 1), 'MMMM'),
}));

const emptyForm = {
  memberId: '', amount: '', categoryId: '', subCategoryId: '',
  description: '', date: format(new Date(), 'yyyy-MM-dd'),
  paymentMethod: 'current_account', creditCardId: '', savingsAccountId: '', notes: '',
};

const emptyRecoveryForm = {
  amount: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  source: 'bank_reimbursement',
  budgetTreatment: 'reduce_expense',
  notes: '',
};

export default function Expenses() {
  const { members, categories } = useApp();
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [recoveredAmount, setRecoveredAmount] = useState(0);
  const [netTotalAmount, setNetTotalAmount] = useState(0);
  const [paymentSummary, setPaymentSummary] = useState([]);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [recoveryForm, setRecoveryForm] = useState(emptyRecoveryForm);
  const [wizardStep, setWizardStep] = useState(0);
  const [editing, setEditing] = useState(null);
  const [recoveringExpense, setRecoveringExpense] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingRecovery, setSavingRecovery] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMember, setFilterMember] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubCategory, setFilterSubCategory] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [filterCreditCard, setFilterCreditCard] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  // All credit cards; filtered to member when adding expense
  const [allCreditCards, setAllCreditCards] = useState([]);
  const [savingsAccounts, setSavingsAccounts] = useState([]);

  const subCategories = categories.find((c) => c._id === form.categoryId)?.subCategories || [];
  const filterSubCategories = filterCategory
    ? categories.find((c) => c._id === filterCategory)?.subCategories || []
    : categories.flatMap((c) => (c.subCategories || []).map((s) => ({ ...s, categoryName: c.name })));
  const usingCustomDateRange = Boolean(filterStartDate || filterEndDate);
  const activeFilterCount = [
    filterMember,
    filterCategory,
    filterSubCategory,
    filterPayment,
    filterCreditCard,
    filterStartDate,
    filterEndDate,
  ].filter(Boolean).length;

  const getPaymentSourceLabel = (source) => {
    if (source.paymentMethod === 'credit_card') {
      const card = allCreditCards.find((item) => String(item._id) === String(source.creditCardId));
      if (!card) return 'Credit Card';
      return `${card.bankName || 'Card'}${card.name ? ` - ${card.name}` : ''}${card.lastFourDigits ? ` ****${card.lastFourDigits}` : ''}`;
    }
    if (source.paymentMethod === 'savings') {
      const account = savingsAccounts.find((item) => String(item._id) === String(source.savingsAccountId));
      if (!account) return 'Savings';
      return `${account.name}${account.bankName ? ` - ${account.bankName}` : ''}`;
    }
    return PAYMENT_LABELS[source.paymentMethod] || source.paymentMethod || 'Other';
  };

  const getPaymentSourceTone = (paymentMethod) => {
    if (paymentMethod === 'credit_card') return 'border-violet-100 bg-violet-50 text-violet-700';
    if (paymentMethod === 'savings') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
    if (paymentMethod === 'cash') return 'border-amber-100 bg-amber-50 text-amber-700';
    return 'border-slate-200 bg-white text-slate-600';
  };

  const loadCreditCards = async () => {
    const { data } = await creditCardsApi.getAll();
    setAllCreditCards(data);
  };

  const loadSavingsAccounts = async () => {
    const { data } = await savingsApi.getAll();
    setSavingsAccounts(data);
  };

  const load = async (p = 1) => {
    setLoading(true);
    const params = { page: p, limit: 15 };
    if (usingCustomDateRange) {
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;
    } else {
      params.month = filterMonth;
      params.year = filterYear;
    }
    if (filterMember) params.memberId = filterMember;
    if (filterCategory) params.categoryId = filterCategory;
    if (filterSubCategory) params.subCategoryId = filterSubCategory;
    if (filterPayment) params.paymentMethod = filterPayment;
    if (filterPayment === 'credit_card' && filterCreditCard) params.creditCardId = filterCreditCard;
    const { data } = await expensesApi.getAll(params);
    setRecords(data.records);
    setTotal(data.total);
    setTotalAmount(data.totalAmount ?? data.records.reduce((s, r) => s + r.amount, 0));
    setRecoveredAmount(data.recoveredAmount || 0);
    setNetTotalAmount(data.netTotalAmount ?? data.totalAmount ?? data.records.reduce((s, r) => s + r.amount, 0));
    setPaymentSummary(data.paymentSummary || []);
    setPages(data.pages);
    setPage(p);
    setLoading(false);
  };

  useEffect(() => { loadCreditCards(); loadSavingsAccounts(); }, []);
  useEffect(() => { load(1); }, [filterMonth, filterYear, filterMember, filterCategory, filterSubCategory, filterPayment, filterCreditCard, filterStartDate, filterEndDate]);

  const openAdd = () => {
    const defaultCategory = categories[0];
    setEditing(null);
    setForm({
      ...emptyForm,
      memberId: members[0]?._id || '',
      categoryId: defaultCategory?._id || '',
    });
    setWizardStep(0);
    setSaveError('');
    setModalOpen(true);
  };

  const openEdit = (rec) => {
    setEditing(rec._id);
    setForm({
      memberId: rec.memberId._id,
      amount: rec.amount,
      categoryId: rec.categoryId._id,
      subCategoryId: rec.subCategoryId?._id || '',
      description: rec.description || '',
      date: format(new Date(rec.date), 'yyyy-MM-dd'),
      paymentMethod: rec.paymentMethod,
      creditCardId: rec.creditCardId?._id || '',
      savingsAccountId: rec.savingsAccountId?._id || '',
      notes: rec.notes || '',
    });
    setWizardStep(0);
    setSaveError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    const payload = { ...form };
    if (!payload.subCategoryId) delete payload.subCategoryId;
    if (payload.paymentMethod !== 'credit_card') delete payload.creditCardId;
    if (!payload.savingsAccountId) delete payload.savingsAccountId;
    try {
      if (editing) await expensesApi.update(editing, payload);
      else await expensesApi.create(payload);
      setModalOpen(false);
      load(1);
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    await expensesApi.delete(id);
    load(page);
  };

  const openRecovery = (rec) => {
    setRecoveringExpense(rec);
    setRecoveryForm({
      ...emptyRecoveryForm,
      amount: rec.recoverySummary?.netAmount ?? rec.amount ?? '',
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    setRecoveryError('');
    setRecoveryModalOpen(true);
  };

  const saveRecovery = async (event) => {
    event.preventDefault();
    if (!recoveringExpense) return;
    setSavingRecovery(true);
    setRecoveryError('');
    try {
      await expensesApi.addRecovery(recoveringExpense._id, recoveryForm);
      setRecoveryModalOpen(false);
      await load(page);
    } catch (err) {
      setRecoveryError(err.response?.data?.error || err.message || 'Failed to save recovery');
    } finally {
      setSavingRecovery(false);
    }
  };

  const deleteRecovery = async (expenseId, recoveryId) => {
    if (!confirm('Delete this recovery?')) return;
    await expensesApi.deleteRecovery(expenseId, recoveryId);
    await load(page);
  };

  const handleMemberChange = (memberId) => {
    setForm((f) => ({ ...f, memberId, creditCardId: '' }));
  };

  const handlePaymentChange = (paymentMethod) => {
    setForm((f) => ({
      ...f,
      paymentMethod,
      creditCardId: paymentMethod === 'credit_card' ? allCreditCards[0]?._id || '' : '',
      savingsAccountId: paymentMethod === 'savings' ? savingsAccounts[0]?._id || '' : '',
    }));
  };

  const selectCategory = (categoryId) => {
    setForm((current) => ({ ...current, categoryId, subCategoryId: '' }));
  };

  const clearAdvancedFilters = () => {
    setFilterMember('');
    setFilterCategory('');
    setFilterSubCategory('');
    setFilterPayment('');
    setFilterCreditCard('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const needsPaymentAccount = form.paymentMethod === 'credit_card' || form.paymentMethod === 'savings';
  const wizardSteps = [
    { key: 'amount', label: 'Amount' },
    { key: 'member', label: 'Member' },
    { key: 'category', label: 'Category' },
    { key: 'subCategory', label: 'Sub-category' },
    { key: 'payment', label: 'Payment' },
    ...(needsPaymentAccount ? [{ key: 'account', label: form.paymentMethod === 'credit_card' ? 'Card' : 'Account' }] : []),
    { key: 'details', label: 'Details' },
  ];
  const currentWizardKey = wizardSteps[wizardStep]?.key || 'amount';
  const selectedMember = members.find((member) => member._id === form.memberId);
  const selectedCategory = categories.find((category) => category._id === form.categoryId);
  const selectedSubCategory = subCategories.find((subCategory) => subCategory._id === form.subCategoryId);
  const selectedCreditCard = allCreditCards.find((card) => card._id === form.creditCardId);
  const selectedSavingsAccount = savingsAccounts.find((account) => account._id === form.savingsAccountId);
  const paymentLabel = PAYMENT_METHODS.find((method) => method.value === form.paymentMethod)?.label || 'Payment';

  const wizardCanContinue = () => {
    if (currentWizardKey === 'amount') return Number(form.amount) > 0;
    if (currentWizardKey === 'member') return Boolean(form.memberId);
    if (currentWizardKey === 'category') return Boolean(form.categoryId);
    if (currentWizardKey === 'payment') return Boolean(form.paymentMethod);
    if (currentWizardKey === 'account') {
      if (form.paymentMethod === 'credit_card') return Boolean(form.creditCardId);
      if (form.paymentMethod === 'savings') return Boolean(form.savingsAccountId);
    }
    return true;
  };

  const nextWizardStep = () => setWizardStep((step) => Math.min(step + 1, wizardSteps.length - 1));
  const previousWizardStep = () => setWizardStep((step) => Math.max(step - 1, 0));

  const optionClass = (selected) => (
    `w-full rounded-xl border px-3 py-3 text-left transition-colors ${
      selected
        ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
        : 'border-slate-100 bg-white text-slate-700 hover:border-indigo-100 hover:bg-slate-50'
    }`
  );

  const renderWizardStep = () => {
    if (currentWizardKey === 'amount') {
      return (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">How much did you spend?</p>
            <p className="mt-1 text-xs text-slate-400">Enter the amount first. Everything else can use defaults.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <label htmlFor="exp-wizard-amount" className="label">Amount</label>
            <div className="flex items-center gap-2">
              <DirhamSymbol className="h-7 w-auto text-slate-500" />
              <input
                id="exp-wizard-amount"
                type="number"
                className="input text-2xl font-bold"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                min="0.01"
                step="0.01"
                placeholder="0.00"
                inputMode="decimal"
              />
            </div>
          </div>
          <div>
            <label htmlFor="exp-wizard-date" className="label">Date</label>
            <input id="exp-wizard-date" type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
        </div>
      );
    }

    if (currentWizardKey === 'member') {
      return (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Who paid?</p>
            <p className="mt-1 text-xs text-slate-400">Default selected: {selectedMember?.name || 'None'}</p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {members.map((member) => (
              <button key={member._id} type="button" className={optionClass(form.memberId === member._id)} onClick={() => handleMemberChange(member._id)}>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: member.color }} />
                  <span className="font-semibold">{member.name}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (currentWizardKey === 'category') {
      return (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">What category?</p>
            <p className="mt-1 text-xs text-slate-400">Pick the closest match. You can refine it next.</p>
          </div>
          <div className="grid max-h-[360px] grid-cols-1 gap-2 overflow-y-auto pr-1">
            {categories.map((category) => (
              <button key={category._id} type="button" className={optionClass(form.categoryId === category._id)} onClick={() => selectCategory(category._id)}>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: category.color || '#6366f1' }} />
                  <span className="font-semibold">{category.name}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (currentWizardKey === 'subCategory') {
      return (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Any sub-category?</p>
            <p className="mt-1 text-xs text-slate-400">{selectedCategory?.name || 'Category'} can stay without a sub-category.</p>
          </div>
          <div className="grid max-h-[360px] grid-cols-1 gap-2 overflow-y-auto pr-1">
            <button type="button" className={optionClass(!form.subCategoryId)} onClick={() => setForm({ ...form, subCategoryId: '' })}>
              <span className="font-semibold">None</span>
              <span className="mt-0.5 block text-xs text-slate-400">Keep this expense at category level</span>
            </button>
            {subCategories.map((subCategory) => (
              <button key={subCategory._id} type="button" className={optionClass(form.subCategoryId === subCategory._id)} onClick={() => setForm({ ...form, subCategoryId: subCategory._id })}>
                <span className="font-semibold">{subCategory.name}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (currentWizardKey === 'payment') {
      return (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">How did you pay?</p>
            <p className="mt-1 text-xs text-slate-400">Current Account is selected by default.</p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {PAYMENT_METHODS.map((method) => (
              <button key={method.value} type="button" className={optionClass(form.paymentMethod === method.value)} onClick={() => handlePaymentChange(method.value)}>
                <span className="font-semibold">{method.label}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (currentWizardKey === 'account') {
      if (form.paymentMethod === 'credit_card') {
        return (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Which card?</p>
              <p className="mt-1 text-xs text-slate-400">Choose the card used for this expense.</p>
            </div>
            {allCreditCards.length === 0 ? (
              <p className="rounded-xl border border-violet-100 bg-violet-50 px-3 py-3 text-xs text-violet-600">
                No credit cards found. <Link to="/credit-cards" className="font-medium underline">Add one on the Credit Cards page</Link>.
              </p>
            ) : (
              <div className="grid max-h-[360px] grid-cols-1 gap-2 overflow-y-auto pr-1">
                {allCreditCards.map((card) => (
                  <button key={card._id} type="button" className={optionClass(form.creditCardId === card._id)} onClick={() => setForm({ ...form, creditCardId: card._id })}>
                    <span className="font-semibold">{card.bankName} - {card.name}</span>
                    {card.lastFourDigits && <span className="mt-0.5 block text-xs text-slate-400">**** {card.lastFourDigits}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      }

      return (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Which savings account?</p>
            <p className="mt-1 text-xs text-slate-400">This amount will be deducted from that account.</p>
          </div>
          {savingsAccounts.length === 0 ? (
            <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs text-emerald-700">No savings accounts found. Add one on the Savings page.</p>
          ) : (
            <div className="grid max-h-[360px] grid-cols-1 gap-2 overflow-y-auto pr-1">
              {savingsAccounts.map((account) => (
                <button key={account._id} type="button" className={optionClass(form.savingsAccountId === account._id)} onClick={() => setForm({ ...form, savingsAccountId: account._id })}>
                  <span className="font-semibold">{account.name}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">{account.bankName ? `${account.bankName} - ` : ''}{account.memberId?.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-800">Final details</p>
          <p className="mt-1 text-xs text-slate-400">Description is optional, but useful when searching later.</p>
        </div>
        <div>
          <label htmlFor="exp-wizard-description" className="label">Description</label>
          <input id="exp-wizard-description" type="text" className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Amazon Now" />
        </div>
        <div>
          <label htmlFor="exp-wizard-notes" className="label">Notes</label>
          <textarea id="exp-wizard-notes" className="input resize-none" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
          <div className="flex justify-between gap-3 py-1"><span>Amount</span><strong className="text-slate-800"><DirhamSymbol className="h-[0.8em] w-auto inline align-middle mr-0.5" />{fmt(form.amount || 0)}</strong></div>
          <div className="flex justify-between gap-3 py-1"><span>Member</span><strong className="text-slate-800">{selectedMember?.name || '-'}</strong></div>
          <div className="flex justify-between gap-3 py-1"><span>Category</span><strong className="text-slate-800">{selectedCategory?.name || '-'}</strong></div>
          <div className="flex justify-between gap-3 py-1"><span>Sub-category</span><strong className="text-slate-800">{selectedSubCategory?.name || 'None'}</strong></div>
          <div className="flex justify-between gap-3 py-1"><span>Payment</span><strong className="text-slate-800">{paymentLabel}</strong></div>
          {form.paymentMethod === 'credit_card' && (
            <div className="flex justify-between gap-3 py-1"><span>Card</span><strong className="text-right text-slate-800">{selectedCreditCard ? `${selectedCreditCard.bankName} - ${selectedCreditCard.name}` : '-'}</strong></div>
          )}
          {form.paymentMethod === 'savings' && (
            <div className="flex justify-between gap-3 py-1"><span>Account</span><strong className="text-right text-slate-800">{selectedSavingsAccount?.name || '-'}</strong></div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="text-sm text-slate-500 mt-0.5 sm:hidden">{total} records in selected period</p>
        </div>
        <button onClick={openAdd} className="btn-primary w-full flex-shrink-0 justify-center sm:w-auto">
          <Plus size={15} /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <button
          type="button"
          onClick={() => setFiltersOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-3 sm:pointer-events-none"
        >
          <span className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filters</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">{activeFilterCount} active</span>
            )}
          </span>
          <ChevronDown className={`text-slate-400 transition-transform sm:hidden ${filtersOpen ? 'rotate-180' : ''}`} size={18} />
        </button>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="filter-month" className="label">Month</label>
            <select id="filter-month" className="input w-full" value={filterMonth} onChange={(e) => setFilterMonth(+e.target.value)} disabled={usingCustomDateRange}>
              {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-year" className="label">Year</label>
            <select id="filter-year" className="input w-full" value={filterYear} onChange={(e) => setFilterYear(+e.target.value)} disabled={usingCustomDateRange}>
              {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div className={`${filtersOpen ? 'grid' : 'hidden'} mt-3 grid-cols-1 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5`}>
          <div>
            <label htmlFor="filter-start-date" className="label">From Date</label>
            <input id="filter-start-date" type="date" className="input w-full" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor="filter-end-date" className="label">To Date</label>
            <input id="filter-end-date" type="date" className="input w-full" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor="filter-member" className="label">Member</label>
            <select id="filter-member" className="input w-full" value={filterMember} onChange={(e) => setFilterMember(e.target.value)}>
              <option value="">All Members</option>
              {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-category" className="label">Category</label>
            <select id="filter-category" className="input w-full" value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setFilterSubCategory(''); }}>
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-subcategory" className="label">Sub-Category</label>
            <select id="filter-subcategory" className="input w-full" value={filterSubCategory} onChange={(e) => setFilterSubCategory(e.target.value)} disabled={!filterSubCategories.length}>
              <option value="">All Sub-Categories</option>
              {filterSubCategories.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.categoryName ? `${s.categoryName} - ${s.name}` : s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-payment" className="label">Payment</label>
            <select id="filter-payment" className="input w-full" value={filterPayment}
              onChange={(e) => { setFilterPayment(e.target.value); setFilterCreditCard(''); }}>
              <option value="">All Methods</option>
              {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          {filterPayment === 'credit_card' && (
            <div>
              <label htmlFor="filter-credit-card" className="label">Credit Card</label>
              <select id="filter-credit-card" className="input w-full" value={filterCreditCard} onChange={(e) => setFilterCreditCard(e.target.value)}>
                <option value="">All Cards</option>
                {allCreditCards.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.bankName} — {c.name}{c.lastFourDigits ? ` ••••${c.lastFourDigits}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          {activeFilterCount > 0 && (
            <div className="flex items-end">
              <button
                type="button"
                className="btn-secondary w-full justify-center py-2.5"
                onClick={clearAdvancedFilters}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {!loading && records.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Records</p>
              <p className="text-lg font-bold text-slate-800">{total}</p>
            </div>
            <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-500">Gross</p>
              <p className="text-lg font-bold text-rose-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(totalAmount)}</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Recovered</p>
              <p className="text-lg font-bold text-emerald-700"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(recoveredAmount)}</p>
            </div>
            <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Net</p>
              <p className="text-lg font-bold text-slate-800"><DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(netTotalAmount)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {paymentSummary.map((source) => {
              const percent = totalAmount > 0 ? Math.round((source.amount / totalAmount) * 100) : 0;
              const tone = getPaymentSourceTone(source.paymentMethod);
              const key = `${source.paymentMethod}-${source.creditCardId || source.savingsAccountId || 'default'}`;
              return (
                <div key={key} className={`min-w-0 rounded-lg border px-3 py-2 ${tone}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold truncate">{getPaymentSourceLabel(source)}</p>
                    <span className="text-[11px] opacity-75 whitespace-nowrap">{source.count} txns</span>
                  </div>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <p className="text-base font-bold text-slate-800">
                      <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(source.amount)}
                    </p>
                    <span className="text-xs font-medium opacity-75">{percent}%</span>
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-white/70 overflow-hidden">
                    <div className="h-full rounded-full bg-current opacity-70" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading && <LoadingSpinner />}
      {!loading && records.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-sm">No expenses found for this period.</p>
          <button onClick={openAdd} className="btn-primary mt-4"><Plus size={15} /> Add Expense</button>
        </div>
      )}
      {!loading && records.length > 0 && (
        <>
          {/* Mobile card list */}
          <div className="md:hidden space-y-2">
            {records.map((rec) => {
              const isCreditCard = rec.paymentMethod === 'credit_card';
              const recovered = rec.recoverySummary?.recoveredAmount || 0;
              const netAmount = rec.recoverySummary?.netAmount ?? rec.amount;
              const recoveries = rec.recoveries || [];
              const paymentLabel = isCreditCard
                ? `${rec.creditCardId?.bankName || 'Credit Card'}${rec.creditCardId?.name ? ` - ${rec.creditCardId.name}` : ''}`
                : PAYMENT_LABELS[rec.paymentMethod] || rec.paymentMethod;
              return (
                <div key={rec._id} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <span className="mt-1 h-3 w-3 flex-shrink-0 rounded-full" style={{ background: rec.categoryId?.color }} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800">{rec.description || rec.categoryId?.name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {rec.categoryId?.name}{rec.subCategoryId ? ` / ${rec.subCategoryId.name}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-base font-bold" style={{ color: isCreditCard ? '#7c3aed' : '#f43f5e' }}>
                        <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(rec.amount)}
                      </p>
                      {recovered > 0 && (
                        <p className="text-xs font-semibold text-emerald-600">
                          Net <DirhamSymbol className="h-[0.75em] w-auto inline align-middle mr-0.5" />{fmt(netAmount)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">Date</p>
                      <p className="font-semibold text-slate-700">{format(new Date(rec.date), 'dd MMM yyyy')}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">Member</p>
                      <p className="flex items-center gap-1 font-semibold text-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: rec.memberId?.color }} />
                        {rec.memberId?.name}
                      </p>
                    </div>
                    <div className="col-span-2 rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="font-semibold text-slate-400 uppercase tracking-wide text-[10px]">Payment</p>
                      <p className={`flex items-center gap-1 font-semibold ${isCreditCard ? 'text-violet-700' : 'text-slate-700'}`}>
                        {isCreditCard && <CreditCard size={12} />}
                        {paymentLabel}
                      </p>
                    </div>
                  </div>

                  {recoveries.length > 0 && (
                    <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-1.5">
                      <p className="text-xs font-medium text-emerald-700">
                        Reduces reports <DirhamSymbol className="h-[0.75em] w-auto inline align-middle mr-0.5" />{fmt(recovered)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {recoveries.map((recovery) => (
                          <button
                            key={recovery._id}
                            type="button"
                            onClick={() => deleteRecovery(rec._id, recovery._id)}
                            className="text-[11px] text-emerald-700 hover:text-rose-600"
                          >
                            {fmt(recovery.amount)}{recovery.budgetTreatment === 'ignore_for_budget' ? ' tracked' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-50 pt-3">
                    <button onClick={() => openRecovery(rec)} className="rounded-lg bg-emerald-50 px-2 py-2 text-xs font-semibold text-emerald-700">Recover</button>
                    <button onClick={() => openEdit(rec)} className="rounded-lg bg-indigo-50 px-2 py-2 text-xs font-semibold text-indigo-700">Edit</button>
                    <button onClick={() => handleDelete(rec._id)} className="rounded-lg bg-rose-50 px-2 py-2 text-xs font-semibold text-rose-700">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block card p-0 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Date', 'Member', 'Category', 'Description', 'Payment', 'Amount', ''].map((h) => (
                    <th key={h} className="text-left py-3 px-4 font-semibold text-slate-500 text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => {
                  const recovered = rec.recoverySummary?.recoveredAmount || 0;
                  const netAmount = rec.recoverySummary?.netAmount ?? rec.amount;
                  const recoveries = rec.recoveries || [];
                  return (
                  <tr key={rec._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{format(new Date(rec.date), 'dd MMM yyyy')}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: rec.memberId?.color }} />
                        <span className="text-slate-700">{rec.memberId?.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: rec.categoryId?.color }} />
                        <div>
                          <p className="text-slate-700 font-medium">{rec.categoryId?.name}</p>
                          {rec.subCategoryId && <p className="text-xs text-slate-400">{rec.subCategoryId.name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-[160px] truncate">{rec.description || '—'}</td>
                    <td className="py-3 px-4">
                      {rec.paymentMethod === 'credit_card' ? (
                        <div>
                          <span className="badge bg-violet-50 text-violet-700 flex items-center gap-1 w-fit">
                            <CreditCard size={10} /> {rec.creditCardId?.bankName || 'Credit Card'}
                          </span>
                          {rec.creditCardId?.name && <p className="text-xs text-slate-400 mt-0.5">{rec.creditCardId.name}</p>}
                        </div>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-600">{PAYMENT_LABELS[rec.paymentMethod] || rec.paymentMethod}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="font-semibold" style={{ color: rec.paymentMethod === 'credit_card' ? '#7c3aed' : '#f43f5e' }}>
                        <DirhamSymbol className="h-[0.85em] w-auto inline align-middle mr-0.5" />{fmt(rec.amount)}
                      </p>
                      {recovered > 0 && (
                        <div className="mt-0.5 text-xs">
                          <p className="text-emerald-600">Recovered <DirhamSymbol className="h-[0.75em] w-auto inline align-middle mr-0.5" />{fmt(recovered)}</p>
                          <p className="font-semibold text-slate-600">Net <DirhamSymbol className="h-[0.75em] w-auto inline align-middle mr-0.5" />{fmt(netAmount)}</p>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openRecovery(rec)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Add recovery"><Plus size={14} /></button>
                        <button onClick={() => openEdit(rec)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(rec._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                      {recoveries.length > 0 && (
                        <div className="mt-1 flex flex-col items-end gap-0.5">
                          {recoveries.map((recovery) => (
                            <button
                              key={recovery._id}
                              type="button"
                              onClick={() => deleteRecovery(rec._id, recovery._id)}
                              className="text-[11px] text-emerald-600 hover:text-rose-600"
                              title="Delete recovery"
                            >
                              {fmt(recovery.amount)}{recovery.budgetTreatment === 'ignore_for_budget' ? ' tracked' : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button className="btn-secondary py-1 px-3" disabled={page === 1} onClick={() => load(page - 1)}>← Prev</button>
              <span className="text-sm text-slate-500">Page {page} of {pages}</span>
              <button className="btn-secondary py-1 px-3" disabled={page === pages} onClick={() => load(page + 1)}>Next →</button>
            </div>
          )}
        </>
      )}

      <Modal isOpen={recoveryModalOpen} onClose={() => setRecoveryModalOpen(false)} title="Add Recovery" size="md">
        <form onSubmit={saveRecovery} className="space-y-4">
          {recoveryError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{recoveryError}</p>}
          {recoveringExpense && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-sm font-semibold text-slate-700">{recoveringExpense.categoryId?.name}</p>
              <p className="text-xs text-slate-400">
                Gross <DirhamSymbol className="h-[0.75em] w-auto inline align-middle mr-0.5" />{fmt(recoveringExpense.amount)}
                {recoveringExpense.recoverySummary?.recoveredAmount > 0 && (
                  <> - Already recovered <DirhamSymbol className="h-[0.75em] w-auto inline align-middle mr-0.5" />{fmt(recoveringExpense.recoverySummary.recoveredAmount)}</>
                )}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="recovery-amount" className="label">Recovered Amount *</label>
              <input
                id="recovery-amount"
                type="number"
                className="input"
                value={recoveryForm.amount}
                onChange={(e) => setRecoveryForm({ ...recoveryForm, amount: e.target.value })}
                required
                min="0.01"
                step="0.01"
              />
            </div>
            <div>
              <label htmlFor="recovery-date" className="label">Date *</label>
              <input
                id="recovery-date"
                type="date"
                className="input"
                value={recoveryForm.date}
                onChange={(e) => setRecoveryForm({ ...recoveryForm, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="recovery-source" className="label">Source</label>
            <select
              id="recovery-source"
              className="input"
              value={recoveryForm.source}
              onChange={(e) => setRecoveryForm({ ...recoveryForm, source: e.target.value })}
            >
              {RECOVERY_SOURCES.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="recovery-treatment" className="label">Budget Treatment</label>
            <select
              id="recovery-treatment"
              className="input"
              value={recoveryForm.budgetTreatment}
              onChange={(e) => setRecoveryForm({ ...recoveryForm, budgetTreatment: e.target.value })}
            >
              {BUDGET_TREATMENTS.map((treatment) => <option key={treatment.value} value={treatment.value}>{treatment.label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="recovery-notes" className="label">Notes</label>
            <textarea
              id="recovery-notes"
              className="input resize-none"
              rows={2}
              value={recoveryForm.notes}
              onChange={(e) => setRecoveryForm({ ...recoveryForm, notes: e.target.value })}
              placeholder="Bank reimbursement, shared expense, etc."
            />
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
            <button type="button" onClick={() => setRecoveryModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={savingRecovery}>{savingRecovery ? 'Saving...' : 'Add Recovery'}</button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Expense' : 'Add Expense'} size="lg">
        <form
          onSubmit={(event) => {
            if (event.nativeEvent.submitter?.dataset.allowSubmit !== 'true') {
              event.preventDefault();
              return;
            }
            handleSubmit(event);
          }}
          className="space-y-4"
        >
          {saveError && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{saveError}</p>}

          <div
            className="sm:hidden"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') event.preventDefault();
            }}
          >
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                <span>Step {wizardStep + 1} of {wizardSteps.length}</span>
                <span>{wizardSteps[wizardStep]?.label}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${((wizardStep + 1) / wizardSteps.length) * 100}%` }}
                />
              </div>
            </div>

            {renderWizardStep()}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={wizardStep === 0 ? () => setModalOpen(false) : previousWizardStep}
                className="btn-secondary flex-1"
              >
                {wizardStep === 0 ? 'Cancel' : 'Back'}
              </button>
              {wizardStep === wizardSteps.length - 1 ? (
                <button type="button" onClick={handleSubmit} className="btn-primary flex-1" disabled={saving || !wizardCanContinue()}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Save Expense'}
                </button>
              ) : (
                <button type="button" onClick={nextWizardStep} className="btn-primary flex-1" disabled={!wizardCanContinue()}>
                  Next
                </button>
              )}
            </div>
          </div>

          <div className="hidden space-y-4 sm:block">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="exp-member" className="label">Member *</label>
              <select id="exp-member" className="input" value={form.memberId} onChange={(e) => handleMemberChange(e.target.value)} required>
                <option value="">Select member</option>
                {members.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="exp-date" className="label">Date *</label>
              <input id="exp-date" type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="exp-category" className="label">Category *</label>
              <select id="exp-category" className="input" value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value, subCategoryId: '' })} required>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="exp-subcategory" className="label">Sub-Category</label>
              <select id="exp-subcategory" className="input" value={form.subCategoryId}
                onChange={(e) => setForm({ ...form, subCategoryId: e.target.value })} disabled={!subCategories.length}>
                <option value="">None</option>
                {subCategories.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="exp-amount" className="label">Amount (<DirhamSymbol className="h-[0.75em] w-auto inline align-middle" />) *</label>
              <input id="exp-amount" type="number" className="input" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="0.01" step="0.01" placeholder="0" />
            </div>
            <div>
              <label htmlFor="exp-payment" className="label">Payment Method</label>
              <select id="exp-payment" className="input" value={form.paymentMethod} onChange={(e) => handlePaymentChange(e.target.value)}>
                {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Credit card selector — only when credit_card is selected */}
          {form.paymentMethod === 'credit_card' && (
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-3 space-y-2">
              <label htmlFor="exp-credit-card" className="label text-violet-700">Credit Card *</label>
              {allCreditCards.length === 0 ? (
                <p className="text-xs text-violet-500">
                  No credit cards found.{' '}
                  <Link to="/credit-cards" className="underline font-medium">Add one on the Credit Cards page</Link>.
                </p>
              ) : (
                <select id="exp-credit-card" className="input" value={form.creditCardId}
                  onChange={(e) => setForm({ ...form, creditCardId: e.target.value })} required>
                  <option value="">Select card</option>
                  {allCreditCards.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.bankName} — {c.name}{c.lastFourDigits ? ` (••••${c.lastFourDigits})` : ''}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-violet-400">Credit card expenses do not reduce your account balance.</p>
            </div>
          )}

          {/* Savings account selector — only when savings payment method is selected */}
          {form.paymentMethod === 'savings' && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 space-y-2">
              <label htmlFor="exp-savings-account" className="label text-emerald-700">Savings Account *</label>
              {savingsAccounts.length === 0 ? (
                <p className="text-xs text-emerald-600">No savings accounts found. Add one on the Savings page.</p>
              ) : (
                <select id="exp-savings-account" className="input" value={form.savingsAccountId}
                  onChange={(e) => setForm({ ...form, savingsAccountId: e.target.value })} required>
                  <option value="">Select account</option>
                  {savingsAccounts.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name}{a.bankName ? ` — ${a.bankName}` : ''} ({a.memberId?.name})
                    </option>
                  ))}
                </select>
              )}
              {form.savingsAccountId && (() => {
                const acc = savingsAccounts.find((a) => a._id === form.savingsAccountId);
                return acc ? (
                  <p className="text-xs text-rose-600 flex items-center gap-1">
                    <DirhamSymbol className="h-[0.75em] w-auto inline align-middle" />{fmt(form.amount || 0)} will be deducted from <strong>{acc.name}</strong>
                  </p>
                ) : null;
              })()}
            </div>
          )}

          <div>
            <label htmlFor="exp-description" className="label">Description</label>
            <input id="exp-description" type="text" className="input" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Big Basket order" />
          </div>
          <div>
            <label htmlFor="exp-notes" className="label">Notes</label>
            <textarea id="exp-notes" className="input resize-none" rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes..." />
          </div>

          {(() => {
            const idleLabel = editing ? 'Update' : 'Add Expense';
            const submitLabel = saving ? 'Saving...' : idleLabel;
            return (
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" data-allow-submit="true" className="btn-primary flex-1" disabled={saving}>{submitLabel}</button>
              </div>
            );
          })()}
          </div>
        </form>
      </Modal>
    </div>
  );
}
