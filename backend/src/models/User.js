const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, default: null },
    passwordSalt: { type: String, default: null },
    emailVerifiedAt: { type: Date, default: null },
    color: { type: String, default: '#6366f1' },
    currency: { type: String, enum: ['AED', 'INR'], default: 'AED' },
    locale: { type: String, enum: ['en-AE', 'en-IN'], default: 'en-AE' },
    onboardingCompleted: { type: Boolean, default: false },
    notificationPreferences: {
      enabled: { type: Boolean, default: true },
      recurring: { type: Boolean, default: true },
      cardDue: { type: Boolean, default: true },
      budgets: { type: Boolean, default: true },
      quietStart: { type: String, default: '22:00' },
      quietEnd: { type: String, default: '07:00' },
      recurringAdvanceDays: { type: Number, default: 2, min: 0, max: 30 },
      cardAdvanceDays: { type: Number, default: 5, min: 0, max: 30 },
      showAmounts: { type: Boolean, default: false },
    },
    isDemo: { type: Boolean, default: false },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
