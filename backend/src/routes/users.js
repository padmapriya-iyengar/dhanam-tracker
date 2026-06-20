const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { ensureDefaultUser, hashPassword } = require('../middleware/currentUser');

router.use((req, res, next) => {
  if (req.user.isDemo) return res.status(403).json({ error: 'User management is not available in demo mode' });
  next();
});

function toSafeUser(user) {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.passwordHash;
  delete obj.passwordSalt;
  return obj;
}

router.get('/', async (req, res) => {
  try {
    await ensureDefaultUser();
    const users = await User.find({ isActive: true }).sort({ createdAt: 1 });
    res.json(users.map(toSafeUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/current', async (req, res) => {
  res.json(toSafeUser(req.user));
});

router.post('/', async (req, res) => {
  try {
    const { password, ...body } = req.body;
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    const user = new User({ ...body, ...hashPassword(password) });
    await user.save();
    res.status(201).json(toSafeUser(user));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { password, passwordHash, passwordSalt, ...updates } = req.body;
    if (password) Object.assign(updates, hashPassword(password));
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(toSafeUser(user));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const activeUsers = await User.countDocuments({ isActive: true });
    if (activeUsers <= 1) return res.status(400).json({ error: 'At least one active user is required' });

    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
