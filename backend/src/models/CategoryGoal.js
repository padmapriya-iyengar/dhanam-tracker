const mongoose = require('mongoose');

const categoryGoalSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, unique: true },
    goal: { type: Number, required: true, default: 5000, min: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CategoryGoal', categoryGoalSchema);
