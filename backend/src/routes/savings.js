const express = require('express');
const router = express.Router();
const SavingsAccount = require('../models/SavingsAccount');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Transfer = require('../models/Transfer');

async function savingsLedgerEffect(userId, accountId, dateLte = new Date()) {
  const [income, expenses, transfers] = await Promise.all([
    Income.aggregate([
      { $match: { userId, savingsAccountId: accountId, date: { $lte: dateLte } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { userId, savingsAccountId: accountId, paymentMethod: 'savings', date: { $lte: dateLte } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transfer.aggregate([
      {
        $match: {
          userId,
          date: { $lte: dateLte },
          $or: [
            { fromAccountType: 'savings', fromSavingsAccountId: accountId },
            { toAccountType: 'savings', toSavingsAccountId: accountId },
          ],
        },
      },
      {
        $group: {
          _id: null,
          outgoing: { $sum: { $cond: [{ $eq: ['$fromSavingsAccountId', accountId] }, '$amount', 0] } },
          incoming: { $sum: { $cond: [{ $eq: ['$toSavingsAccountId', accountId] }, '$amount', 0] } },
        },
      },
    ]),
  ]);

  return (income[0]?.total || 0)
    - (expenses[0]?.total || 0)
    + (transfers[0]?.incoming || 0)
    - (transfers[0]?.outgoing || 0);
}

async function withCalculatedBalances(userId, accounts) {
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  return Promise.all(accounts.map(async (account) => {
    const effect = await savingsLedgerEffect(userId, account._id, todayEnd);
    const obj = account.toObject();
    obj.openingBalance = obj.openingBalance ?? 0;
    obj.balance = obj.openingBalance + effect;
    obj.calculatedBalance = obj.balance;
    return obj;
  }));
}

router.get('/', async (req, res) => {
  try {
    const accounts = await SavingsAccount.find({ userId: req.user._id })
      .populate('memberId', 'name color role')
      .sort({ memberId: 1, createdAt: 1 });
    res.json(await withCalculatedBalances(req.user._id, accounts));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const openingBalance = req.body.openingBalance ?? req.body.balance ?? 0;
    const account = new SavingsAccount({ ...req.body, openingBalance, balance: openingBalance, userId: req.user._id, balanceUpdatedAt: new Date() });
    await account.save();
    const populated = await account.populate('memberId', 'name color role');
    const [calculated] = await withCalculatedBalances(req.user._id, [populated]);
    res.status(201).json(calculated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.userId;
    if (req.body.balance !== undefined && req.body.openingBalance === undefined) updates.openingBalance = req.body.balance;
    if (updates.openingBalance !== undefined) {
      updates.balance = updates.openingBalance;
      updates.balanceUpdatedAt = new Date();
    }
    const account = await SavingsAccount.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, updates, {
      new: true,
      runValidators: true,
    }).populate('memberId', 'name color role');
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const [calculated] = await withCalculatedBalances(req.user._id, [account]);
    res.json(calculated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const account = await SavingsAccount.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
