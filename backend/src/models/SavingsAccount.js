const mongoose = require('mongoose');

const savingsAccountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    bankName: { type: String, trim: true },
    accountType: {
      type: String,
      enum: ['savings', 'current', 'fixed_deposit', 'investment', 'other'],
      default: 'savings',
    },
    balance: { type: Number, required: true, default: 0 },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    color: { type: String, default: '#6366f1' },
    notes: { type: String, trim: true },
    balanceUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SavingsAccount', savingsAccountSchema);
