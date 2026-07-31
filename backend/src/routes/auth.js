const express = require('express');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const router = express.Router();
const User = require('../models/User');
const AuthSession = require('../models/AuthSession');
const AuthIdentity = require('../models/AuthIdentity');
const AuthToken = require('../models/AuthToken');
const Household = require('../models/Household');
const HouseholdMembership = require('../models/HouseholdMembership');
const { createToken, currentUser, hashPassword, verifyPassword } = require('../middleware/currentUser');

const googleClient = new OAuth2Client();
const tokenHash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const validPassword = (value) => typeof value === 'string' && value.length >= 10 && /[A-Za-z]/.test(value) && /\d/.test(value);
const publicAuthUrl = (path, raw) => process.env.PUBLIC_APP_URL
  ? `${process.env.PUBLIC_APP_URL.replace(/\/$/, '')}?action=${path}&token=${encodeURIComponent(raw)}`
  : `dhanam://${path}?token=${encodeURIComponent(raw)}`;

async function createSession(user, body) {
  const expiresAt = new Date(Date.now() + (1000 * 60 * 60 * 12));
  const session = await AuthSession.create({ userId: user._id, deviceName: String(body.deviceName || 'Web browser').slice(0, 120), platform: String(body.platform || 'web').slice(0, 40), expiresAt });
  return { token: createToken(user, session._id), user: safeUser(user) };
}

async function sendTransactionalEmail({ to, subject, text }) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    if (process.env.NODE_ENV === 'production') throw new Error('Transactional email is not configured');
    return false;
  }
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text }) });
  if (!response.ok) throw new Error('Transactional email delivery failed');
  return true;
}

async function issueAuthToken(user, purpose) {
  await AuthToken.deleteMany({ userId: user._id, purpose, usedAt: null });
  const raw = crypto.randomBytes(32).toString('base64url');
  await AuthToken.create({ userId: user._id, email: user.email, purpose, tokenHash: tokenHash(raw), expiresAt: new Date(Date.now() + (purpose === 'verify_email' ? 24 : 1) * 3600000) });
  return raw;
}

async function ensurePersonalHousehold(user) {
  if (await HouseholdMembership.exists({ userId: user._id, status: 'active' })) return;
  const household = await Household.create({ name: `${user.name}'s Household`, dataOwnerUserId: user._id, createdByUserId: user._id, currency: user.currency, locale: user.locale });
  await HouseholdMembership.create({ householdId: household._id, userId: user._id, email: user.email, role: 'owner', status: 'active', joinedAt: new Date() });
}

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
    hasPassword: Boolean(user.passwordHash && user.passwordSalt),
    notificationPreferences: user.notificationPreferences || {
      enabled: true, recurring: true, cardDue: true, budgets: true,
    },
  };
}

