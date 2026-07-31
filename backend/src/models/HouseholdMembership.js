const mongoose = require('mongoose');

const householdMembershipSchema = new mongoose.Schema({
  householdId: { type: mongoose.Schema.Types.ObjectId, ref: 'Household', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  role: { type: String, enum: ['owner', 'admin', 'contributor'], default: 'contributor' },
  status: { type: String, enum: ['invited', 'active', 'removed'], default: 'invited', index: true },
  invitedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  inviteTokenHash: { type: String, default: null },
  inviteExpiresAt: { type: Date, default: null },
  joinedAt: { type: Date, default: null },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

householdMembershipSchema.index({ householdId: 1, email: 1 }, { unique: true });
householdMembershipSchema.index({ householdId: 1, userId: 1 }, { unique: true, sparse: true });
module.exports = mongoose.model('HouseholdMembership', householdMembershipSchema);
