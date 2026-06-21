const mongoose = require('mongoose');

const accountTypes = ['current', 'savings', 'credit_card'];

const transferSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    fromAccountType: { type: String, enum: accountTypes, required: true },
    fromMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
    fromSavingsAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'SavingsAccount', default: null },
    fromCreditCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditCard', default: null },
    toAccountType: { type: String, enum: accountTypes, required: true },
    toMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
    toSavingsAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'SavingsAccount', default: null },
    toCreditCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditCard', default: null },
    description: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

transferSchema.index({ userId: 1, date: -1 });
transferSchema.index({ userId: 1, month: 1, year: 1 });
transferSchema.index({ userId: 1, toCreditCardId: 1 });

module.exports = mongoose.model('Transfer', transferSchema);
