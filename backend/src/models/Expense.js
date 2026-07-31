const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    amount: { type: Number, required: true, min: 0 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', default: null },
    description: { type: String, trim: true },
    date: { type: Date, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    paymentMethod: {
      type: String,
      // Legacy values are kept so old records remain readable until startup migration normalizes them.
      enum: ['cash', 'card', 'current_account', 'debit_card', 'credit_card', 'upi', 'netbanking', 'savings', 'other'],
      default: 'current_account',
    },
    creditCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditCard', default: null },
    savingsAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'SavingsAccount', default: null },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', default: null },
    affectsCurrentBalance: { type: Boolean, default: true },
    notes: { type: String, trim: true },
    imported: { type: Boolean, default: false },
    clientMutationId: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1, _id: -1, createdAt: -1 });
expenseSchema.index({ month: 1, year: 1 });
expenseSchema.index({ userId: 1, memberId: 1 });
expenseSchema.index({ categoryId: 1 });
expenseSchema.index({ userId: 1, clientMutationId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Expense', expenseSchema);
