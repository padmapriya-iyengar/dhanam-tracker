const express = require('express');
const router = express.Router();
const Income = require('../models/Income');

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
router.get('/:id', async (req, res) => {
  const record = await Income.findOne({ _id: req.params.id, userId: req.user._id }).populate('memberId', 'name color role').populate('savingsAccountId', 'name bankName');
  if (!record) return res.status(404).json({ error: 'Income record not found' });
  res.json(record);
});

router.post('/', async (req, res) => {
  try {
    if (req.body.clientMutationId) {
      const existing = await Income.findOne({ userId: req.user._id, clientMutationId: req.body.clientMutationId })
        .populate('memberId', 'name color role').populate('savingsAccountId', 'name bankName');
      if (existing) return res.json(existing);
    }
    const date = new Date(req.body.date);
    const isSalary = /^salary$/i.test(String(req.body.source || '').trim());
    const automaticFundingDate = isSalary ? new Date(date.getFullYear(), date.getMonth() + 1, 1) : date;
    const fundingMonth = parseInt(req.body.fundingMonth, 10) || automaticFundingDate.getMonth() + 1;
    const fundingYear = parseInt(req.body.fundingYear, 10) || automaticFundingDate.getFullYear();
    const income = new Income({
      ...req.body,
      userId: req.user._id,
      createdByUserId: req.actorUser?._id || req.user._id,
      updatedByUserId: req.actorUser?._id || req.user._id,
      savingsAccountId: req.body.savingsAccountId || null,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      fundingMonth,
      fundingYear,
      fundingOverride: req.body.fundingOverride === true,
    });
    await income.save();

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

    if (req.body.expectedUpdatedAt && old.updatedAt.toISOString() !== new Date(req.body.expectedUpdatedAt).toISOString()) return res.status(409).json({ error: 'This income changed on another device', conflict: old });
    const updates = { ...req.body, savingsAccountId: req.body.savingsAccountId || null };
    delete updates.expectedUpdatedAt;
    delete updates.userId;
    updates.updatedByUserId = req.actorUser?._id || req.user._id;
    if (req.body.date) {
      const date = new Date(req.body.date);
      updates.month = date.getMonth() + 1;
      updates.year = date.getFullYear();
    }
    const effectiveDate = req.body.date ? new Date(req.body.date) : old.date;
    const effectiveSource = req.body.source === undefined ? old.source : req.body.source;
    const automaticFundingDate = /^salary$/i.test(String(effectiveSource || '').trim()) ? new Date(effectiveDate.getFullYear(), effectiveDate.getMonth() + 1, 1) : effectiveDate;
    updates.fundingMonth = parseInt(req.body.fundingMonth, 10) || old.fundingMonth || automaticFundingDate.getMonth() + 1;
    updates.fundingYear = parseInt(req.body.fundingYear, 10) || old.fundingYear || automaticFundingDate.getFullYear();
    updates.fundingOverride = req.body.fundingOverride === true;

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

    await Income.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'Income record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
