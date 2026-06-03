const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');

router.get('/', async (req, res) => {
  try {
    const { month, year, memberId, categoryId, paymentMethod, page = 1, limit = 50, startDate, endDate } = req.query;
    const filter = {};
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
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    });
    await expense.save();
    const populated = await Expense.findById(expense._id)
      .populate('memberId', 'name color role')
      .populate('categoryId', 'name color icon')
      .populate('subCategoryId', 'name');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.body.date) {
      const date = new Date(req.body.date);
      updates.month = date.getMonth() + 1;
      updates.year = date.getFullYear();
    }
    const expense = await Expense.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('memberId', 'name color role')
      .populate('categoryId', 'name color icon')
      .populate('subCategoryId', 'name');
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
