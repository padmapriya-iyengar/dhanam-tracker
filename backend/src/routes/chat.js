const express = require('express');
const router = express.Router();
const Balance = require('../models/Balance');
const CategoryGoal = require('../models/CategoryGoal');
const CreditCard = require('../models/CreditCard');
const CreditCardBudget = require('../models/CreditCardBudget');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Member = require('../models/Member');
const SavingsAccount = require('../models/SavingsAccount');
const Transfer = require('../models/Transfer');

const CURRENT_BALANCE_EXPENSE_METHODS = ['cash', 'card', 'current_account', 'debit_card', 'netbanking', 'upi', 'other'];

function monthName(month) {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1];
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthRange(month, year) {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59, 999),
    label: `${monthName(month)} ${year}`,
    month,
    year,
  };
}

function resolveDateRange(args = {}) {
  const now = new Date();
  if (args.startDate && args.endDate) {
    const start = new Date(args.startDate);
    const end = new Date(args.endDate);
    end.setHours(23, 59, 59, 999);
    return { start, end, label: `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}` };
  }

  if (args.month) return monthRange(parseInt(args.month), parseInt(args.year) || now.getFullYear());

  switch (args.range) {
    case 'last_month':
      return monthRange(now.getMonth() || 12, now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());
    case 'last_3_months':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        end: now,
        label: 'last 3 months',
      };
    case 'last_6_months':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        end: now,
        label: 'last 6 months',
      };
    case 'this_year':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: now,
        label: `${now.getFullYear()} to date`,
      };
    case 'current_month':
    default:
      return {
        ...monthRange(now.getMonth() + 1, now.getFullYear()),
        end: now,
        label: 'current month',
      };
  }
}

function rangePayload(range) {
  return {
    label: range.label,
    startDate: localDateString(range.start),
    endDate: localDateString(range.end),
  };
}

function netExpenseStages(match) {
  return [
    { $match: match },
    {
      $lookup: {
        from: 'expenserecoveries',
        let: { expenseId: '$_id', userId: '$userId' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$expenseId', '$$expenseId'] },
                  { $eq: ['$userId', '$$userId'] },
                  { $eq: ['$budgetTreatment', 'reduce_expense'] },
                ],
              },
            },
          },
          { $group: { _id: null, amount: { $sum: '$amount' } } },
        ],
        as: 'budgetRecoveries',
      },
    },
    { $addFields: { recoveredForBudget: { $min: [{ $ifNull: [{ $first: '$budgetRecoveries.amount' }, 0] }, '$amount'] } } },
    { $addFields: { netAmount: { $max: [{ $subtract: ['$amount', '$recoveredForBudget'] }, 0] } } },
  ];
}

async function expenseTotal(userId, start, end) {
  const rows = await Expense.aggregate([
    ...netExpenseStages({ userId, date: { $gte: start, $lte: end } }),
    { $group: { _id: null, total: { $sum: '$netAmount' }, grossTotal: { $sum: '$amount' }, recoveredAmount: { $sum: '$recoveredForBudget' }, count: { $sum: 1 } } },
  ]);
  return rows[0] || { total: 0, grossTotal: 0, recoveredAmount: 0, count: 0 };
}

