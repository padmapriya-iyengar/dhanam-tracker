const mongoose = require('mongoose');

const householdSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  dataOwnerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currency: { type: String, enum: ['AED', 'INR'], default: 'AED' },
  locale: { type: String, enum: ['en-AE', 'en-IN'], default: 'en-AE' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Household', householdSchema);
