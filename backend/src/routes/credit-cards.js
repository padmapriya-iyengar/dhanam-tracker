const express = require('express');
const router = express.Router();
const CreditCard = require('../models/CreditCard');
const CreditCardStatement = require('../models/CreditCardStatement');
const Expense = require('../models/Expense');
const Transfer = require('../models/Transfer');

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function dateAtDay(year, monthIndex, day, endOfDay = false) {
  const safeDay = Math.min(day, daysInMonth(year, monthIndex));
  const date = new Date(year, monthIndex, safeDay);
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date;
}

function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function cycleDays(card) {
  const endDay = card.cycleEndDay || card.statementDay || 14;
  const startDay = card.cycleStartDay || (endDay === 31 ? 1 : endDay + 1);
  return { startDay, endDay };
}

function cycleFor(card, anchorDate = new Date(), offset = 0) {
  const { startDay, endDay } = cycleDays(card);
  const anchor = new Date(anchorDate);
  const endMonthBase = anchor.getDate() <= endDay
    ? new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  const endMonth = addMonths(endMonthBase, offset);
  const startMonth = startDay > endDay ? addMonths(endMonth, -1) : endMonth;
  const cycleStart = dateAtDay(startMonth.getFullYear(), startMonth.getMonth(), startDay);
  const cycleEnd = dateAtDay(endMonth.getFullYear(), endMonth.getMonth(), endDay, true);
  return { cycleStart, cycleEnd };
}

function cycleLabel({ cycleStart, cycleEnd }) {
  const formatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });
  return `${formatter.format(cycleStart)} to ${formatter.format(cycleEnd)}`;
}

function statementDueDate(card, cycleEnd) {
  const dueDay = card.paymentDueDay || 5;
  const dueMonthOffset = dueDay <= cycleEnd.getDate() ? 1 : 0;
  const dueMonth = new Date(cycleEnd.getFullYear(), cycleEnd.getMonth() + dueMonthOffset, 1);
  return dateAtDay(dueMonth.getFullYear(), dueMonth.getMonth(), dueDay, true);
}

