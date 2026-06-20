const express = require('express');
const router = express.Router();
const Income = require('../models/Income');
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
    const { month, year, memberId, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user._id };
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (memberId) filter.memberId = memberId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      Income.find(filter)
        .populate('memberId', 'name color role')
        .populate('savingsAccountId', 'name bankName')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Income.countDocuments(filter),
    ]);

    res.json({ records, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const date = new Date(req.body.date);
    const income = new Income({
      ...req.body,
      userId: req.user._id,
      savingsAccountId: req.body.savingsAccountId || null,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    });
    await income.save();

    await adjustAccount(req.user._id, income.savingsAccountId, income.amount);

    const populated = await Income.findById(income._id)
      .populate('memberId', 'name color role')
      .populate('savingsAccountId', 'name bankName');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const old = await Income.findOne({ _id: req.params.id, userId: req.user._id });
    if (!old) return res.status(404).json({ error: 'Income record not found' });

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

    // Reverse old account effect
    await adjustAccount(req.user._id, oldAccountId, -old.amount);
    // Apply new account effect
    await adjustAccount(req.user._id, newAccountId, newAmount);

    const income = await Income.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, updates, { new: true, runValidators: true })
      .populate('memberId', 'name color role')
      .populate('savingsAccountId', 'name bankName');
    res.json(income);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const income = await Income.findOne({ _id: req.params.id, userId: req.user._id });
    if (!income) return res.status(404).json({ error: 'Income record not found' });

    await adjustAccount(req.user._id, income.savingsAccountId, -income.amount);
    await Income.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Income record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
