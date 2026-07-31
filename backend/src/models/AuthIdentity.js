const mongoose = require('mongoose');

const authIdentitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, enum: ['password', 'google'], required: true },
  subject: { type: String, required: true },
  email: { type: String, required: true, trim: true, lowercase: true },
}, { timestamps: true });

authIdentitySchema.index({ provider: 1, subject: 1 }, { unique: true });
authIdentitySchema.index({ userId: 1, provider: 1 }, { unique: true });
module.exports = mongoose.model('AuthIdentity', authIdentitySchema);