async function incomeTotal(userId, start, end) {
  const rows = await Income.aggregate([
    { $match: { userId, date: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  return rows[0] || { total: 0, count: 0 };
}

function groupSpec(groupBy) {
  switch (groupBy) {
    case 'member':
      return { groupId: '$memberId', labelPath: '$member.name', lookups: [{ from: 'members', as: 'member' }] };
    case 'paymentMethod':
      return { groupId: '$paymentMethod', labelPath: '$_id', lookups: [] };
    case 'month':
      return { groupId: { month: '$month', year: '$year' }, labelPath: null, lookups: [] };
    case 'subcategory':
      return { groupId: { categoryId: '$categoryId', subCategoryId: '$subCategoryId' }, labelPath: null, lookups: [] };
    case 'category':
    default:
      return { groupId: '$categoryId', labelPath: '$category.name', lookups: [{ from: 'categories', as: 'category' }] };
  }
}

async function analyzeExpenses(userId, args = {}) {
  const range = resolveDateRange(args);
  const limit = Math.min(parseInt(args.limit) || 8, 15);
  const groupBy = args.groupBy || 'category';
  const spec = groupSpec(groupBy);
  const pipeline = [
    ...netExpenseStages({ userId, date: { $gte: range.start, $lte: range.end } }),
    { $group: { _id: spec.groupId, total: { $sum: '$netAmount' }, grossTotal: { $sum: '$amount' }, recoveredAmount: { $sum: '$recoveredForBudget' }, count: { $sum: 1 } } },
  ];

  spec.lookups.forEach((lookup) => {
    pipeline.push({ $lookup: { from: lookup.from, localField: '_id', foreignField: '_id', as: lookup.as } });
    pipeline.push({ $unwind: { path: `$${lookup.as}`, preserveNullAndEmptyArrays: true } });
  });

  if (groupBy === 'month') {
    pipeline.push({ $project: { _id: 0, label: { $concat: [{ $toString: '$_id.month' }, '/', { $toString: '$_id.year' }] }, month: '$_id.month', year: '$_id.year', total: 1, grossTotal: 1, recoveredAmount: 1, count: 1 } });
    pipeline.push({ $sort: { year: 1, month: 1 } });
  } else if (groupBy === 'subcategory') {
    pipeline.push({ $lookup: { from: 'categories', localField: '_id.categoryId', foreignField: '_id', as: 'category' } });
    pipeline.push({ $unwind: { path: '$category', preserveNullAndEmptyArrays: true } });
    pipeline.push({ $lookup: { from: 'subcategories', localField: '_id.subCategoryId', foreignField: '_id', as: 'subCategory' } });
    pipeline.push({ $unwind: { path: '$subCategory', preserveNullAndEmptyArrays: true } });
    pipeline.push({ $project: { _id: 0, label: { $concat: ['$category.name', ' / ', { $ifNull: ['$subCategory.name', 'Uncategorized'] }] }, total: 1, grossTotal: 1, recoveredAmount: 1, count: 1 } });
    pipeline.push({ $sort: { total: -1 } });
  } else {
    pipeline.push({ $project: { _id: 0, label: spec.labelPath, total: 1, grossTotal: 1, recoveredAmount: 1, count: 1 } });
    pipeline.push({ $sort: { total: -1 } });
  }
  pipeline.push({ $limit: limit });

  const [summary, breakdown, topExpenses] = await Promise.all([
    expenseTotal(userId, range.start, range.end),
    Expense.aggregate(pipeline),
    Expense.aggregate([
      ...netExpenseStages({ userId, date: { $gte: range.start, $lte: range.end } }),
      { $sort: { netAmount: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'category' } },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'members', localField: 'memberId', foreignField: '_id', as: 'member' } },
      { $unwind: { path: '$member', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, amount: '$netAmount', grossAmount: '$amount', recoveredAmount: '$recoveredForBudget', description: 1, date: 1, category: '$category.name', member: '$member.name', paymentMethod: 1 } },
    ]),
  ]);

  return { type: 'expense_analysis', range: rangePayload(range), groupBy, summary, breakdown, topExpenses };
}

async function findExpenses(userId, args = {}) {
  const range = resolveDateRange(args);
  const limit = Math.min(parseInt(args.limit) || 10, 25);
  const match = { userId, date: { $gte: range.start, $lte: range.end } };
  let amount = null;
  let tolerance = null;

  if (args.amount !== undefined && args.amount !== null) {
    amount = Number(args.amount);
    tolerance = Math.max(Number(args.tolerance) || 0.99, 0);
    if (Number.isFinite(amount)) {
      match.amount = { $gte: amount - tolerance, $lte: amount + tolerance };
    }
  }

  if (args.paymentMethod) match.paymentMethod = args.paymentMethod;

  function buildPipeline(searchMatch, rowLimit = limit) {
    return [
      ...netExpenseStages(searchMatch),
      { $sort: { date: -1, amount: -1 } },
      { $limit: rowLimit },
      { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'category' } },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'subcategories', localField: 'subCategoryId', foreignField: '_id', as: 'subCategory' } },
      { $unwind: { path: '$subCategory', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'members', localField: 'memberId', foreignField: '_id', as: 'member' } },
      { $unwind: { path: '$member', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'creditcards', localField: 'creditCardId', foreignField: '_id', as: 'creditCard' } },
      { $unwind: { path: '$creditCard', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'savingsaccounts', localField: 'savingsAccountId', foreignField: '_id', as: 'savingsAccount' } },
      { $unwind: { path: '$savingsAccount', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          amount: 1,
          netAmount: 1,
          recoveredAmount: '$recoveredForBudget',
          date: 1,
          description: 1,
          notes: 1,
          paymentMethod: 1,
          category: '$category.name',
          subCategory: '$subCategory.name',
          member: '$member.name',
          creditCard: {
            $cond: [
              '$creditCard',
              {
                bankName: '$creditCard.bankName',
                name: '$creditCard.name',
                lastFourDigits: '$creditCard.lastFourDigits',
              },
              null,
            ],
          },
          savingsAccount: {
            $cond: [
              '$savingsAccount',
              {
                bankName: '$savingsAccount.bankName',
                name: '$savingsAccount.name',
              },
              null,
            ],
          },
        },
      },
    ];
  }

  const rows = await Expense.aggregate(buildPipeline(match));
  let fallback = null;

  if (rows.length === 0 && Number.isFinite(amount)) {
    const baseAmountMatch = {
      userId,
      amount: { $gte: amount - tolerance, $lte: amount + tolerance },
    };
    if (args.paymentMethod) baseAmountMatch.paymentMethod = args.paymentMethod;

    if (args.month) {
      const sameMonthRows = await Expense.aggregate(buildPipeline({ ...baseAmountMatch, month: parseInt(args.month) }, 8));
      if (sameMonthRows.length > 0) {
        fallback = {
          reason: 'No match in the selected year, but matching amounts were found in the same month across other years.',
          rows: sameMonthRows,
        };
      }
    }

    if (!fallback) {
      const anyDateRows = await Expense.aggregate(buildPipeline(baseAmountMatch, 8));
      if (anyDateRows.length > 0) {
        fallback = {
          reason: 'No match in the selected period, but matching amounts were found in other dates.',
          rows: anyDateRows,
        };
      }
    }
  }

  return {
    type: 'expense_search',
    range: rangePayload(range),
    criteria: {
      amount: args.amount ?? null,
      tolerance: args.amount !== undefined ? Math.max(Number(args.tolerance) || 0.99, 0) : null,
      paymentMethod: args.paymentMethod || null,
    },
    count: rows.length,
    rows,
    fallback,
  };
}