router.post('/signup', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const name = String(req.body.name || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(email) || name.length < 2) return res.status(400).json({ error: 'Name and a valid email are required' });
    if (!validPassword(req.body.password)) return res.status(400).json({ error: 'Password must be at least 10 characters and contain letters and numbers' });
    if (await User.exists({ email })) return res.status(409).json({ error: 'An account already exists for this email' });
    const invitation = req.body.inviteToken ? await HouseholdMembership.findOne({ inviteTokenHash: tokenHash(String(req.body.inviteToken)), email, status: 'invited', inviteExpiresAt: { $gt: new Date() } }) : null;
    if (req.body.inviteToken && !invitation) return res.status(400).json({ error: 'Invitation is invalid, expired, or belongs to another email' });
    const verifiedAt = invitation || process.env.NODE_ENV !== 'production' ? new Date() : null;
    const user = await User.create({ name, email, ...hashPassword(req.body.password), currency: req.body.currency || 'AED', locale: req.body.locale || 'en-AE', emailVerifiedAt: verifiedAt, onboardingCompleted: Boolean(invitation) });
    await AuthIdentity.create({ userId: user._id, provider: 'password', subject: email, email });
    if (invitation) {
      invitation.userId = user._id; invitation.status = 'active'; invitation.joinedAt = new Date(); invitation.inviteTokenHash = null; invitation.inviteExpiresAt = null; await invitation.save();
    }
    const raw = await issueAuthToken(user, 'verify_email');
    const url = publicAuthUrl('verify-email', raw);
    await sendTransactionalEmail({ to: email, subject: 'Verify your Dhanam email', text: `Verify your email to continue: ${url}` });
    if (user.emailVerifiedAt && !invitation) await ensurePersonalHousehold(user);
    res.status(201).json({ message: user.emailVerifiedAt ? 'Account created' : 'Check your email to verify your account', verified: Boolean(user.emailVerifiedAt), ...(process.env.NODE_ENV === 'production' ? {} : { verificationToken: raw }) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/verify-email', async (req, res) => {
  const record = await AuthToken.findOne({ tokenHash: tokenHash(String(req.body.token || '')), purpose: 'verify_email', usedAt: null, expiresAt: { $gt: new Date() } });
  if (!record) return res.status(400).json({ error: 'Verification link is invalid or expired' });
  record.usedAt = new Date(); await record.save();
  const user = await User.findByIdAndUpdate(record.userId, { emailVerifiedAt: new Date() }, { new: true });
  await ensurePersonalHousehold(user);
  res.json(await createSession(user, req.body));
});

router.post('/forgot-password', async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || '').trim().toLowerCase(), isActive: true });
  if (user) {
    const raw = await issueAuthToken(user, 'reset_password');
    const url = publicAuthUrl('reset-password', raw);
    await sendTransactionalEmail({ to: user.email, subject: 'Reset your Dhanam password', text: `Reset your password: ${url}` });
  }
  res.json({ message: 'If that email exists, a reset link has been sent' });
});

router.post('/reset-password', async (req, res) => {
  if (!validPassword(req.body.password)) return res.status(400).json({ error: 'Password must be at least 10 characters and contain letters and numbers' });
  const record = await AuthToken.findOne({ tokenHash: tokenHash(String(req.body.token || '')), purpose: 'reset_password', usedAt: null, expiresAt: { $gt: new Date() } });
  if (!record) return res.status(400).json({ error: 'Reset link is invalid or expired' });
  record.usedAt = new Date(); await record.save();
  await User.updateOne({ _id: record.userId }, hashPassword(req.body.password));
  await AuthSession.updateMany({ userId: record.userId, revokedAt: null }, { revokedAt: new Date() });
  await AuthIdentity.updateOne({ userId: record.userId, provider: 'password' }, { userId: record.userId, provider: 'password', subject: record.email, email: record.email }, { upsert: true });
  res.json({ message: 'Password reset. Sign in with your new password.' });
});

router.post('/google', async (req, res) => {
  try {
    const audiences = (process.env.GOOGLE_CLIENT_IDS || '').split(',').map((value) => value.trim()).filter(Boolean);
    if (!audiences.length) return res.status(503).json({ error: 'Google sign-in is not configured' });
    const ticket = await googleClient.verifyIdToken({ idToken: String(req.body.idToken || ''), audience: audiences });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || !profile.email_verified) return res.status(401).json({ error: 'Google email could not be verified' });
    let identity = await AuthIdentity.findOne({ provider: 'google', subject: profile.sub });
    let user = identity ? await User.findById(identity.userId) : null;
    const invitation = req.body.inviteToken
      ? await HouseholdMembership.findOne({ inviteTokenHash: tokenHash(String(req.body.inviteToken)), email: profile.email.toLowerCase(), status: 'invited', inviteExpiresAt: { $gt: new Date() } })
      : await HouseholdMembership.findOne({ email: profile.email.toLowerCase(), status: 'invited', inviteExpiresAt: { $gt: new Date() } }).sort({ isDefault: -1, createdAt: 1 });
    if (req.body.inviteToken && !invitation) return res.status(400).json({ error: 'Invitation is invalid, expired, or belongs to another email' });
    if (!user) {
      const existing = await User.findOne({ email: profile.email.toLowerCase() });
      if (existing) return res.status(409).json({ error: 'Sign in with your existing method, then link Google from Security settings' });
      user = await User.create({ name: profile.name || profile.email.split('@')[0], email: profile.email, emailVerifiedAt: new Date(), onboardingCompleted: Boolean(invitation), color: '#087F72' });
      identity = await AuthIdentity.create({ userId: user._id, provider: 'google', subject: profile.sub, email: profile.email });
      if (!invitation) await ensurePersonalHousehold(user);
    }
    if (invitation) { invitation.userId = user._id; invitation.status = 'active'; invitation.joinedAt = new Date(); invitation.inviteTokenHash = null; invitation.inviteExpiresAt = null; await invitation.save(); await User.updateOne({ _id: user._id }, { onboardingCompleted: true }); user.onboardingCompleted = true; }
    res.json(await createSession(user, req.body));
  } catch { res.status(401).json({ error: 'Google sign-in could not be verified' }); }
});

