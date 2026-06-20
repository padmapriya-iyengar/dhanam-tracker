const express = require('express');
const router = express.Router();
const CreditCard = require('../models/CreditCard');
const Expense = require('../models/Expense');

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

    // Build a lookup map: cardId -> { "year-month" -> total }
    const lookup = {};
    aggResult.forEach(({ _id, total }) => {
      const key = `${_id.year}-${_id.month}`;
      const cardKey = _id.creditCardId?.toString();
      if (!cardKey) return;
      if (!lookup[cardKey]) lookup[cardKey] = {};
      lookup[cardKey][key] = total;
    });

    const cardsWithMonthly = cards.map((card) => {
      const cardKey = card._id.toString();
      const monthlyTotals = monthRange.map(({ month, year }) => lookup[cardKey]?.[`${year}-${month}`] || 0);
      return { ...card.toObject(), monthlyTotals };
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

// Total spent per card (all time and current month)
router.get('/summary', async (req, res) => {
  try {
    const cards = await CreditCard.find({ userId: req.user._id, isActive: true }).populate('memberId', 'name color');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const summary = await Promise.all(
      cards.map(async (card) => {
        const [allTime, thisMonth] = await Promise.all([
          Expense.aggregate([
            { $match: { userId: req.user._id, creditCardId: card._id, paymentMethod: 'credit_card' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
          ]),
          Expense.aggregate([
            { $match: { userId: req.user._id, creditCardId: card._id, paymentMethod: 'credit_card', date: { $gte: monthStart, $lte: monthEnd } } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
          ]),
        ]);
        return {
          ...card.toObject(),
          totalAllTime: allTime[0]?.total || 0,
          countAllTime: allTime[0]?.count || 0,
          totalThisMonth: thisMonth[0]?.total || 0,
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
    const card = new CreditCard({ ...req.body, userId: req.user._id });
    await card.save();
    const populated = await card.populate('memberId', 'name color role');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
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
