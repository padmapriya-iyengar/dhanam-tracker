const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', default: null },
    dayOfMonth: { type: Number, required: true, min: 1, max: 31 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'current_account', 'debit_card', 'credit_card', 'upi', 'netbanking', 'savings', 'other'],
      default: 'current_account',
    },
    creditCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditCard', default: null },
    savingsAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'SavingsAccount', default: null },
    description: { type: String, trim: true },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subscriptionSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
