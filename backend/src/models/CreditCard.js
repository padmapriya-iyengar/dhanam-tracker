const mongoose = require('mongoose');

const creditCardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    lastFourDigits: { type: String, trim: true, maxlength: 4 },
    cycleStartDay: { type: Number, min: 1, max: 31 },
    cycleEndDay: { type: Number, min: 1, max: 31 },
    statementDay: { type: Number, min: 1, max: 31, default: 14 },
    paymentDueDay: { type: Number, min: 1, max: 31, default: 5 },
    color: { type: String, default: '#6366f1' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CreditCard', creditCardSchema);
