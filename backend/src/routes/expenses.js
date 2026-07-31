const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const ExpenseRecovery = require('../models/ExpenseRecovery');

function shouldAffectCurrentBalance(paymentMethod, requested) {
  return paymentMethod === 'current_account' && requested !== false;
}

function aggregateFilterFrom(filter) {
  const aggregateFilter = { ...filter };
  ['memberId', 'categoryId', 'subCategoryId', 'creditCardId', 'savingsAccountId'].forEach((field) => {
    if (aggregateFilter[field]) {
      aggregateFilter[field] = new mongoose.Types.ObjectId(aggregateFilter[field]);
    }
  });
  return aggregateFilter;
}

function sanitizeRecovery(body) {
  const amount = parseFloat(body.amount);
  return {
    amount,
    date: body.date ? new Date(body.date) : new Date(),
    source: body.source || 'other',
    budgetTreatment: body.budgetTreatment || 'reduce_expense',
    notes: body.notes || '',
  };
}

function netExpenseStages(filter) {
  return [
    { $match: aggregateFilterFrom(filter) },
    {
      $lookup: {
        from: 'expenserecoveries',
        let: { expenseId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$expenseId', '$$expenseId'] },
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

async function attachRecoveries(records) {
  const plainRecords = records.map((record) => record.toObject());
  const expenseIds = plainRecords.map((record) => record._id);
  const recoveries = await ExpenseRecovery.find({ expenseId: { $in: expenseIds } }).sort({ date: -1, createdAt: -1 });
  const grouped = recoveries.reduce((acc, recovery) => {
    const key = String(recovery.expenseId);
    if (!acc[key]) acc[key] = [];
    acc[key].push(recovery);
    return acc;
  }, {});

  return plainRecords.map((record) => {
    const recordRecoveries = grouped[String(record._id)] || [];
    const recoveredAmount = recordRecoveries
      .filter((recovery) => recovery.budgetTreatment === 'reduce_expense')
      .reduce((sum, recovery) => sum + recovery.amount, 0);
    const cappedRecoveredAmount = Math.min(recoveredAmount, record.amount || 0);
    return {
      ...record,
      recoveries: recordRecoveries,
      recoverySummary: {
        recoveredAmount: cappedRecoveredAmount,
        netAmount: Math.max((record.amount || 0) - cappedRecoveredAmount, 0),
      },
    };
  });
}

router.get('/', async (req, res) => {
  try {
    const { month, year, memberId, categoryId, subCategoryId, paymentMethod, page = 1, limit = 50, startDate, endDate } = req.query;
    const filter = { userId: req.user._id };
    if (!startDate && !endDate && month) filter.month = parseInt(month);
    if (!startDate && !endDate && year) filter.year = parseInt(year);
    if (memberId) filter.memberId = memberId;
    if (categoryId) filter.categoryId = categoryId;
    if (subCategoryId) filter.subCategoryId = subCategoryId;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (req.query.creditCardId) filter.creditCardId = req.query.creditCardId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const inclusiveEnd = new Date(endDate);
        inclusiveEnd.setHours(23, 59, 59, 999);
        filter.date.$lte = inclusiveEnd;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total, totals, paymentSummary] = await Promise.all([
      Expense.find(filter)
        .populate('memberId', 'name color role')
        .populate('categoryId', 'name color icon')
        .populate('subCategoryId', 'name')
        .populate('creditCardId', 'name bankName color')
        .populate('savingsAccountId', 'name bankName')
        .sort({ date: -1, _id: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Expense.countDocuments(filter),
      Expense.aggregate([
        ...netExpenseStages(filter),
        {
          $group: {
            _id: null,
            amount: { $sum: '$amount' },
            recoveredAmount: { $sum: '$recoveredForBudget' },
            netAmount: { $sum: '$netAmount' },
          },
        },
      ]),
      Expense.aggregate([
        { $match: aggregateFilterFrom(filter) },
        {
          $group: {
            _id: {
              paymentMethod: '$paymentMethod',
              creditCardId: '$creditCardId',
              savingsAccountId: '$savingsAccountId',
            },
            amount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
      ]),
    ]);
    const recordsWithRecoveries = await attachRecoveries(records);

    res.json({
      records: recordsWithRecoveries,
      total,
      totalAmount: totals[0]?.amount || 0,
      recoveredAmount: totals[0]?.recoveredAmount || 0,
      netTotalAmount: totals[0]?.netAmount || 0,
      paymentSummary: paymentSummary.map((item) => ({
        paymentMethod: item._id.paymentMethod,
        creditCardId: item._id.creditCardId,
        savingsAccountId: item._id.savingsAccountId,
        amount: item.amount,
        count: item.count,
      })),
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const record = await Expense.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('memberId', 'name color role').populate('categoryId', 'name color icon')
      .populate('subCategoryId', 'name').populate('creditCardId', 'name bankName color')
      .populate('savingsAccountId', 'name bankName');
    if (!record) return res.status(404).json({ error: 'Expense not found' });
    res.json((await attachRecoveries([record]))[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/recoveries', async (req, res) => {
  try {
    if (req.body.clientMutationId) {
      const existingRecovery = await ExpenseRecovery.findOne({ userId: req.user._id, clientMutationId: req.body.clientMutationId });
      if (existingRecovery) return res.json(existingRecovery);
    }
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    const payload = sanitizeRecovery(req.body);
    if (!Number.isFinite(payload.amount) || payload.amount <= 0) return res.status(400).json({ error: 'Recovery amount must be greater than zero' });
    const recovered = await ExpenseRecovery.aggregate([
      { $match: { userId: req.user._id, expenseId: expense._id, budgetTreatment: 'reduce_expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    if (payload.budgetTreatment === 'reduce_expense' && payload.amount > expense.amount - (recovered[0]?.total || 0)) {
      return res.status(400).json({ error: 'Recovery cannot exceed the remaining expense amount' });
    }

    const recovery = await ExpenseRecovery.create({
      ...payload,
      userId: req.user._id,
      createdByUserId: req.actorUser?._id || req.user._id,
      expenseId: expense._id,
    });
    res.status(201).json(recovery);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id/recoveries/:recoveryId', async (req, res) => {
  try {
    const recovery = await ExpenseRecovery.findOneAndDelete({
      _id: req.params.recoveryId,
      expenseId: req.params.id,
      userId: req.user._id,
      createdByUserId: req.actorUser?._id || req.user._id,
      updatedByUserId: req.actorUser?._id || req.user._id,
    });
    if (!recovery) return res.status(404).json({ error: 'Recovery not found' });
    res.json({ message: 'Recovery deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    if (req.body.clientMutationId) {
      const existing = await Expense.findOne({ userId: req.user._id, clientMutationId: req.body.clientMutationId })
        .populate('memberId', 'name color role').populate('categoryId', 'name color icon')
        .populate('subCategoryId', 'name').populate('savingsAccountId', 'name bankName');
      if (existing) return res.json(existing);
    }
    const date = new Date(req.body.date);
    const expense = new Expense({
      ...req.body,
      userId: req.user._id,
      savingsAccountId: req.body.savingsAccountId || null,
      affectsCurrentBalance: shouldAffectCurrentBalance(req.body.paymentMethod, req.body.affectsCurrentBalance),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    });
    await expense.save();

    const populated = await Expense.findById(expense._id)
      .populate('memberId', 'name color role')
      .populate('categoryId', 'name color icon')
      .populate('subCategoryId', 'name')
      .populate('savingsAccountId', 'name bankName');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const old = await Expense.findOne({ _id: req.params.id, userId: req.user._id });
    if (!old) return res.status(404).json({ error: 'Expense not found' });

    if (req.body.expectedUpdatedAt && old.updatedAt.toISOString() !== new Date(req.body.expectedUpdatedAt).toISOString()) return res.status(409).json({ error: 'This expense changed on another device', conflict: old });
    const updates = { ...req.body, savingsAccountId: req.body.savingsAccountId || null };
    delete updates.expectedUpdatedAt;
    delete updates.userId;
    updates.updatedByUserId = req.actorUser?._id || req.user._id;
    if (req.body.paymentMethod) {
      updates.affectsCurrentBalance = shouldAffectCurrentBalance(req.body.paymentMethod, req.body.affectsCurrentBalance);
    }
    if (req.body.date) {
      const date = new Date(req.body.date);
      updates.month = date.getMonth() + 1;
      updates.year = date.getFullYear();
    }

    const expense = await Expense.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, updates, { new: true, runValidators: true })
      .populate('memberId', 'name color role')
      .populate('categoryId', 'name color icon')
      .populate('subCategoryId', 'name')
      .populate('savingsAccountId', 'name bankName');
    res.json(expense);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, userId: req.user._id });
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    await ExpenseRecovery.deleteMany({ expenseId: expense._id, userId: req.user._id });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
