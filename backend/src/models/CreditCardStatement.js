const mongoose = require('mongoose');

const creditCardStatementSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    creditCardId: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditCard', required: true, index: true },
    cycleStart: { type: Date, required: true },
    cycleEnd: { type: Date, required: true },
    openingBalance: { type: Number, default: 0 },
    fees: { type: Number, default: 0 },
    interest: { type: Number, default: 0 },
    refunds: { type: Number, default: 0 },
    statementAmount: { type: Number, default: 0 },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

creditCardStatementSchema.index({ userId: 1, creditCardId: 1, cycleStart: 1, cycleEnd: 1 }, { unique: true });

module.exports = mongoose.model('CreditCardStatement', creditCardStatementSchema);
