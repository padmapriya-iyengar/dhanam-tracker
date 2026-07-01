const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Subscription = require('../models/Subscription');
const SubCategory = require('../models/SubCategory');

const ALWAYS_EXCLUDED_RECURRING_SUB_CATEGORIES = [
  'Foreign Transfer',
  'Local Transfer',
  'Home Improvement',
];

function getDateRange(query) {
  const { period, date, month, year, week, quarter, half } = query;
  const y = parseInt(year) || new Date().getFullYear();
  let start, end, prevStart, prevEnd;

  switch (period) {
    case 'daily': {
      const d = date ? new Date(date) : new Date();
      start = new Date(d); start.setHours(0, 0, 0, 0);
      end = new Date(d); end.setHours(23, 59, 59, 999);
      prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 1);
      prevEnd = new Date(end); prevEnd.setDate(prevEnd.getDate() - 1);
      break;
    }
    case 'weekly': {
      const wk = parseInt(week) || getWeekNumber(new Date());
      const jan1 = new Date(y, 0, 1);
      const days = (wk - 1) * 7;
      start = new Date(jan1); start.setDate(jan1.getDate() + days);
      start.setHours(0, 0, 0, 0);
      end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
      prevStart = new Date(start); prevStart.setDate(start.getDate() - 7);
      prevEnd = new Date(end); prevEnd.setDate(end.getDate() - 7);
      break;
    }
    case 'monthly': {
      const m = parseInt(month) || new Date().getMonth() + 1;
      start = new Date(y, m - 1, 1);
      end = new Date(y, m, 0, 23, 59, 59, 999);
      prevStart = new Date(y, m - 2, 1);
      prevEnd = new Date(y, m - 1, 0, 23, 59, 59, 999);
      break;
    }
    case 'quarterly': {
      const q = parseInt(quarter) || Math.ceil((new Date().getMonth() + 1) / 3);
      const startMonth = (q - 1) * 3;
      start = new Date(y, startMonth, 1);
      end = new Date(y, startMonth + 3, 0, 23, 59, 59, 999);
      prevStart = new Date(y, startMonth - 3, 1);
      prevEnd = new Date(y, startMonth, 0, 23, 59, 59, 999);
      break;
    }
    case 'halfyearly': {
      const h = parseInt(half) || (new Date().getMonth() < 6 ? 1 : 2);
      start = h === 1 ? new Date(y, 0, 1) : new Date(y, 6, 1);
      end = h === 1 ? new Date(y, 6, 0, 23, 59, 59, 999) : new Date(y, 12, 0, 23, 59, 59, 999);
      prevStart = h === 1 ? new Date(y - 1, 6, 1) : new Date(y, 0, 1);
      prevEnd = h === 1 ? new Date(y - 1, 12, 0, 23, 59, 59, 999) : new Date(y, 6, 0, 23, 59, 59, 999);
      break;
    }
    case 'yearly': {
      start = new Date(y, 0, 1);
      end = new Date(y, 11, 31, 23, 59, 59, 999);
      prevStart = new Date(y - 1, 0, 1);
      prevEnd = new Date(y - 1, 11, 31, 23, 59, 59, 999);
      break;
    }
    default: {
      start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);
      prevStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
      prevEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0, 23, 59, 59, 999);
    }
  }
  return { start, end, prevStart, prevEnd };
}

function getWeekNumber(d) {
  const oneJan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
}

