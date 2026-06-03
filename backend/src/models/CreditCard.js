const mongoose = require('mongoose');

const creditCardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    lastFourDigits: { type: String, trim: true, maxlength: 4 },
    color: { type: String, default: '#6366f1' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CreditCard', creditCardSchema);
