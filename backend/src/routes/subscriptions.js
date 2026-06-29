const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const Expense = require('../models/Expense');

function shouldAffectCurrentBalance(paymentMethod) {
  return paymentMethod === 'current_account';
}

function sanitizePayload(body) {
  const payload = { ...body };
  payload.subCategoryId = payload.subCategoryId || null;
  payload.creditCardId = payload.paymentMethod === 'credit_card' ? payload.creditCardId || null : null;
  payload.savingsAccountId = payload.paymentMethod === 'savings' ? payload.savingsAccountId || null : null;
  payload.dayOfMonth = parseInt(payload.dayOfMonth);
  payload.amount = parseFloat(payload.amount);
  return payload;
}

function dateForMonth(year, month, dayOfMonth) {
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(dayOfMonth, lastDay);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function populateSubscription(query) {
  return query
    .populate('memberId', 'name color role')
    .populate('categoryId', 'name color icon')
    .populate('subCategoryId', 'name')
    .populate('creditCardId', 'name bankName color lastFourDigits')
    .populate('savingsAccountId', 'name bankName color');
}

async function withStatus(userId, subscription, month, year) {
  const obj = subscription.toObject ? subscription.toObject() : subscription;
  if (!month || !year) return obj;
  const existing = await Expense.findOne({
    userId,
    subscriptionId: subscription._id,
    month: parseInt(month),
    year: parseInt(year),
  }).select('_id amount date');
  return { ...obj, generatedExpenseId: existing?._id || null, generatedExpense: existing || null };
}

router.get('/', async (req, res) => {
  try {
    const { month, year } = req.query;
    const subscriptions = await populateSubscription(
      Subscription.find({ userId: req.user._id, isActive: true }).sort({ dayOfMonth: 1, name: 1 })
    );
    const result = await Promise.all(subscriptions.map((sub) => withStatus(req.user._id, sub, month, year)));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const subscription = new Subscription({ ...sanitizePayload(req.body), userId: req.user._id });
    await subscription.save();
    const populated = await populateSubscription(Subscription.findById(subscription._id));
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updates = sanitizePayload(req.body);
    delete updates.userId;
    const subscription = await populateSubscription(
      Subscription.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, updates, { new: true, runValidators: true })
    );
    if (!subscription) return res.status(404).json({ error: 'Subscription not found' });
    res.json(subscription);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const subscription = await Subscription.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isActive: false },
      { new: true }
    );
    if (!subscription) return res.status(404).json({ error: 'Subscription not found' });
    res.json({ message: 'Subscription deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/generate', async (req, res) => {
  try {
    const month = parseInt(req.body.month);
    const year = parseInt(req.body.year);
    if (!month || !year) return res.status(400).json({ error: 'Month and year are required' });

    const subscription = await Subscription.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });
    if (!subscription) return res.status(404).json({ error: 'Subscription not found' });

    const existing = await Expense.findOne({ userId: req.user._id, subscriptionId: subscription._id, month, year });
    if (existing) return res.status(409).json({ error: 'Expense already created for this subscription and month', expenseId: existing._id });

    const date = dateForMonth(year, month, subscription.dayOfMonth);
    const expense = await Expense.create({
      userId: req.user._id,
      subscriptionId: subscription._id,
      memberId: subscription.memberId,
      amount: subscription.amount,
      categoryId: subscription.categoryId,
      subCategoryId: subscription.subCategoryId || null,
      description: subscription.description || subscription.name,
      date,
      month,
      year,
      paymentMethod: subscription.paymentMethod,
      creditCardId: subscription.creditCardId || null,
      savingsAccountId: subscription.savingsAccountId || null,
      affectsCurrentBalance: shouldAffectCurrentBalance(subscription.paymentMethod),
      notes: subscription.notes,
    });

    const populated = await Expense.findById(expense._id)
      .populate('memberId', 'name color role')
      .populate('categoryId', 'name color icon')
      .populate('subCategoryId', 'name')
      .populate('creditCardId', 'name bankName color lastFourDigits')
      .populate('savingsAccountId', 'name bankName');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
