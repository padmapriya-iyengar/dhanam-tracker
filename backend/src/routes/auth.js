const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AuthSession = require('../models/AuthSession');
const { createToken, currentUser, verifyPassword } = require('../middleware/currentUser');

function safeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    color: user.color,
    currency: user.currency || 'AED',
    locale: user.locale || 'en-AE',
    isDemo: user.isDemo,
    onboardingCompleted: user.isDemo ? true : Boolean(user.onboardingCompleted),
    notificationPreferences: user.notificationPreferences || {
      enabled: true, recurring: true, cardDue: true, budgets: true,
    },
  };
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase(), isActive: true });
    if (!user || !password || !verifyPassword(password, user)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const expiresAt = new Date(Date.now() + (1000 * 60 * 60 * 12));
    const session = await AuthSession.create({
      userId: user._id,
      deviceName: String(req.body.deviceName || 'Web browser').slice(0, 120),
      platform: String(req.body.platform || 'web').slice(0, 40),
      expiresAt,
    });

    res.json({ token: createToken(user, session._id), user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', currentUser, async (req, res) => {
  res.json(safeUser(req.user));
});

router.patch('/me', currentUser, async (req, res) => {
  try {
    const allowed = ['currency', 'locale', 'onboardingCompleted', 'notificationPreferences'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json(safeUser(user));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/logout', currentUser, async (req, res) => {
  if (req.authSession) await AuthSession.updateOne({ _id: req.authSession._id }, { revokedAt: new Date() });
  res.json({ message: 'Signed out' });
});

router.delete('/me', currentUser, async (req, res) => {
  try {
    if (req.user.isDemo) return res.status(403).json({ error: 'The shared demo account cannot be deleted' });
    if (!req.body?.password || !verifyPassword(req.body.password, req.user)) {
      return res.status(401).json({ error: 'Enter your current password to delete this account' });
    }

    const userId = req.user._id;
    const ownedModels = [
      require('../models/Balance'),
      require('../models/CategoryGoal'),
      require('../models/CreditCard'),
      require('../models/CreditCardBudget'),
      require('../models/CreditCardStatement'),
      require('../models/Expense'),
      require('../models/ExpenseRecovery'),
      require('../models/Income'),
      require('../models/Member'),
      require('../models/MessageCategoryLearning'),
      require('../models/SavingsAccount'),
      require('../models/Subscription'),
      require('../models/Transfer'),
    ];
    await Promise.all(ownedModels.map((Model) => Model.deleteMany({ userId })));
    await AuthSession.deleteMany({ userId });
    await User.deleteOne({ _id: userId });
    res.json({ message: 'Account and associated financial data deleted' });
  } catch {
    res.status(500).json({ error: 'Account deletion could not be completed' });
  }
});

router.get('/sessions', currentUser, async (req, res) => {
  const sessions = await AuthSession.find({
    userId: req.user._id,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ lastSeenAt: -1 });
  res.json(sessions.map((session) => ({
    id: session._id,
    deviceName: session.deviceName,
    platform: session.platform,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    current: String(session._id) === String(req.authSession?._id),
  })));
});

router.delete('/sessions/:id', currentUser, async (req, res) => {
  const session = await AuthSession.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id, revokedAt: null },
    { revokedAt: new Date() },
    { new: true }
  );
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ message: 'Session revoked' });
});

module.exports = router;
