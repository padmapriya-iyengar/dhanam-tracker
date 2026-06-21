const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { createToken, currentUser, ensureDefaultUser, ensureDemoUser, verifyPassword } = require('../middleware/currentUser');

router.post('/login', async (req, res) => {
  try {
    await Promise.all([ensureDefaultUser(), ensureDemoUser()]);

    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase(), isActive: true });
    if (!user || !password || !verifyPassword(password, user)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      token: createToken(user),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        color: user.color,
        currency: user.currency || 'AED',
        isDemo: user.isDemo,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', currentUser, async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    color: req.user.color,
    currency: req.user.currency || 'AED',
    isDemo: req.user.isDemo,
  });
});

module.exports = router;
