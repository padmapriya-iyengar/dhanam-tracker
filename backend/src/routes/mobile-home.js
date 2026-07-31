const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Expense = require('../models/Expense');
const ExpenseRecovery = require('../models/ExpenseRecovery');
const Income = require('../models/Income');
const Transfer = require('../models/Transfer');
const Subscription = require('../models/Subscription');
const CreditCard = require('../models/CreditCard');
const CreditCardBudget = require('../models/CreditCardBudget');
const CategoryGoal = require('../models/CategoryGoal');
const Member = require('../models/Member');
const Balance = require('../models/Balance');
const SavingsAccount = require('../models/SavingsAccount');

const CURRENT_METHODS = ['cash', 'card', 'current_account', 'debit_card', 'netbanking', 'upi', 'other'];
const id = (value) => String(value?._id || value || '');
const sum = (rows, field = 'total') => rows[0]?.[field] || 0;

function monthWindow(month, year) {
  const now = new Date();
  const m = Math.min(Math.max(parseInt(month, 10) || now.getMonth() + 1, 1), 12);
  const y = parseInt(year, 10) || now.getFullYear();
  const start = new Date(y, m - 1, 1);
  const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);
  const isCurrent = m === now.getMonth() + 1 && y === now.getFullYear();
  const through = isCurrent ? now : endOfMonth;
  return {
    month: m, year: y, start, end: endOfMonth, through, isCurrent,
    previousStart: new Date(y, m - 2, 1),
    previousEnd: new Date(y, m - 1, 0, 23, 59, 59, 999),
    daysInMonth: endOfMonth.getDate(),
    elapsedDays: isCurrent ? now.getDate() : endOfMonth.getDate(),
  };
}

function scoped(userId, memberId, extra = {}) {
  return { userId, ...(memberId ? { memberId } : {}), ...extra };
}

function netExpenseStages(match) {
  return [
    { $match: match },
    {
      $lookup: {
        from: 'expenserecoveries',
        let: { expenseId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$expenseId', '$$expenseId'] }, { $eq: ['$budgetTreatment', 'reduce_expense'] }] } } },
          { $group: { _id: null, amount: { $sum: '$amount' } } },
        ],
        as: 'recoveries',
      },
    },
    { $addFields: { recovered: { $min: [{ $ifNull: [{ $first: '$recoveries.amount' }, 0] }, '$amount'] } } },
    { $addFields: { netAmount: { $max: [{ $subtract: ['$amount', '$recovered'] }, 0] } } },
  ];
}

