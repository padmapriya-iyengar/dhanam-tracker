require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { backfillExistingDataToDefaultUser, currentUser } = require('./middleware/currentUser');
const seedDemoData = require('./seedDemoData');

const app = express();

app.disable('x-powered-by');
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', currentUser, require('./routes/users'));
app.use('/api/members', currentUser, require('./routes/members'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/income', currentUser, require('./routes/income'));
app.use('/api/expenses', currentUser, require('./routes/expenses'));
app.use('/api/reports', currentUser, require('./routes/reports'));
app.use('/api/insights', currentUser, require('./routes/insights'));
app.use('/api/chat', currentUser, require('./routes/chat'));
app.use('/api/balance', currentUser, require('./routes/balance'));
app.use('/api/savings', currentUser, require('./routes/savings'));
app.use('/api/credit-cards', currentUser, require('./routes/credit-cards'));
app.use('/api/transfers', currentUser, require('./routes/transfers'));
app.use('/api/subscriptions', currentUser, require('./routes/subscriptions'));
app.use('/api/category-goals', require('./routes/category-goals'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dhanam-tracker';

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await backfillExistingDataToDefaultUser();
    await seedDemoData();
    console.log('Default and demo users are ready');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
