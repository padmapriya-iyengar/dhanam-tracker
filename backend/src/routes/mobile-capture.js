const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Member = require('../models/Member');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const SavingsAccount = require('../models/SavingsAccount');
const CreditCard = require('../models/CreditCard');
const MessageCategoryLearning = require('../models/MessageCategoryLearning');

router.get('/options', async (req, res) => {
  try {
    const [members, categories, subcategories, savings, cards, expenses, incomes] = await Promise.all([
      Member.find({ userId: req.user._id, isActive: true }).sort({ createdAt: 1 }),
      Category.find({ isActive: true }).sort({ name: 1 }),
      SubCategory.find({ isActive: true }).sort({ name: 1 }),
      SavingsAccount.find({ userId: req.user._id }).populate('memberId', 'name'),
      CreditCard.find({ userId: req.user._id, isActive: true }).populate('memberId', 'name'),
      Expense.find({ userId: req.user._id }).sort({ date: -1, createdAt: -1 }).limit(40),
      Income.find({ userId: req.user._id }).sort({ date: -1, createdAt: -1 }).limit(20),
    ]);
    const frequency = new Map();
    expenses.forEach((item) => {
      const key = `${item.description || ''}|${item.categoryId}|${item.paymentMethod}|${item.memberId}|${item.creditCardId || ''}|${item.savingsAccountId || ''}`;
      const entry = frequency.get(key) || { count: 0, item };
      entry.count += 1; frequency.set(key, entry);
    });
    res.json({
      members,
      categories: categories.map((category) => ({ ...category.toObject(), subCategories: subcategories.filter((sub) => String(sub.categoryId) === String(category._id)) })),
      accounts: [
        ...members.map((member) => ({ key: `current:${member._id}`, type: 'current', id: String(member._id), name: `${member.name} Current`, memberId: String(member._id) })),
        ...savings.map((item) => ({ key: `savings:${item._id}`, type: 'savings', id: String(item._id), name: item.name, memberId: String(item.memberId?._id || item.memberId), balance: item.openingBalance || 0 })),
        ...cards.map((item) => ({ key: `credit_card:${item._id}`, type: 'credit_card', id: String(item._id), name: item.name, memberId: String(item.memberId?._id || item.memberId) })),
      ],
      frequent: [...frequency.values()].sort((a, b) => b.count - a.count).slice(0, 5).map(({ item, count }) => ({
        type: 'expense', count, label: `${item.description || 'Expense'} · ${item.paymentMethod.replaceAll('_', ' ')}`,
        values: { amount: item.amount, description: item.description, memberId: item.memberId, categoryId: item.categoryId, subCategoryId: item.subCategoryId, paymentMethod: item.paymentMethod, creditCardId: item.creditCardId, savingsAccountId: item.savingsAccountId },
      })),
      recentIncomeSources: [...new Set(incomes.map((item) => item.source).filter(Boolean))].slice(0, 5),
      lastIncome: incomes[0] || null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/suggest', async (req, res) => {
  try {
    const description = String(req.query.description || '').trim();
    if (description.length < 2) return res.json({ suggestion: null });
    const pattern = new RegExp(description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [history, learning] = await Promise.all([
      Expense.findOne({ userId: req.user._id, description: pattern }).sort({ date: -1 }),
      MessageCategoryLearning.findOne({ userId: req.user._id, $or: [{ merchantLabel: pattern }, { descriptionHint: pattern }] }).sort({ confirmationCount: -1 }),
    ]);
    const source = learning || history;
    res.json({ suggestion: source ? {
      categoryId: source.categoryId, subCategoryId: source.subCategoryId || null,
      ...(history ? { paymentMethod: history.paymentMethod, creditCardId: history.creditCardId, savingsAccountId: history.savingsAccountId, memberId: history.memberId } : {}),
      reason: learning ? 'Based on your confirmed merchant choice' : 'Based on a recent matching expense',
    } : null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/duplicate-check', async (req, res) => {
  try {
    const date = new Date(req.body.date || Date.now());
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);
    const filter = { userId: req.user._id, amount: Number(req.body.amount), date: { $gte: start, $lte: end } };
    if (req.body.memberId) filter.memberId = req.body.memberId;
    const records = await Expense.find(filter).limit(5);
    const normalized = String(req.body.description || '').trim().toLowerCase();
    res.json({ duplicates: records.filter((item) => !normalized || String(item.description || '').trim().toLowerCase() === normalized).map((item) => ({ id: item._id, amount: item.amount, date: item.date, description: item.description })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