async function getAggregate(model, userId, dateRange) {
  const { start, end } = dateRange;
  const total = await model.aggregate([
    { $match: { userId, date: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return total[0]?.total || 0;
}

async function recurringExpenseFilter(userId, query) {
  if (query.excludeRecurring !== 'true') return {};

  const subscriptions = await Subscription.find({ userId, isActive: true }).select('categoryId subCategoryId');
  const excludedSubCategories = await SubCategory.find({
    name: { $in: ALWAYS_EXCLUDED_RECURRING_SUB_CATEGORIES },
    isActive: true,
  }).select('_id');

  const recurringAreas = subscriptions.map((subscription) => {
    const area = { categoryId: subscription.categoryId };
    if (subscription.subCategoryId) area.subCategoryId = subscription.subCategoryId;
    return area;
  });

  const filter = { subscriptionId: null };
  const excludedAreas = [
    ...recurringAreas,
    ...excludedSubCategories.map((subCategory) => ({ subCategoryId: subCategory._id })),
  ];
  if (excludedAreas.length > 0) filter.$nor = excludedAreas;
  return filter;
}

function expenseMatch(userId, start, end, recurringFilter = {}) {
  return { userId, date: { $gte: start, $lte: end }, ...recurringFilter };
}

async function getExpenseAggregate(userId, dateRange, recurringFilter) {
  const { start, end } = dateRange;
  const total = await Expense.aggregate([
    { $match: expenseMatch(userId, start, end, recurringFilter) },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return total[0]?.total || 0;
}

function parseObjectIds(value) {
  return String(value || '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

router.get('/custom', async (req, res) => {
  try {
    const { start, end } = getDateRange(req.query);
    const recurringFilter = await recurringExpenseFilter(req.user._id, req.query);
    const categoryIds = parseObjectIds(req.query.categoryIds);
    const subCategoryIds = parseObjectIds(req.query.subCategoryIds);

    const match = expenseMatch(req.user._id, start, end, recurringFilter);
    const selected = [];
    if (categoryIds.length > 0) selected.push({ categoryId: { $in: categoryIds } });
    if (subCategoryIds.length > 0) selected.push({ subCategoryId: { $in: subCategoryIds } });
    if (selected.length > 0) match.$or = selected;

    const [summary, bySubCategory, byCategory, byMember, dailyTrend, transactions] = await Promise.all([
      Expense.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: match },
        { $group: { _id: { categoryId: '$categoryId', subCategoryId: '$subCategoryId' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $lookup: { from: 'categories', localField: '_id.categoryId', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        { $lookup: { from: 'subcategories', localField: '_id.subCategoryId', foreignField: '_id', as: 'subCategory' } },
        { $unwind: { path: '$subCategory', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            categoryId: '$_id.categoryId',
            subCategoryId: '$_id.subCategoryId',
            categoryName: '$category.name',
            subCategoryName: { $ifNull: ['$subCategory.name', 'Uncategorized'] },
            color: '$category.color',
            total: 1,
            count: 1,
          },
        },
        { $sort: { total: -1 } },
      ]),
      Expense.aggregate([
        { $match: match },
        { $group: { _id: '$categoryId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        { $project: { _id: 0, categoryId: '$_id', name: '$category.name', color: '$category.color', total: 1, count: 1 } },
        { $sort: { total: -1 } },
      ]),
      Expense.aggregate([
        { $match: match },
        { $group: { _id: '$memberId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $lookup: { from: 'members', localField: '_id', foreignField: '_id', as: 'member' } },
        { $unwind: '$member' },
        { $project: { _id: 0, memberId: '$_id', name: '$member.name', color: '$member.color', total: 1, count: 1 } },
        { $sort: { total: -1 } },
      ]),
      Expense.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Expense.find(match)
        .populate('memberId', 'name color role')
        .populate('categoryId', 'name color icon')
        .populate('subCategoryId', 'name')
        .sort({ date: -1 })
        .limit(100),
    ]);

    res.json({
      dateRange: { start, end },
      selected: { categoryIds, subCategoryIds },
      summary: {
        totalExpense: summary[0]?.total || 0,
        count: summary[0]?.count || 0,
      },
      bySubCategory,
      byCategory,
      byMember,
      dailyTrend,
      transactions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const dateRange = getDateRange(req.query);
    const { start, end, prevStart, prevEnd } = dateRange;
    const recurringFilter = await recurringExpenseFilter(req.user._id, req.query);

    const [
      expenseByCategory,
      expenseByMember,
      incomeByMember,
      totalExpense,
      totalIncome,
      prevTotalExpense,
      prevTotalIncome,
      dailyTrend,
    ] = await Promise.all([
      Expense.aggregate([
        { $match: expenseMatch(req.user._id, start, end, recurringFilter) },
        { $group: { _id: '$categoryId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        { $project: { _id: 0, categoryId: '$_id', name: '$category.name', color: '$category.color', icon: '$category.icon', total: 1, count: 1 } },
        { $sort: { total: -1 } },
      ]),
      Expense.aggregate([
        { $match: expenseMatch(req.user._id, start, end, recurringFilter) },
        { $group: { _id: '$memberId', total: { $sum: '$amount' } } },
        { $lookup: { from: 'members', localField: '_id', foreignField: '_id', as: 'member' } },
        { $unwind: '$member' },
        { $project: { _id: 0, memberId: '$_id', name: '$member.name', color: '$member.color', total: 1 } },
      ]),
      Income.aggregate([
        { $match: { userId: req.user._id, date: { $gte: start, $lte: end } } },
        { $group: { _id: '$memberId', total: { $sum: '$amount' } } },
        { $lookup: { from: 'members', localField: '_id', foreignField: '_id', as: 'member' } },
        { $unwind: '$member' },
        { $project: { _id: 0, memberId: '$_id', name: '$member.name', color: '$member.color', total: 1 } },
      ]),
      getExpenseAggregate(req.user._id, { start, end }, recurringFilter),
      getAggregate(Income, req.user._id, { start, end }),
      getExpenseAggregate(req.user._id, { start: prevStart, end: prevEnd }, recurringFilter),
      getAggregate(Income, req.user._id, { start: prevStart, end: prevEnd }),
      Expense.aggregate([
        { $match: expenseMatch(req.user._id, start, end, recurringFilter) },
        { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        { $match: { 'category.name': { $ne: 'Finance & Loans' } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            expenses: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const savings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((savings / totalIncome) * 100).toFixed(1) : 0;
    const expenseChange = prevTotalExpense > 0 ? (((totalExpense - prevTotalExpense) / prevTotalExpense) * 100).toFixed(1) : 0;
    const incomeChange = prevTotalIncome > 0 ? (((totalIncome - prevTotalIncome) / prevTotalIncome) * 100).toFixed(1) : 0;

    res.json({
      period: req.query.period || 'monthly',
      dateRange: { start, end },
      summary: {
        totalIncome,
        totalExpense,
        savings,
        savingsRate: parseFloat(savingsRate),
        expenseChange: parseFloat(expenseChange),
        incomeChange: parseFloat(incomeChange),
        prevTotalExpense,
        prevTotalIncome,
      },
      expenseByCategory,
      expenseByMember,
      incomeByMember,
      dailyTrend,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Monthly trend for last N months
router.get('/trend', async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
    const recurringFilter = await recurringExpenseFilter(req.user._id, req.query);

    const [expenseTrend, incomeTrend] = await Promise.all([
      Expense.aggregate([
        { $match: { userId: req.user._id, date: { $gte: start }, ...recurringFilter } },
        { $group: { _id: { month: '$month', year: '$year' }, total: { $sum: '$amount' } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Income.aggregate([
        { $match: { userId: req.user._id, date: { $gte: start } } },
        { $group: { _id: { month: '$month', year: '$year' }, total: { $sum: '$amount' } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendMap = {};

    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      trendMap[key] = { label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`, income: 0, expenses: 0, savings: 0 };
    }

    expenseTrend.forEach(({ _id, total }) => {
      const key = `${_id.year}-${_id.month}`;
      if (trendMap[key]) trendMap[key].expenses = total;
    });
    incomeTrend.forEach(({ _id, total }) => {
      const key = `${_id.year}-${_id.month}`;
      if (trendMap[key]) trendMap[key].income = total;
    });

    const trend = Object.values(trendMap).map((t) => ({ ...t, savings: t.income - t.expenses }));
    res.json(trend);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
