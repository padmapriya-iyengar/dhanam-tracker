const mongoose = require('mongoose');

const balanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    openingBalance: { type: Number, default: 0 },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

balanceSchema.index({ userId: 1, memberId: 1 }, { unique: true });

module.exports = mongoose.model('Balance', balanceSchema);
