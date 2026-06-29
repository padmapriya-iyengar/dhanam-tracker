const User = require('../models/User');
const crypto = require('crypto');

const DEFAULT_USER_EMAIL = process.env.DEFAULT_USER_EMAIL || 'padmapriya@example.com';
const DEFAULT_USER_NAME = process.env.DEFAULT_USER_NAME || 'Padmapriya';
const DEFAULT_USER_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'padmapriya';
const DEMO_USER_EMAIL = process.env.DEMO_USER_EMAIL || 'demo@example.com';
const DEMO_USER_NAME = process.env.DEMO_USER_NAME || 'Demo User';
const DEMO_USER_PASSWORD = process.env.DEMO_USER_PASSWORD || 'demo';
const AUTH_SECRET = process.env.AUTH_SECRET || 'dhanam-local-development-secret';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const passwordHash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return { passwordHash, passwordSalt: salt };
}

function verifyPassword(password, user) {
  const { passwordHash } = hashPassword(password, user.passwordSalt);
  const expected = Buffer.from(user.passwordHash, 'hex');
  const actual = Buffer.from(passwordHash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

function createToken(user) {
  const payload = {
    userId: user._id.toString(),
    exp: Date.now() + (1000 * 60 * 60 * 12),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function parseToken(token) {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;

  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(encoded).digest('base64url');
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

async function ensureUser({ email, name, password, color = '#6366f1', currency = 'AED', isDemo = false }) {
  const normalizedEmail = email.toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    user = await User.create({
      name,
      email: normalizedEmail,
      color,
      currency,
      isDemo,
      ...hashPassword(password),
    });
    return user;
  }

  const updates = {};
  if (!user.passwordHash || !user.passwordSalt) Object.assign(updates, hashPassword(password));
  if (!user.currency) updates.currency = currency;
  if (user.isDemo !== isDemo) updates.isDemo = isDemo;
  if (Object.keys(updates).length > 0) {
    user = await User.findByIdAndUpdate(user._id, updates, { new: true });
  }
  return user;
}

async function ensureDefaultUser() {
  return ensureUser({
    email: DEFAULT_USER_EMAIL,
    name: DEFAULT_USER_NAME,
    password: DEFAULT_USER_PASSWORD,
    color: '#6366f1',
  });
}

async function ensureDemoUser() {
  return ensureUser({
    email: DEMO_USER_EMAIL,
    name: DEMO_USER_NAME,
    password: DEMO_USER_PASSWORD,
    color: '#10b981',
    isDemo: true,
  });
}

async function backfillExistingDataToDefaultUser() {
  const user = await ensureDefaultUser();
  const Expense = require('../models/Expense');
  const Income = require('../models/Income');
  const SavingsAccount = require('../models/SavingsAccount');
  const Transfer = require('../models/Transfer');
  const models = [
    require('../models/Member'),
    Income,
    Expense,
    require('../models/Balance'),
    SavingsAccount,
    require('../models/CreditCard'),
    require('../models/Transfer'),
    require('../models/Subscription'),
  ];

  await Promise.all(models.map((Model) => Model.updateMany({ userId: { $exists: false } }, { userId: user._id })));
  await Expense.updateMany(
    { paymentMethod: { $in: ['debit_card', 'netbanking', 'upi'] } },
    { paymentMethod: 'current_account' }
  );
  await Expense.updateMany(
    { paymentMethod: 'current_account', affectsCurrentBalance: { $exists: false } },
    { affectsCurrentBalance: false }
  );
  await migrateSavingsOpeningBalances(user._id, { Income, Expense, SavingsAccount, Transfer });
  return user;
}

async function savingsLedgerEffect(userId, accountId) {
  const Income = require('../models/Income');
  const Expense = require('../models/Expense');
  const Transfer = require('../models/Transfer');
  const [income, expenses, transfers] = await Promise.all([
    Income.aggregate([
      { $match: { userId, savingsAccountId: accountId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { userId, savingsAccountId: accountId, paymentMethod: 'savings' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transfer.aggregate([
      {
        $match: {
          userId,
          $or: [
            { fromAccountType: 'savings', fromSavingsAccountId: accountId },
            { toAccountType: 'savings', toSavingsAccountId: accountId },
          ],
        },
      },
      {
        $group: {
          _id: null,
          outgoing: { $sum: { $cond: [{ $eq: ['$fromSavingsAccountId', accountId] }, '$amount', 0] } },
          incoming: { $sum: { $cond: [{ $eq: ['$toSavingsAccountId', accountId] }, '$amount', 0] } },
        },
      },
    ]),
  ]);

  return (income[0]?.total || 0)
    - (expenses[0]?.total || 0)
    + (transfers[0]?.incoming || 0)
    - (transfers[0]?.outgoing || 0);
}

async function migrateSavingsOpeningBalances(userId, { SavingsAccount }) {
  const accounts = await SavingsAccount.find({ userId, openingBalance: { $exists: false } });
  await Promise.all(accounts.map(async (account) => {
    const ledgerEffect = await savingsLedgerEffect(userId, account._id);
    const storedBalance = account.balance ?? 0;
    await SavingsAccount.updateOne(
      { _id: account._id, userId },
      {
        openingBalance: storedBalance - ledgerEffect,
        balance: storedBalance,
        balanceUpdatedAt: account.balanceUpdatedAt || account.updatedAt || new Date(),
      }
    );
  }));
}

async function currentUser(req, res, next) {
  try {
    const auth = req.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const payload = token ? parseToken(token) : null;
    if (!payload) return res.status(401).json({ error: 'Please log in to continue' });

    const user = await User.findOne({ _id: payload.userId, isActive: true });
    if (!user) return res.status(401).json({ error: 'Please log in to continue' });

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createToken,
  currentUser,
  ensureDefaultUser,
  ensureDemoUser,
  backfillExistingDataToDefaultUser,
  hashPassword,
  verifyPassword,
};
