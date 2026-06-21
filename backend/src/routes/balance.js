const express = require('express');
const router = express.Router();
const Balance = require('../models/Balance');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Member = require('../models/Member');
const Transfer = require('../models/Transfer');

// Credit card expenses are excluded from balance deductions — they're a separate liability
const CURRENT_BALANCE_EXPENSE_METHODS = ['cash', 'card', 'current_account', 'debit_card', 'netbanking', 'upi', 'other'];

async function sumForMember(Model, userId, memberId, dateLte, options = {}) {
  const match = { userId, memberId: memberId, date: { $lte: dateLte } };
  if (options.onlyDebit) {
    match.paymentMethod = { $in: CURRENT_BALANCE_EXPENSE_METHODS };
  }
  if (options.currentAccountIncomeOnly) {
    match.$or = [{ savingsAccountId: null }, { savingsAccountId: { $exists: false } }];
  }
  const result = await Model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
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
        outgoing: {
          $sum: {
            $cond: [{ $eq: ['$fromMemberId', memberId] }, '$amount', 0],
          },
        },
        incoming: {
          $sum: {
            $cond: [{ $eq: ['$toMemberId', memberId] }, '$amount', 0],
          },
        },
      },
    },
  ]);

  const totals = result[0];
  return (totals?.incoming || 0) - (totals?.outgoing || 0);
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

        const [incomeLastMonth, expenseLastMonth, transferLastMonth, incomeToday, expenseToday, transferToday] = await Promise.all([
          sumForMember(Income, req.user._id, member._id, lastMonthEnd, { currentAccountIncomeOnly: true }),
          sumForMember(Expense, req.user._id, member._id, lastMonthEnd, { onlyDebit: true }),
          currentTransferEffect(req.user._id, member._id, lastMonthEnd),
          sumForMember(Income, req.user._id, member._id, todayEnd, { currentAccountIncomeOnly: true }),
          sumForMember(Expense, req.user._id, member._id, todayEnd, { onlyDebit: true }),
          currentTransferEffect(req.user._id, member._id, todayEnd),
        ]);

        return {
          memberId: member._id,
          memberName: member.name,
          memberColor: member.color,
          openingBalance,
          notes: doc?.notes ?? '',
          balanceLastMonth: openingBalance + incomeLastMonth - expenseLastMonth + transferLastMonth,
          currentBalance: openingBalance + incomeToday - expenseToday + transferToday,
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
