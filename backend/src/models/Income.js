const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    amount: { type: Number, required: true, min: 0 },
    source: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date: { type: Date, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    fundingMonth: { type: Number, min: 1, max: 12 },
    fundingYear: { type: Number },
    fundingOverride: { type: Boolean, default: false },
    savingsAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'SavingsAccount', default: null },
    imported: { type: Boolean, default: false },
    clientMutationId: { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

incomeSchema.index({ date: -1 });
incomeSchema.index({ month: 1, year: 1 });
incomeSchema.index({ userId: 1, fundingYear: 1, fundingMonth: 1 });
incomeSchema.index({ userId: 1, memberId: 1 });
incomeSchema.index({ userId: 1, clientMutationId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Income', incomeSchema);