router.get('/methods', currentUser, async (req, res) => {
  const identities = await AuthIdentity.find({ userId: req.user._id }).select('provider');
  res.json(identities.map((identity) => identity.provider));
});

router.post('/google/link', currentUser, async (req, res) => {
  try {
    const audiences = (process.env.GOOGLE_CLIENT_IDS || '').split(',').map((value) => value.trim()).filter(Boolean);
    const ticket = await googleClient.verifyIdToken({ idToken: String(req.body.idToken || ''), audience: audiences });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email_verified || profile.email?.toLowerCase() !== req.user.email) return res.status(400).json({ error: 'Google account must use your verified Dhanam email' });
    const existing = await AuthIdentity.findOne({ provider: 'google', subject: profile.sub });
    if (existing && String(existing.userId) !== String(req.user._id)) return res.status(409).json({ error: 'This Google identity is already linked elsewhere' });
    await AuthIdentity.updateOne({ userId: req.user._id, provider: 'google' }, { userId: req.user._id, provider: 'google', subject: profile.sub, email: profile.email }, { upsert: true });
    res.json({ message: 'Google sign-in linked' });
  } catch { res.status(401).json({ error: 'Google identity could not be verified' }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase(), isActive: true });
    if (!user || !password || !verifyPassword(password, user)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.emailVerifiedAt) return res.status(403).json({ error: 'Verify your email before signing in' });
    res.json(await createSession(user, req.body));
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
    const confirmed = req.user.passwordHash ? verifyPassword(req.body?.password, req.user) : String(req.body?.confirmEmail || '').toLowerCase() === req.user.email;
    if (!confirmed) return res.status(401).json({ error: req.user.passwordHash ? 'Enter your current password to delete this account' : 'Confirm your email address to delete this account' });

    const userId = req.user._id;
    const memberships = await HouseholdMembership.find({ userId, status: 'active' });
    for (const membership of memberships) {
      if (membership.role === 'owner' && await HouseholdMembership.exists({ householdId: membership.householdId, status: 'active', userId: { $ne: userId } })) {
        return res.status(409).json({ error: 'Transfer household ownership before deleting your account' });
      }
    }
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
    const ownedHouseholds = await Household.find({ dataOwnerUserId: userId });
    for (const household of ownedHouseholds) {
      const others = await HouseholdMembership.exists({ householdId: household._id, status: 'active', userId: { $ne: userId } });
      if (!others) {
        await Promise.all(ownedModels.map((Model) => Model.deleteMany({ userId })));
        await Household.deleteOne({ _id: household._id });
        await HouseholdMembership.deleteMany({ householdId: household._id });
      }
    }
    await HouseholdMembership.deleteMany({ userId });
    await AuthIdentity.deleteMany({ userId });
    await AuthToken.deleteMany({ userId });
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