async function purchaseTotal(userId, cardId, cycleStart, cycleEnd) {
  const result = await Expense.aggregate([
    {
      $match: {
        userId,
        creditCardId: cardId,
        paymentMethod: 'credit_card',
        date: { $gte: cycleStart, $lte: cycleEnd },
      },
    },
    { $group: { _id: null, purchases: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  return { purchases: result[0]?.purchases || 0, count: result[0]?.count || 0 };
}

async function paymentTotal(userId, cardId, cycleStart, cycleEnd) {
  const result = await Transfer.aggregate([
    {
      $match: {
        userId,
        toCreditCardId: cardId,
        toAccountType: 'credit_card',
        date: { $gte: cycleStart, $lte: cycleEnd },
      },
    },
    { $group: { _id: null, payments: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  return { payments: result[0]?.payments || 0, count: result[0]?.count || 0 };
}

function normalizeCycleDate(value, endOfDay = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date;
}

function normalizeCardPayload(payload) {
  const data = { ...payload };
  if (data.cycleStartDay !== undefined) data.cycleStartDay = parseInt(data.cycleStartDay);
  if (data.cycleEndDay !== undefined) data.cycleEndDay = parseInt(data.cycleEndDay);
  if (data.statementDay !== undefined) data.statementDay = parseInt(data.statementDay);
  if (data.paymentDueDay !== undefined) data.paymentDueDay = parseInt(data.paymentDueDay);
  if (data.cycleEndDay !== undefined) data.statementDay = data.cycleEndDay;
  if (data.statementDay !== undefined && data.cycleEndDay === undefined) data.cycleEndDay = data.statementDay;
  return data;
}

// Monthly spend per card for the last N months — single aggregation pass
router.get('/monthly', async (req, res) => {
  try {
    const monthCount = parseInt(req.query.months) || 12;
    const now = new Date();

    const monthRange = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthRange.push({ month: d.getMonth() + 1, year: d.getFullYear(), label: `${monthNames[d.getMonth()]} ${d.getFullYear()}` });
    }

    const startDate = new Date(now.getFullYear(), now.getMonth() - monthCount + 1, 1);
    const cards = await CreditCard.find({ userId: req.user._id, isActive: true }).populate('memberId', 'name color');

    const aggResult = await Expense.aggregate([
      { $match: { userId: req.user._id, paymentMethod: 'credit_card', date: { $gte: startDate } } },
      { $group: { _id: { creditCardId: '$creditCardId', month: '$month', year: '$year' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);

    const paymentAggResult = await Transfer.aggregate([
      { $match: { userId: req.user._id, toAccountType: 'credit_card', date: { $gte: startDate } } },
      { $group: { _id: { creditCardId: '$toCreditCardId', month: '$month', year: '$year' }, total: { $sum: '$amount' } } },
    ]);

    // Build a lookup map: cardId -> { "year-month" -> total }
    const lookup = {};
    aggResult.forEach(({ _id, total }) => {
      const key = `${_id.year}-${_id.month}`;
      const cardKey = _id.creditCardId?.toString();
      if (!cardKey) return;
      if (!lookup[cardKey]) lookup[cardKey] = {};
      lookup[cardKey][key] = total;
    });

    const paymentLookup = {};
    paymentAggResult.forEach(({ _id, total }) => {
      const key = `${_id.year}-${_id.month}`;
      const cardKey = _id.creditCardId?.toString();
      if (!cardKey) return;
      if (!paymentLookup[cardKey]) paymentLookup[cardKey] = {};
      paymentLookup[cardKey][key] = total;
    });

    const cardsWithMonthly = cards.map((card) => {
      const cardKey = card._id.toString();
      const monthlyTotals = monthRange.map(({ month, year }) => lookup[cardKey]?.[`${year}-${month}`] || 0);
      const monthlyPayments = monthRange.map(({ month, year }) => paymentLookup[cardKey]?.[`${year}-${month}`] || 0);
      const monthlyNet = monthlyTotals.map((total, index) => total - monthlyPayments[index]);
      return { ...card.toObject(), monthlyTotals, monthlyPayments, monthlyNet };
    });

    res.json({ months: monthRange, cards: cardsWithMonthly });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { memberId } = req.query;
    const filter = { userId: req.user._id, isActive: true };
    if (memberId) filter.memberId = memberId;
    const cards = await CreditCard.find(filter)
      .populate('memberId', 'name color role')
      .sort({ memberId: 1, bankName: 1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/cycles', async (req, res) => {
  try {
    const { cardId, count = 6 } = req.query;
    const filter = { userId: req.user._id, isActive: true };
    if (cardId) filter._id = cardId;
    const cards = await CreditCard.find(filter).populate('memberId', 'name color role').sort({ memberId: 1, bankName: 1 });

    const result = await Promise.all(cards.map(async (card) => {
      const cycles = [];
      for (let i = 0; i < parseInt(count); i++) {
        const cycle = cycleFor(card, new Date(), -i);
        const [purchase, payment] = await Promise.all([
          purchaseTotal(req.user._id, card._id, cycle.cycleStart, cycle.cycleEnd),
          paymentTotal(req.user._id, card._id, cycle.cycleStart, cycle.cycleEnd),
        ]);
        cycles.push({
          ...cycle,
          label: cycleLabel(cycle),
          dueDate: statementDueDate(card, cycle.cycleEnd),
          purchases: purchase.purchases,
          payments: payment.payments,
          count: purchase.count + payment.count,
        });
      }
      return { ...card.toObject(), currentCycle: cycles[0], cycles };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reconciliation', async (req, res) => {
  try {
    const card = await CreditCard.findOne({ _id: req.query.cardId, userId: req.user._id, isActive: true }).populate('memberId', 'name color role');
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const defaultCycle = cycleFor(card);
    const cycleStart = normalizeCycleDate(req.query.cycleStart) || defaultCycle.cycleStart;
    const cycleEnd = normalizeCycleDate(req.query.cycleEnd, true) || defaultCycle.cycleEnd;
    const [{ purchases, count }, { payments, count: paymentCount }, statement, expenses, transfers] = await Promise.all([
      purchaseTotal(req.user._id, card._id, cycleStart, cycleEnd),
      paymentTotal(req.user._id, card._id, cycleStart, cycleEnd),
      CreditCardStatement.findOne({ userId: req.user._id, creditCardId: card._id, cycleStart, cycleEnd }),
      Expense.find({
        userId: req.user._id,
        creditCardId: card._id,
        paymentMethod: 'credit_card',
        date: { $gte: cycleStart, $lte: cycleEnd },
      })
        .populate('categoryId', 'name color icon')
        .populate('subCategoryId', 'name')
        .sort({ date: -1, createdAt: -1, _id: -1 })
        .limit(100),
      Transfer.find({
        userId: req.user._id,
        toCreditCardId: card._id,
        toAccountType: 'credit_card',
        date: { $gte: cycleStart, $lte: cycleEnd },
      })
        .populate('fromMemberId', 'name color role')
        .populate('fromSavingsAccountId', 'name bankName')
        .sort({ date: -1 })
        .limit(100),
    ]);

    const values = statement?.toObject() || {
      openingBalance: 0,
      fees: 0,
      interest: 0,
      refunds: 0,
      statementAmount: 0,
      notes: '',
    };
    const transactions = [
      ...expenses.map((expense) => ({
        _id: expense._id,
        type: 'expense',
        date: expense.date,
        label: expense.categoryId?.name || 'Uncategorized',
        description: expense.description || '',
        amount: expense.amount,
        categoryId: expense.categoryId,
        subCategoryId: expense.subCategoryId,
      })),
      ...transfers.map((transfer) => ({
        _id: transfer._id,
        type: 'payment',
        date: transfer.date,
        label: 'Payment',
        description: transfer.description || transfer.fromSavingsAccountId?.name || transfer.fromMemberId?.name || '',
        amount: transfer.amount,
        fromMemberId: transfer.fromMemberId,
        fromSavingsAccountId: transfer.fromSavingsAccountId,
      })),
    ].sort((a, b) => {
      const byDate = new Date(b.date) - new Date(a.date);
      if (byDate) return byDate;
      return String(b._id).localeCompare(String(a._id));
    });

    const calculatedClosing = values.openingBalance + purchases + values.fees + values.interest - values.refunds - payments;
    const difference = values.statementAmount - calculatedClosing;

    res.json({
      card,
      cycle: {
        cycleStart,
        cycleEnd,
        label: cycleLabel({ cycleStart, cycleEnd }),
        dueDate: statementDueDate(card, cycleEnd),
      },
      statement: values,
      purchases,
      payments,
      count: count + paymentCount,
      calculatedClosing,
      difference,
      expenses,
      transfers,
      transactions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/statements', async (req, res) => {
  try {
    const card = await CreditCard.findOne({ _id: req.body.creditCardId, userId: req.user._id, isActive: true });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const cycleStart = normalizeCycleDate(req.body.cycleStart);
    const cycleEnd = normalizeCycleDate(req.body.cycleEnd, true);
    if (!cycleStart || !cycleEnd) return res.status(400).json({ error: 'Cycle dates are required' });

    const payload = {
      userId: req.user._id,
      creditCardId: card._id,
      cycleStart,
      cycleEnd,
      openingBalance: parseFloat(req.body.openingBalance) || 0,
      fees: parseFloat(req.body.fees) || 0,
      interest: parseFloat(req.body.interest) || 0,
      refunds: parseFloat(req.body.refunds) || 0,
      statementAmount: parseFloat(req.body.statementAmount) || 0,
      notes: req.body.notes || '',
    };

    const statement = await CreditCardStatement.findOneAndUpdate(
      { userId: req.user._id, creditCardId: card._id, cycleStart, cycleEnd },
      payload,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(statement);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Total spent per card (all time and current month)
router.get('/summary', async (req, res) => {
  try {
    const cards = await CreditCard.find({ userId: req.user._id, isActive: true }).populate('memberId', 'name color');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const summary = await Promise.all(
      cards.map(async (card) => {
        const [allTime, thisMonth, paymentsAllTime, paymentsThisMonth] = await Promise.all([
          Expense.aggregate([
            { $match: { userId: req.user._id, creditCardId: card._id, paymentMethod: 'credit_card' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
          ]),
          Expense.aggregate([
            { $match: { userId: req.user._id, creditCardId: card._id, paymentMethod: 'credit_card', date: { $gte: monthStart, $lte: monthEnd } } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
          ]),
          Transfer.aggregate([
            { $match: { userId: req.user._id, toCreditCardId: card._id, toAccountType: 'credit_card' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
          ]),
          Transfer.aggregate([
            { $match: { userId: req.user._id, toCreditCardId: card._id, toAccountType: 'credit_card', date: { $gte: monthStart, $lte: monthEnd } } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
          ]),
        ]);
        const totalAllTime = allTime[0]?.total || 0;
        const paidAllTime = paymentsAllTime[0]?.total || 0;
        const totalThisMonth = thisMonth[0]?.total || 0;
        const paidThisMonth = paymentsThisMonth[0]?.total || 0;
        return {
          ...card.toObject(),
          totalAllTime,
          countAllTime: allTime[0]?.count || 0,
          paymentsAllTime: paidAllTime,
          paymentsThisMonth: paidThisMonth,
          outstandingAllTime: totalAllTime - paidAllTime,
          outstandingThisMonth: totalThisMonth - paidThisMonth,
          totalThisMonth,
          countThisMonth: thisMonth[0]?.count || 0,
        };
      })
    );

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const card = new CreditCard({ ...normalizeCardPayload(req.body), userId: req.user._id });
    await card.save();
    const populated = await card.populate('memberId', 'name color role');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updates = normalizeCardPayload(req.body);
    delete updates.userId;
    const card = await CreditCard.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, updates, { new: true, runValidators: true })
      .populate('memberId', 'name color role');
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await CreditCard.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isActive: false });
    res.json({ message: 'Card deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
