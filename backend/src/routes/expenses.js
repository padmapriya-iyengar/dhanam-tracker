const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Expense = require('../models/Expense');

function shouldAffectCurrentBalance(paymentMethod) {
  return paymentMethod === 'current_account';
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
    const [records, total, totals] = await Promise.all([
      Expense.find(filter)
        .populate('memberId', 'name color role')
        .populate('categoryId', 'name color icon')
        .populate('subCategoryId', 'name')
        .populate('creditCardId', 'name bankName color')
        .populate('savingsAccountId', 'name bankName')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Expense.countDocuments(filter),
      Expense.aggregate([
        { $match: aggregateFilterFrom(filter) },
        { $group: { _id: null, amount: { $sum: '$amount' } } },
      ]),
    ]);

    res.json({
      records,
      total,
      totalAmount: totals[0]?.amount || 0,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const date = new Date(req.body.date);
    const expense = new Expense({
      ...req.body,
      userId: req.user._id,
      savingsAccountId: req.body.savingsAccountId || null,
      affectsCurrentBalance: shouldAffectCurrentBalance(req.body.paymentMethod),
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

    const updates = { ...req.body, savingsAccountId: req.body.savingsAccountId || null };
    delete updates.userId;
    if (req.body.paymentMethod) {
      updates.affectsCurrentBalance = shouldAffectCurrentBalance(req.body.paymentMethod);
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
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
