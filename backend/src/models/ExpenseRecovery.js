const mongoose = require('mongoose');

const expenseRecoverySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense', required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, required: true },
    source: {
      type: String,
      enum: ['bank_reimbursement', 'family_transfer', 'employer', 'friend', 'other'],
      default: 'other',
    },
    budgetTreatment: {
      type: String,
      enum: ['reduce_expense', 'ignore_for_budget'],
      default: 'reduce_expense',
    },
    notes: { type: String, trim: true },
    clientMutationId: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

expenseRecoverySchema.index({ userId: 1, date: -1 });
expenseRecoverySchema.index({ expenseId: 1, budgetTreatment: 1 });
expenseRecoverySchema.index({ userId: 1, clientMutationId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('ExpenseRecovery', expenseRecoverySchema);
