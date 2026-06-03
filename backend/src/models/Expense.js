const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
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
      // 'card' kept for backward-compat with existing records
      enum: ['cash', 'card', 'debit_card', 'credit_card', 'upi', 'netbanking', 'other'],
      default: 'upi',
    },
    creditCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditCard', default: null },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ month: 1, year: 1 });
expenseSchema.index({ memberId: 1 });
expenseSchema.index({ categoryId: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
