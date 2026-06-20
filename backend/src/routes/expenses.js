const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const SavingsAccount = require('../models/SavingsAccount');

async function adjustAccount(userId, accountId, delta) {
  if (!accountId) return;
  await SavingsAccount.findOneAndUpdate({ _id: accountId, userId }, {
    $inc: { balance: delta },
    balanceUpdatedAt: new Date(),
  });
}

router.get('/', async (req, res) => {
  try {
    const { month, year, memberId, categoryId, paymentMethod, page = 1, limit = 50, startDate, endDate } = req.query;
    const filter = { userId: req.user._id };
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (memberId) filter.memberId = memberId;
    if (categoryId) filter.categoryId = categoryId;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (req.query.creditCardId) filter.creditCardId = req.query.creditCardId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
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
    ]);

    res.json({ records, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
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
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    });
    await expense.save();

    // Deduct from savings account (expenses reduce balance)
    await adjustAccount(req.user._id, expense.savingsAccountId, -expense.amount);

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
    if (req.body.date) {
      const date = new Date(req.body.date);
      updates.month = date.getMonth() + 1;
      updates.year = date.getFullYear();
    }

    const oldAccountId = old.savingsAccountId?.toString() || null;
    const newAccountId = updates.savingsAccountId?.toString() || null;
    const newAmount = parseFloat(req.body.amount) || old.amount;

    // Reverse old account deduction, apply new account deduction
    await adjustAccount(req.user._id, oldAccountId, old.amount);
    await adjustAccount(req.user._id, newAccountId, -newAmount);

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

    // Restore the deducted amount on delete
    await adjustAccount(req.user._id, expense.savingsAccountId, expense.amount);
    await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
