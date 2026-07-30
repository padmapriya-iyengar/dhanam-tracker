const mongoose = require('mongoose');

const authSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    deviceName: { type: String, trim: true, default: 'Unknown device', maxlength: 120 },
    platform: { type: String, trim: true, default: 'unknown', maxlength: 40 },
    lastSeenAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

authSessionSchema.index({ userId: 1, revokedAt: 1, lastSeenAt: -1 });

module.exports = mongoose.model('AuthSession', authSessionSchema);
