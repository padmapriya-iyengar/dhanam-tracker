require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { backfillExistingDataToDefaultUser, currentUser, requireAdmin } = require('./middleware/currentUser');
const seedDemoData = require('./seedDemoData');

const app = express();
const production = process.env.NODE_ENV === 'production';
if (production) {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) throw new Error('AUTH_SECRET must be at least 32 characters in production');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required in production');
  if (!process.env.CORS_ORIGIN) throw new Error('CORS_ORIGIN is required in production');
  if (process.env.CORS_ORIGIN.split(',').some((origin) => !origin.trim().startsWith('https://'))) {
    throw new Error('Production CORS_ORIGIN values must use HTTPS');
  }
}

app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cache-Control': 'no-store',
  });
  if (production) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (production) {
    const sendJson = res.json.bind(res);
    res.json = (body) => sendJson(res.statusCode >= 500 && body?.error ? { error: 'Internal server error' } : body);
  }
  next();
});
const configuredOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const localDevelopmentOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
app.use(cors({
  origin(origin, callback) {
    if (!origin || configuredOrigins.includes(origin) || (process.env.NODE_ENV !== 'production' && localDevelopmentOrigin.test(origin))) {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin not allowed: ${origin}`));
  },
}));
app.use(express.json({ limit: '256kb' }));

const loginAttempts = new Map();
app.use('/api/auth/login', (req, res, next) => {
  const now = Date.now();
  const recent = (loginAttempts.get(req.ip) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (recent.length >= 10) return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  loginAttempts.set(req.ip, recent);
  res.on('finish', () => {
    if (res.statusCode === 401) loginAttempts.set(req.ip, [...recent, Date.now()]);
    else if (res.statusCode < 400) loginAttempts.delete(req.ip);
  });
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', currentUser, requireAdmin, require('./routes/users'));
app.use('/api/members', currentUser, require('./routes/members'));
app.use('/api/categories', currentUser, require('./routes/categories'));
app.use('/api/income', currentUser, require('./routes/income'));
app.use('/api/expenses', currentUser, require('./routes/expenses'));
app.use('/api/reports', currentUser, require('./routes/reports'));
app.use('/api/insights', currentUser, require('./routes/insights'));
app.use('/api/message-import', currentUser, require('./routes/message-import'));
app.use('/api/chat', currentUser, require('./routes/chat'));
app.use('/api/balance', currentUser, require('./routes/balance'));
app.use('/api/savings', currentUser, require('./routes/savings'));
app.use('/api/credit-cards', currentUser, require('./routes/credit-cards'));
app.use('/api/transfers', currentUser, require('./routes/transfers'));
app.use('/api/accounts', currentUser, require('./routes/accounts'));
app.use('/api/subscriptions', currentUser, require('./routes/subscriptions'));
app.use('/api/category-goals', currentUser, require('./routes/category-goals'));
app.use('/api/mobile/home', currentUser, require('./routes/mobile-home'));
app.use('/api/mobile/capture', currentUser, require('./routes/mobile-capture'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dhanam-tracker';

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    if (!production || process.env.ENABLE_BOOTSTRAP_USERS === 'true') {
      await backfillExistingDataToDefaultUser();
      await seedDemoData();
      console.log('Bootstrap users are ready');
    }
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
