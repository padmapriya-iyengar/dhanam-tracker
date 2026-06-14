const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Income = require('../models/Income');

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

async function getAggregate(model, dateRange) {
  const { start, end } = dateRange;
  const total = await model.aggregate([
    { $match: { date: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return total[0]?.total || 0;
}

router.get('/', async (req, res) => {
  try {
    const dateRange = getDateRange(req.query);
    const { start, end, prevStart, prevEnd } = dateRange;

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
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: '$categoryId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        { $project: { _id: 0, categoryId: '$_id', name: '$category.name', color: '$category.color', icon: '$category.icon', total: 1, count: 1 } },
        { $sort: { total: -1 } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: '$memberId', total: { $sum: '$amount' } } },
        { $lookup: { from: 'members', localField: '_id', foreignField: '_id', as: 'member' } },
        { $unwind: '$member' },
        { $project: { _id: 0, memberId: '$_id', name: '$member.name', color: '$member.color', total: 1 } },
      ]),
      Income.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: '$memberId', total: { $sum: '$amount' } } },
        { $lookup: { from: 'members', localField: '_id', foreignField: '_id', as: 'member' } },
        { $unwind: '$member' },
        { $project: { _id: 0, memberId: '$_id', name: '$member.name', color: '$member.color', total: 1 } },
      ]),
      getAggregate(Expense, { start, end }),
      getAggregate(Income, { start, end }),
      getAggregate(Expense, { start: prevStart, end: prevEnd }),
      getAggregate(Income, { start: prevStart, end: prevEnd }),
      Expense.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
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

    const [expenseTrend, incomeTrend] = await Promise.all([
      Expense.aggregate([
        { $match: { date: { $gte: start } } },
        { $group: { _id: { month: '$month', year: '$year' }, total: { $sum: '$amount' } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Income.aggregate([
        { $match: { date: { $gte: start } } },
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
