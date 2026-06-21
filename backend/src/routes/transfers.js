const express = require('express');
const router = express.Router();
const Transfer = require('../models/Transfer');
const SavingsAccount = require('../models/SavingsAccount');
const CreditCard = require('../models/CreditCard');
const Member = require('../models/Member');

function parseDateParts(value) {
  const date = new Date(value);
  return { date, month: date.getMonth() + 1, year: date.getFullYear() };
}

function normalizeAccountFields(data) {
  const payload = { ...data };

  payload.fromMemberId = payload.fromAccountType === 'current' ? payload.fromMemberId || null : null;
  payload.fromSavingsAccountId = payload.fromAccountType === 'savings' ? payload.fromSavingsAccountId || null : null;
  payload.fromCreditCardId = payload.fromAccountType === 'credit_card' ? payload.fromCreditCardId || null : null;
  payload.toMemberId = payload.toAccountType === 'current' ? payload.toMemberId || null : null;
  payload.toSavingsAccountId = payload.toAccountType === 'savings' ? payload.toSavingsAccountId || null : null;
  payload.toCreditCardId = payload.toAccountType === 'credit_card' ? payload.toCreditCardId || null : null;

  return payload;
}

async function validateTransfer(userId, data) {
  if (data.fromAccountType === data.toAccountType) {
    const fromId = data.fromMemberId || data.fromSavingsAccountId || data.fromCreditCardId;
    const toId = data.toMemberId || data.toSavingsAccountId || data.toCreditCardId;
    if (fromId && toId && fromId.toString() === toId.toString()) {
      throw new Error('Transfer accounts must be different');
    }
  }

  if (data.fromAccountType === 'current' && !data.fromMemberId) throw new Error('From current account owner is required');
  if (data.fromAccountType === 'savings' && !data.fromSavingsAccountId) throw new Error('From savings account is required');
  if (data.fromAccountType === 'credit_card' && !data.fromCreditCardId) throw new Error('From credit card is required');
  if (data.toAccountType === 'current' && !data.toMemberId) throw new Error('To current account owner is required');
  if (data.toAccountType === 'savings' && !data.toSavingsAccountId) throw new Error('To savings account is required');
  if (data.toAccountType === 'credit_card' && !data.toCreditCardId) throw new Error('To credit card is required');

  const checks = [];
  if (data.fromMemberId) checks.push(Member.exists({ _id: data.fromMemberId, userId, isActive: true }));
  if (data.toMemberId) checks.push(Member.exists({ _id: data.toMemberId, userId, isActive: true }));
  if (data.fromSavingsAccountId) checks.push(SavingsAccount.exists({ _id: data.fromSavingsAccountId, userId }));
  if (data.toSavingsAccountId) checks.push(SavingsAccount.exists({ _id: data.toSavingsAccountId, userId }));
  if (data.fromCreditCardId) checks.push(CreditCard.exists({ _id: data.fromCreditCardId, userId }));
  if (data.toCreditCardId) checks.push(CreditCard.exists({ _id: data.toCreditCardId, userId }));

  const results = await Promise.all(checks);
  if (results.some((result) => !result)) throw new Error('One or more transfer accounts were not found');
}

function populateTransfer(query) {
  return query
    .populate('fromMemberId', 'name color role')
    .populate('fromSavingsAccountId', 'name bankName color')
    .populate('fromCreditCardId', 'name bankName color lastFourDigits')
    .populate('toMemberId', 'name color role')
    .populate('toSavingsAccountId', 'name bankName color')
    .populate('toCreditCardId', 'name bankName color lastFourDigits');
}

router.get('/', async (req, res) => {
  try {
    const { month, year, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user._id };
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      populateTransfer(Transfer.find(filter))
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transfer.countDocuments(filter),
    ]);

    res.json({ records, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = normalizeAccountFields(req.body);
    const dateParts = parseDateParts(payload.date);
    const transfer = new Transfer({
      ...payload,
      ...dateParts,
      userId: req.user._id,
    });

    await validateTransfer(req.user._id, transfer);
    await transfer.save();

    const populated = await populateTransfer(Transfer.findById(transfer._id));
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const old = await Transfer.findOne({ _id: req.params.id, userId: req.user._id });
    if (!old) return res.status(404).json({ error: 'Transfer not found' });

    const updates = normalizeAccountFields(req.body);
    delete updates.userId;
    if (updates.date) Object.assign(updates, parseDateParts(updates.date));

    const next = new Transfer({ ...old.toObject(), ...updates });
    await validateTransfer(req.user._id, next);

    const transfer = await Transfer.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    const populated = await populateTransfer(Transfer.findById(transfer._id));
    res.json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const transfer = await Transfer.findOne({ _id: req.params.id, userId: req.user._id });
    if (!transfer) return res.status(404).json({ error: 'Transfer not found' });

    await Transfer.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Transfer deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
