const mongoose = require('mongoose');

const creditCardBudgetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    creditCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditCard', required: true, index: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    budgetAmount: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

creditCardBudgetSchema.index({ userId: 1, creditCardId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('CreditCardBudget', creditCardBudgetSchema);
