const express = require('express');
const router = express.Router();
const Balance = require('../models/Balance');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Member = require('../models/Member');

// Credit card expenses are excluded from balance deductions — they're a separate liability
const DEBIT_METHODS = ['cash', 'card', 'debit_card', 'upi', 'netbanking', 'other'];

async function sumForMember(Model, userId, memberId, dateLte, onlyDebit = false) {
  const match = { userId, memberId: memberId, date: { $lte: dateLte } };
  if (onlyDebit) match.paymentMethod = { $in: DEBIT_METHODS };
  const result = await Model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total || 0;
}

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const members = await Member.find({ userId: req.user._id, isActive: true });

    const results = await Promise.all(
      members.map(async (member) => {
        const doc = await Balance.findOne({ userId: req.user._id, memberId: member._id });
        const openingBalance = doc?.openingBalance ?? 0;

        const [incomeLastMonth, expenseLastMonth, incomeToday, expenseToday] = await Promise.all([
          sumForMember(Income, req.user._id, member._id, lastMonthEnd),
          sumForMember(Expense, req.user._id, member._id, lastMonthEnd, true),
          sumForMember(Income, req.user._id, member._id, todayEnd),
          sumForMember(Expense, req.user._id, member._id, todayEnd, true),
        ]);

        return {
          memberId: member._id,
          memberName: member.name,
          memberColor: member.color,
          openingBalance,
          notes: doc?.notes ?? '',
          balanceLastMonth: openingBalance + incomeLastMonth - expenseLastMonth,
          currentBalance: openingBalance + incomeToday - expenseToday,
          asOf: lastMonthEnd,
        };
      })
    );

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:memberId', async (req, res) => {
  try {
    const { openingBalance, notes } = req.body;
    const doc = await Balance.findOneAndUpdate(
      { userId: req.user._id, memberId: req.params.memberId },
      { userId: req.user._id, memberId: req.params.memberId, openingBalance, notes },
      { upsert: true, new: true, runValidators: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
