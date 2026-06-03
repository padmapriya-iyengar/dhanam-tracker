const express = require('express');
const router = express.Router();
const SavingsAccount = require('../models/SavingsAccount');

router.get('/', async (req, res) => {
  try {
    const accounts = await SavingsAccount.find()
      .populate('memberId', 'name color role')
      .sort({ memberId: 1, createdAt: 1 });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const account = new SavingsAccount({ ...req.body, balanceUpdatedAt: new Date() });
    await account.save();
    const populated = await account.populate('memberId', 'name color role');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    // Track when balance was explicitly changed
    if (req.body.balance !== undefined) updates.balanceUpdatedAt = new Date();
    const account = await SavingsAccount.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate('memberId', 'name color role');
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const account = await SavingsAccount.findByIdAndDelete(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
