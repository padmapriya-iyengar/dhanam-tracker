const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    amount: { type: Number, required: true, min: 0 },
    source: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date: { type: Date, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    savingsAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'SavingsAccount', default: null },
  },
  { timestamps: true }
);

incomeSchema.index({ date: -1 });
incomeSchema.index({ month: 1, year: 1 });
incomeSchema.index({ userId: 1, memberId: 1 });

module.exports = mongoose.model('Income', incomeSchema);
