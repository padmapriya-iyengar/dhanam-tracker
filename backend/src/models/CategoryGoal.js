const mongoose = require('mongoose');

const categoryGoalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    goal: { type: Number, required: true, default: 5000, min: 1 },
  },
  { timestamps: true }
);

categoryGoalSchema.index({ userId: 1, categoryId: 1 }, { unique: true });

module.exports = mongoose.model('CategoryGoal', categoryGoalSchema);
