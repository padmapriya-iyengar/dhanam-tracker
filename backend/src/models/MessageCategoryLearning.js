const mongoose = require('mongoose');

const messageCategoryLearningSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    merchantKey: { type: String, required: true, trim: true },
    merchantLabel: { type: String, trim: true },
    descriptionHint: { type: String, trim: true },
    matchTerms: [{ type: String, trim: true }],
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', default: null },
    confirmationCount: { type: Number, default: 1, min: 1 },
    lastConfirmedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

messageCategoryLearningSchema.index({ userId: 1, merchantKey: 1 }, { unique: true });
messageCategoryLearningSchema.index({ userId: 1, lastConfirmedAt: -1 });

module.exports = mongoose.model('MessageCategoryLearning', messageCategoryLearningSchema);