async function monthlySummary(userId, memberId, window) {
  const currentMatch = scoped(userId, memberId, { date: { $gte: window.start, $lte: window.through } });
  const previousMatch = scoped(userId, memberId, { date: { $gte: window.previousStart, $lte: window.previousEnd } });
  const [income, expense, previousIncome, previousExpense, categories] = await Promise.all([
    Income.aggregate([{ $match: currentMatch }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Expense.aggregate([...netExpenseStages(currentMatch), { $group: { _id: null, total: { $sum: '$netAmount' } } }]),
    Income.aggregate([{ $match: previousMatch }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Expense.aggregate([...netExpenseStages(previousMatch), { $group: { _id: null, total: { $sum: '$netAmount' } } }]),
    Expense.aggregate([
      ...netExpenseStages(currentMatch),
      { $group: { _id: '$categoryId', total: { $sum: '$netAmount' }, count: { $sum: 1 } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $project: { _id: 0, categoryId: '$_id', name: '$category.name', color: '$category.color', total: 1, count: 1 } },
      { $sort: { total: -1 } },
    ]),
  ]);
  const totalIncome = sum(income);
  const netExpense = sum(expense);
  const netSavings = totalIncome - netExpense;
  const previousSavings = sum(previousIncome) - sum(previousExpense);
  return {
    totalIncome, netExpense, netSavings,
    savingsRate: totalIncome > 0 ? Math.round((netSavings / totalIncome) * 1000) / 10 : 0,
    previous: { income: sum(previousIncome), expense: sum(previousExpense), savings: previousSavings },
    savingsChange: previousSavings !== 0 ? Math.round(((netSavings - previousSavings) / Math.abs(previousSavings)) * 1000) / 10 : null,
    categories,
  };
}

async function accountSnapshot(userId, memberId, window) {
  const memberQuery = { userId, isActive: true, ...(memberId ? { _id: memberId } : {}) };
  const savingsQuery = { userId, ...(memberId ? { memberId } : {}) };
  const cardQuery = { userId, isActive: true, ...(memberId ? { memberId } : {}) };
  const [members, savings, cards] = await Promise.all([
    Member.find(memberQuery), SavingsAccount.find(savingsQuery).populate('memberId', 'name'), CreditCard.find(cardQuery).populate('memberId', 'name'),
  ]);

  const currentAccounts = await Promise.all(members.map(async (member) => {
    const opening = (await Balance.findOne({ userId, memberId: member._id }))?.openingBalance || 0;
    const [incomes, expenses, transfers, periodIncome, periodExpense, periodTransfers] = await Promise.all([
      Income.aggregate([{ $match: { userId, memberId: member._id, date: { $lte: window.through }, $or: [{ savingsAccountId: null }, { savingsAccountId: { $exists: false } }] } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { userId, memberId: member._id, date: { $lte: window.through }, paymentMethod: { $in: CURRENT_METHODS } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Transfer.aggregate([
        { $match: { userId, date: { $lte: window.through }, $or: [{ fromAccountType: 'current', fromMemberId: member._id }, { toAccountType: 'current', toMemberId: member._id }] } },
        { $group: { _id: null, incoming: { $sum: { $cond: [{ $eq: ['$toMemberId', member._id] }, '$amount', 0] } }, outgoing: { $sum: { $cond: [{ $eq: ['$fromMemberId', member._id] }, '$amount', 0] } } } },
      ]),
      Income.aggregate([{ $match: { userId, memberId: member._id, date: { $gte: window.start, $lte: window.through }, $or: [{ savingsAccountId: null }, { savingsAccountId: { $exists: false } }] } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { userId, memberId: member._id, date: { $gte: window.start, $lte: window.through }, paymentMethod: { $in: CURRENT_METHODS } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Transfer.aggregate([
        { $match: { userId, date: { $gte: window.start, $lte: window.through }, $or: [{ fromAccountType: 'current', fromMemberId: member._id }, { toAccountType: 'current', toMemberId: member._id }] } },
        { $group: { _id: null, incoming: { $sum: { $cond: [{ $eq: ['$toMemberId', member._id] }, '$amount', 0] } }, outgoing: { $sum: { $cond: [{ $eq: ['$fromMemberId', member._id] }, '$amount', 0] } } } },
      ]),
    ]);
    const movement = sum(incomes) - sum(expenses) + (transfers[0]?.incoming || 0) - (transfers[0]?.outgoing || 0);
    const recentMovement = sum(periodIncome) - sum(periodExpense) + (periodTransfers[0]?.incoming || 0) - (periodTransfers[0]?.outgoing || 0);
    return { key: `current:${member._id}`, type: 'current', name: `${member.name} Current`, owner: member.name, color: member.color, balance: opening + movement, recentMovement, updatedAt: window.through };
  }));

  const savingsAccounts = await Promise.all(savings.map(async (account) => {
    const [incomes, expenses, transfers, periodIncome, periodExpense, periodTransfers] = await Promise.all([
      Income.aggregate([{ $match: { userId, savingsAccountId: account._id, date: { $lte: window.through } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { userId, savingsAccountId: account._id, paymentMethod: 'savings', date: { $lte: window.through } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Transfer.aggregate([
        { $match: { userId, date: { $lte: window.through }, $or: [{ fromSavingsAccountId: account._id }, { toSavingsAccountId: account._id }] } },
        { $group: { _id: null, incoming: { $sum: { $cond: [{ $eq: ['$toSavingsAccountId', account._id] }, '$amount', 0] } }, outgoing: { $sum: { $cond: [{ $eq: ['$fromSavingsAccountId', account._id] }, '$amount', 0] } } } },
      ]),
      Income.aggregate([{ $match: { userId, savingsAccountId: account._id, date: { $gte: window.start, $lte: window.through } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { userId, savingsAccountId: account._id, paymentMethod: 'savings', date: { $gte: window.start, $lte: window.through } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Transfer.aggregate([
        { $match: { userId, date: { $gte: window.start, $lte: window.through }, $or: [{ fromSavingsAccountId: account._id }, { toSavingsAccountId: account._id }] } },
        { $group: { _id: null, incoming: { $sum: { $cond: [{ $eq: ['$toSavingsAccountId', account._id] }, '$amount', 0] } }, outgoing: { $sum: { $cond: [{ $eq: ['$fromSavingsAccountId', account._id] }, '$amount', 0] } } } },
      ]),
    ]);
    const movement = sum(incomes) - sum(expenses) + (transfers[0]?.incoming || 0) - (transfers[0]?.outgoing || 0);
    const recentMovement = sum(periodIncome) - sum(periodExpense) + (periodTransfers[0]?.incoming || 0) - (periodTransfers[0]?.outgoing || 0);
    return { key: `savings:${account._id}`, type: account.accountType || 'savings', name: account.name, owner: account.memberId?.name, color: account.color, balance: (account.openingBalance || 0) + movement, recentMovement, updatedAt: account.balanceUpdatedAt || account.updatedAt };
  }));

  const cardAccounts = await Promise.all(cards.map(async (card) => {
    const [purchases, payments, periodPurchases, periodPayments] = await Promise.all([
      Expense.aggregate([{ $match: { userId, creditCardId: card._id, paymentMethod: 'credit_card', date: { $lte: window.through } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Transfer.aggregate([{ $match: { userId, toCreditCardId: card._id, toAccountType: 'credit_card', date: { $lte: window.through } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([
        ...netExpenseStages({ userId, creditCardId: card._id, paymentMethod: 'credit_card', date: { $gte: window.start, $lte: window.through } }),
        { $group: { _id: null, total: { $sum: '$netAmount' } } },
      ]),
      Transfer.aggregate([{ $match: { userId, toCreditCardId: card._id, toAccountType: 'credit_card', date: { $gte: window.start, $lte: window.through } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    const outstanding = sum(purchases) - sum(payments);
    return { key: `credit_card:${card._id}`, type: 'credit_card', name: card.name, owner: card.memberId?.name, color: card.color, balance: outstanding, recentMovement: sum(periodPurchases) - sum(periodPayments), periodSpend: sum(periodPurchases), updatedAt: card.updatedAt };
  }));

  const all = [...currentAccounts, ...savingsAccounts, ...cardAccounts];
  return {
    combinedCash: currentAccounts.reduce((total, account) => total + account.balance, 0),
    savingsInvestments: savingsAccounts.reduce((total, account) => total + account.balance, 0),
    cardOutstanding: cardAccounts.reduce((total, account) => total + account.balance, 0),
    accounts: all,
  };
}

async function recentActivity(userId, memberId) {
  const match = scoped(userId, memberId);
  const [expenses, incomes, transfers, recoveries] = await Promise.all([
    Expense.find(match).populate('memberId', 'name').populate('categoryId', 'name color').populate('creditCardId', 'name').populate('savingsAccountId', 'name').sort({ date: -1, createdAt: -1 }).limit(5),
    Income.find(match).populate('memberId', 'name').populate('savingsAccountId', 'name').sort({ date: -1, createdAt: -1 }).limit(5),
    Transfer.find({ userId }).sort({ date: -1, createdAt: -1 }).limit(5),
    ExpenseRecovery.find({ userId }).populate({ path: 'expenseId', populate: [{ path: 'memberId', select: 'name' }, { path: 'categoryId', select: 'name color' }] }).sort({ date: -1, createdAt: -1 }).limit(5),
  ]);
  const records = [
    ...expenses.map((item) => ({ id: id(item), type: 'expense', title: item.description || item.categoryId?.name || 'Expense', subtitle: item.categoryId?.name || 'Expense', account: item.creditCardId?.name || item.savingsAccountId?.name || `${item.memberId?.name || ''} Current`, member: item.memberId?.name || '', date: item.date, amount: -item.amount, color: item.categoryId?.color, editable: true, recurring: Boolean(item.subscriptionId) })),
    ...incomes.map((item) => ({ id: id(item), type: 'income', title: item.source, subtitle: item.description || 'Income', account: item.savingsAccountId?.name || `${item.memberId?.name || ''} Current`, member: item.memberId?.name || '', date: item.date, amount: item.amount, editable: true })),
    ...transfers.map((item) => ({ id: id(item), type: 'transfer', title: item.description || 'Transfer', subtitle: 'Account transfer', account: 'Between accounts', member: '', date: item.date, amount: 0, transferAmount: item.amount, editable: true })),
    ...recoveries.filter((item) => !memberId || id(item.expenseId?.memberId) === memberId).map((item) => ({ id: id(item), type: 'recovery', title: item.notes || 'Expense recovery', subtitle: item.expenseId?.categoryId?.name || 'Recovery', account: item.source.replaceAll('_', ' '), member: item.expenseId?.memberId?.name || '', date: item.date, amount: item.amount, editable: false })),
  ];
  return records.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
}

async function attentionFeed(userId, memberId, window, summary, accounts) {
  const [cards, budgets, subscriptions, goals] = await Promise.all([
    CreditCard.find({ userId, isActive: true, ...(memberId ? { memberId } : {}) }),
    CreditCardBudget.find({ userId, month: window.month, year: window.year }),
    Subscription.find({ userId, isActive: true, ...(memberId ? { memberId } : {}) }),
    CategoryGoal.find({ userId }),
  ]);
  const items = [];
  const today = new Date();
  const spendByCategory = new Map(summary.categories.map((category) => [id(category.categoryId), category]));
  const budgetMap = new Map(budgets.map((budget) => [id(budget.creditCardId), budget.budgetAmount || 0]));

  cards.forEach((card) => {
    const dueDay = card.paymentDueDay || 5;
    const dueDate = new Date(window.year, window.month - 1 + (today.getDate() > dueDay ? 1 : 0), dueDay);
    const days = Math.ceil((dueDate - today) / 86400000);
    const account = accounts.accounts.find((item) => item.key === `credit_card:${card._id}`);
    if (window.isCurrent && account?.balance > 0 && days >= 0 && days <= 7) items.push({ id: `card-due:${card._id}:${dueDate.toISOString().slice(0, 10)}`, type: 'card_due', severity: days <= 2 ? 'urgent' : 'warning', title: `${card.name} payment due ${days === 0 ? 'today' : `in ${days} days`}`, message: `Outstanding ${account.balance.toFixed(2)}`, action: 'record', target: account.key });
    const budget = budgetMap.get(id(card));
    const spent = account?.periodSpend || 0;
    if (budget && spent / budget >= .8) items.push({ id: `card-budget:${card._id}:${window.year}-${window.month}`, type: 'card_budget', severity: spent >= budget ? 'urgent' : 'warning', title: `${card.name} budget ${spent >= budget ? 'exceeded' : 'near limit'}`, message: `${Math.round((spent / budget) * 100)}% used`, action: 'review', target: account?.key });
  });

  for (const subscription of subscriptions) {
    const existing = await Expense.exists({ userId, subscriptionId: subscription._id, month: window.month, year: window.year });
    if (!existing && subscription.dayOfMonth <= window.elapsedDays) items.push({ id: `recurring:${subscription._id}:${window.year}-${window.month}`, type: 'recurring', severity: subscription.dayOfMonth < window.elapsedDays ? 'urgent' : 'warning', title: `${subscription.name} is not recorded`, message: `Due day ${subscription.dayOfMonth} · ${subscription.amount.toFixed(2)}`, action: 'record', target: id(subscription) });
  }

  goals.forEach((goal) => {
    const category = spendByCategory.get(id(goal.categoryId));
    if (!category || !goal.goal) return;
    const percentage = Math.round((category.total / goal.goal) * 100);
    if (percentage >= 80) items.push({ id: `goal:${goal.categoryId}:${window.year}-${window.month}`, type: 'category_goal', severity: percentage >= 100 ? 'urgent' : 'warning', title: `${category.name} goal ${percentage >= 100 ? 'crossed' : 'at risk'}`, message: `${percentage}% of ${goal.goal.toFixed(2)} used`, action: 'review', target: id(goal.categoryId) });
  });

  const stale = accounts.accounts.filter((account) => Date.now() - new Date(account.updatedAt).getTime() > 1000 * 60 * 60 * 24 * 90);
  if (stale.length) items.push({ id: 'stale-accounts', type: 'stale_account', severity: 'info', title: `${stale.length} account${stale.length > 1 ? 's' : ''} may need review`, message: 'Account details have not been updated recently.', action: 'review', target: stale[0].key });

  const unusualThreshold = Math.max(summary.netExpense * .25, 1000);
  const unusual = await Expense.findOne(scoped(userId, memberId, { date: { $gte: window.start, $lte: window.through }, amount: { $gte: unusualThreshold } })).sort({ amount: -1 });
  if (unusual) items.push({ id: `unusual:${unusual._id}`, type: 'unusual', severity: 'info', title: 'Large expense worth reviewing', message: `${unusual.amount.toFixed(2)} is high for this month.`, action: 'review', target: id(unusual) });
  const duplicates = await Expense.aggregate([
    { $match: scoped(userId, memberId, { date: { $gte: window.start, $lte: window.through } }) },
    { $group: { _id: { amount: '$amount', description: { $toLower: { $ifNull: ['$description', ''] } }, day: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 1 },
  ]);
  if (duplicates[0]) items.push({ id: `duplicate:${duplicates[0]._id.day}:${duplicates[0]._id.amount}`, type: 'duplicate', severity: 'warning', title: 'Possible duplicate expenses', message: `${duplicates[0].count} matching records on ${duplicates[0]._id.day}.`, action: 'review', target: id(duplicates[0].ids[0]) });
  return items.slice(0, 8);
}

router.get('/', async (req, res) => {
  try {
    const window = monthWindow(req.query.month, req.query.year);
    const memberId = mongoose.Types.ObjectId.isValid(req.query.memberId)
      ? new mongoose.Types.ObjectId(req.query.memberId)
      : null;
    const [summary, accounts, activity, goals] = await Promise.all([
      monthlySummary(req.user._id, memberId, window),
      accountSnapshot(req.user._id, memberId, window),
      recentActivity(req.user._id, memberId),
      CategoryGoal.find({ userId: req.user._id }),
    ]);
    const goalMap = new Map(goals.map((goal) => [id(goal.categoryId), goal.goal]));
    const categories = summary.categories.slice(0, 3).map((category) => ({
      ...category,
      goal: goalMap.get(id(category.categoryId)) || null,
      goalPercent: goalMap.get(id(category.categoryId)) ? Math.round((category.total / goalMap.get(id(category.categoryId))) * 100) : null,
    }));
    const recurringCommitments = await Subscription.aggregate([
      { $match: scoped(req.user._id, memberId, { isActive: true }) },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalGoals = goals.reduce((total, goal) => total + goal.goal, 0);
    const expectedPace = window.daysInMonth ? summary.netExpense * (window.daysInMonth / Math.max(window.elapsedDays, 1)) : summary.netExpense;
    const safeToSpend = Math.max(summary.totalIncome - sum(recurringCommitments) - totalGoals - summary.netExpense, 0);
    const attention = await attentionFeed(req.user._id, memberId, window, summary, accounts);
    res.json({
      month: window.month, year: window.year, isCurrentMonth: window.isCurrent,
      generatedAt: new Date(),
      summary: { ...summary, categories: undefined },
      spendPulse: { actual: summary.netExpense, expectedPace, safeToSpend, recurringCommitments: sum(recurringCommitments), goalCommitments: totalGoals, categories },
      accounts,
      attention,
      recentActivity: activity,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