async function compareMonths(userId, args = {}) {
  const now = new Date();
  const month = parseInt(args.month) || now.getMonth() + 1;
  const year = parseInt(args.year) || now.getFullYear();
  const current = monthRange(month, year);
  const previous = args.compareMonth && args.compareYear
    ? monthRange(parseInt(args.compareMonth), parseInt(args.compareYear))
    : monthRange(month === 1 ? 12 : month - 1, month === 1 ? year - 1 : year);

  const [currentExpense, previousExpense, currentIncome, previousIncome] = await Promise.all([
    expenseTotal(userId, current.start, current.end),
    expenseTotal(userId, previous.start, previous.end),
    incomeTotal(userId, current.start, current.end),
    incomeTotal(userId, previous.start, previous.end),
  ]);

  return {
    type: 'month_comparison',
    current: { label: current.label, income: currentIncome.total, expenses: currentExpense.total, savings: currentIncome.total - currentExpense.total, transactions: currentExpense.count },
    previous: { label: previous.label, income: previousIncome.total, expenses: previousExpense.total, savings: previousIncome.total - previousExpense.total, transactions: previousExpense.count },
  };
}

async function cardBudgets(userId, args = {}) {
  const now = new Date();
  const month = parseInt(args.month) || now.getMonth() + 1;
  const year = parseInt(args.year) || now.getFullYear();
  const range = monthRange(month, year);
  if (month === now.getMonth() + 1 && year === now.getFullYear()) range.end = now;

  const [cards, budgets, spend, payments] = await Promise.all([
    CreditCard.find({ userId, isActive: true }).populate('memberId', 'name color role').sort({ bankName: 1 }),
    CreditCardBudget.find({ userId, month, year }),
    Expense.aggregate([
      ...netExpenseStages({ userId, paymentMethod: 'credit_card', date: { $gte: range.start, $lte: range.end } }),
      { $group: { _id: '$creditCardId', total: { $sum: '$netAmount' }, grossTotal: { $sum: '$amount' }, recoveredAmount: { $sum: '$recoveredForBudget' }, count: { $sum: 1 } } },
    ]),
    Transfer.aggregate([
      { $match: { userId, toAccountType: 'credit_card', date: { $gte: range.start, $lte: range.end } } },
      { $group: { _id: '$toCreditCardId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  const budgetMap = Object.fromEntries(budgets.map((budget) => [String(budget.creditCardId), budget]));
  const spendMap = Object.fromEntries(spend.filter((item) => item._id).map((item) => [String(item._id), item]));
  const paymentMap = Object.fromEntries(payments.filter((item) => item._id).map((item) => [String(item._id), item]));
  const rows = cards.map((card) => {
    const key = String(card._id);
    const budgeted = budgetMap[key]?.budgetAmount || 0;
    const spent = spendMap[key]?.total || 0;
    const balance = budgeted - spent;
    return {
      card: `${card.bankName} ${card.name}`,
      owner: card.memberId?.name,
      budgeted,
      spent,
      grossSpent: spendMap[key]?.grossTotal || 0,
      recoveredAmount: spendMap[key]?.recoveredAmount || 0,
      paid: paymentMap[key]?.total || 0,
      balance,
      consumedPercent: budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0,
    };
  });

  return {
    type: 'card_budgets',
    range: rangePayload(range),
    totals: {
      budgeted: rows.reduce((sum, row) => sum + row.budgeted, 0),
      spent: rows.reduce((sum, row) => sum + row.spent, 0),
      recoveredAmount: rows.reduce((sum, row) => sum + row.recoveredAmount, 0),
      paid: rows.reduce((sum, row) => sum + row.paid, 0),
      balance: rows.reduce((sum, row) => sum + row.balance, 0),
    },
    rows,
  };
}

async function sumForMember(Model, userId, memberId, dateLte, options = {}) {
  const match = { userId, memberId, date: { $lte: dateLte } };
  if (options.onlyDebit) match.paymentMethod = { $in: CURRENT_BALANCE_EXPENSE_METHODS };
  if (options.currentAccountIncomeOnly) match.$or = [{ savingsAccountId: null }, { savingsAccountId: { $exists: false } }];
  const result = await Model.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
  return result[0]?.total || 0;
}

async function currentTransferEffect(userId, memberId, dateLte) {
  const result = await Transfer.aggregate([
    {
      $match: {
        userId,
        date: { $lte: dateLte },
        $or: [
          { fromAccountType: 'current', fromMemberId: memberId },
          { toAccountType: 'current', toMemberId: memberId },
        ],
      },
    },
    {
      $group: {
        _id: null,
        outgoing: { $sum: { $cond: [{ $eq: ['$fromMemberId', memberId] }, '$amount', 0] } },
        incoming: { $sum: { $cond: [{ $eq: ['$toMemberId', memberId] }, '$amount', 0] } },
      },
    },
  ]);
  return (result[0]?.incoming || 0) - (result[0]?.outgoing || 0);
}

async function savingsLedgerEffect(userId, accountId, dateLte) {
  const [income, expenses, transfers] = await Promise.all([
    Income.aggregate([{ $match: { userId, savingsAccountId: accountId, date: { $lte: dateLte } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $match: { userId, savingsAccountId: accountId, paymentMethod: 'savings', date: { $lte: dateLte } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Transfer.aggregate([
      { $match: { userId, date: { $lte: dateLte }, $or: [{ fromAccountType: 'savings', fromSavingsAccountId: accountId }, { toAccountType: 'savings', toSavingsAccountId: accountId }] } },
      { $group: { _id: null, outgoing: { $sum: { $cond: [{ $eq: ['$fromSavingsAccountId', accountId] }, '$amount', 0] } }, incoming: { $sum: { $cond: [{ $eq: ['$toSavingsAccountId', accountId] }, '$amount', 0] } } } },
    ]),
  ]);
  return (income[0]?.total || 0) - (expenses[0]?.total || 0) + (transfers[0]?.incoming || 0) - (transfers[0]?.outgoing || 0);
}

async function accountBalances(userId, args = {}) {
  const now = new Date();
  const month = parseInt(args.month) || now.getMonth() + 1;
  const year = parseInt(args.year) || now.getFullYear();
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const asOf = isCurrentMonth ? now : new Date(year, month, 0, 23, 59, 59, 999);

  const [members, savingsAccounts] = await Promise.all([
    Member.find({ userId, isActive: true }),
    SavingsAccount.find({ userId }).populate('memberId', 'name color role'),
  ]);

  const currentRows = await Promise.all(members.map(async (member) => {
    const doc = await Balance.findOne({ userId, memberId: member._id });
    const openingBalance = doc?.openingBalance ?? 0;
    const [income, expense, transfers] = await Promise.all([
      sumForMember(Income, userId, member._id, asOf, { currentAccountIncomeOnly: true }),
      sumForMember(Expense, userId, member._id, asOf, { onlyDebit: true }),
      currentTransferEffect(userId, member._id, asOf),
    ]);
    return { member: member.name, currentBalance: openingBalance + income - expense + transfers, openingBalance };
  }));

  const savingsRows = await Promise.all(savingsAccounts.map(async (account) => {
    const effect = await savingsLedgerEffect(userId, account._id, asOf);
    return { account: account.name, bank: account.bankName, owner: account.memberId?.name, balance: (account.openingBalance || 0) + effect };
  }));

  return {
    type: 'account_balances',
    asOf,
    currentAccounts: currentRows,
    savingsAccounts: savingsRows,
    totals: {
      current: currentRows.reduce((sum, row) => sum + row.currentBalance, 0),
      savings: savingsRows.reduce((sum, row) => sum + row.balance, 0),
    },
  };
}

async function categoryGoals(userId, args = {}) {
  const range = resolveDateRange(args);
  const [spend, goals] = await Promise.all([
    Expense.aggregate([
      ...netExpenseStages({ userId, date: { $gte: range.start, $lte: range.end } }),
      { $group: { _id: '$categoryId', total: { $sum: '$netAmount' }, count: { $sum: 1 } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $project: { _id: 0, categoryId: '$_id', name: '$category.name', total: 1, count: 1 } },
      { $sort: { total: -1 } },
    ]),
    CategoryGoal.find({}),
  ]);
  const goalMap = Object.fromEntries(goals.map((goal) => [String(goal.categoryId), goal.goal]));
  return {
    type: 'category_goals',
    range: rangePayload(range),
    rows: spend.map((row) => {
      const goal = goalMap[String(row.categoryId)] || 5000;
      return { ...row, goal, remaining: goal - row.total, percentUsed: goal > 0 ? Math.round((row.total / goal) * 100) : 0 };
    }),
  };
}

const toolHandlers = {
  analyze_expenses: analyzeExpenses,
  find_expenses: findExpenses,
  compare_months: compareMonths,
  get_card_budgets: cardBudgets,
  get_account_balances: accountBalances,
  get_category_goals: categoryGoals,
};

const tools = [
  {
    type: 'function',
    function: {
      name: 'analyze_expenses',
      description: 'Analyze expenses by category, member, payment method, subcategory, or month for a date range. Use for highest spend, max expense category, top categories, or where money went. Do not use for finding an exact transaction amount; use find_expenses instead.',
      parameters: {
        type: 'object',
        properties: {
          range: { type: 'string', enum: ['current_month', 'last_month', 'last_3_months', 'last_6_months', 'this_year', 'custom'] },
          startDate: { type: 'string', description: 'YYYY-MM-DD for custom ranges' },
          endDate: { type: 'string', description: 'YYYY-MM-DD for custom ranges' },
          month: { type: 'number' },
          year: { type: 'number' },
          groupBy: { type: 'string', enum: ['category', 'subcategory', 'member', 'paymentMethod', 'month'] },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_expenses',
      description: 'Find individual expense transactions by exact amount, approximate amount, month, date range, payment method, and return card/account details. Use this when the user asks about a specific amount, date, transaction, card used, or cannot find an expense.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Expense amount to search for, e.g. 328' },
          tolerance: { type: 'number', description: 'Allowed amount difference. Use 0.99 by default for rounded user-entered amounts.' },
          range: { type: 'string', enum: ['current_month', 'last_month', 'last_3_months', 'last_6_months', 'this_year', 'custom'] },
          startDate: { type: 'string', description: 'YYYY-MM-DD for custom ranges' },
          endDate: { type: 'string', description: 'YYYY-MM-DD for custom ranges' },
          month: { type: 'number' },
          year: { type: 'number' },
          paymentMethod: { type: 'string', enum: ['cash', 'card', 'current_account', 'debit_card', 'credit_card', 'upi', 'netbanking', 'savings', 'other'] },
          limit: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_months',
      description: 'Compare income, expenses, and savings between two months.',
      parameters: {
        type: 'object',
        properties: {
          month: { type: 'number' },
          year: { type: 'number' },
          compareMonth: { type: 'number' },
          compareYear: { type: 'number' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_card_budgets',
      description: 'Get credit card monthly budget status, net spend, payments, recoveries, and budget balance.',
      parameters: { type: 'object', properties: { month: { type: 'number' }, year: { type: 'number' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_account_balances',
      description: 'Get current account and savings balances as of a month end or today.',
      parameters: { type: 'object', properties: { month: { type: 'number' }, year: { type: 'number' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_category_goals',
      description: 'Get category goal usage and over-budget categories for a period.',
      parameters: {
        type: 'object',
        properties: {
          range: { type: 'string', enum: ['current_month', 'last_month', 'last_3_months', 'last_6_months', 'this_year', 'custom'] },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          month: { type: 'number' },
          year: { type: 'number' },
        },
      },
    },
  },
];

async function openAIChat({ messages, tools: openAITools, apiKey, model }) {
  const requestBody = {
    model,
    messages,
    tools: openAITools,
    tool_choice: 'auto',
    max_completion_tokens: 3000,
  };
  if (model.startsWith('gpt-5')) requestBody.reasoning_effort = 'minimal';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || `OpenAI request failed with status ${response.status}`);
  return payload.choices?.[0]?.message || {};
}

router.post('/', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      return res.status(400).json({ error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your backend .env file.' });
    }

    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
    const currency = req.user.currency || 'AED';
    const history = Array.isArray(req.body.history) ? req.body.history.slice(-8) : [];
    const safeHistory = history
      .filter((item) => ['user', 'assistant'].includes(item.role) && item.content)
      .map((item) => ({ role: item.role, content: String(item.content).slice(0, 1200) }));

    const systemMessage = {
      role: 'system',
          content: `You are Dhanam's read-only financial assistant. Use tools for any question about the user's finances. Use find_expenses whenever the user asks about a specific transaction, amount, date, card used, or says they cannot find an expense. Do not invent numbers or dates. Currency is ${currency}. Today is ${new Date().toISOString().slice(0, 10)}. If a question asks to create, update, or delete records, say you can only analyze data for now. Format every final answer for mobile readability: start with a one-sentence direct answer, then use short Markdown sections only when detail helps.`,
    };

    const firstMessage = await openAIChat({
      apiKey,
      model,
      tools,
      messages: [systemMessage, ...safeHistory, { role: 'user', content: message }],
    });

    const toolCalls = firstMessage.tool_calls || [];
    if (!toolCalls.length) {
      return res.json({ answer: firstMessage.content || 'I could not determine which financial data to inspect. Try asking about expenses, card budgets, balances, or month comparisons.', toolResults: [], model });
    }

    const toolResults = [];
    for (const call of toolCalls.slice(0, 4)) {
      const name = call.function?.name;
      const handler = toolHandlers[name];
      if (!handler) continue;
      let args = {};
      try {
        args = JSON.parse(call.function?.arguments || '{}');
      } catch {
        args = {};
      }
      const result = await handler(req.user._id, args);
      toolResults.push({ tool_call_id: call.id, name, result });
    }

    const finalRequestBody = {
      model,
      messages: [
        systemMessage,
        ...safeHistory,
        { role: 'user', content: message },
        firstMessage,
        ...toolResults.map((item) => ({
          role: 'tool',
          tool_call_id: item.tool_call_id,
          name: item.name,
          content: JSON.stringify(item.result),
        })),
        {
          role: 'system',
          content: `Answer from the tool results only. Do not infer or approximate dates.

Use this Markdown format:
- First line: a crisp direct answer in one sentence.
- Then, if more detail is useful, add sections with exactly these heading styles:
  ## Period
  ## Key Numbers
  ## Breakdown
  ## Top Items
  ## Next Step
- Keep bullets short. Prefer 3 to 5 bullets per section.
- Do not nest bullets.
- Do not indent bullets manually.
- Bold only the label or amount that matters.
- If an expense_search result has zero primary rows but includes fallback rows, explain both: no match in the searched period, then list the fallback matches.
- Skip any section that is not relevant.`,
        },
      ],
      max_completion_tokens: 2500,
    };
    if (model.startsWith('gpt-5')) finalRequestBody.reasoning_effort = 'minimal';

    const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finalRequestBody),
    });
    const finalPayload = await finalResponse.json().catch(() => ({}));
    if (!finalResponse.ok) throw new Error(finalPayload.error?.message || `OpenAI request failed with status ${finalResponse.status}`);

    const answer = finalPayload.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error('OpenAI returned an empty chat response.');

    res.json({
      answer,
      model,
      toolsUsed: toolResults.map((item) => item.name),
      generatedAt: new Date(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
