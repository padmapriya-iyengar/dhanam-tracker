require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const CategoryGoal = require('./models/CategoryGoal');

async function migrateSecurity() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);

  const ownerEmail = (process.env.DEFAULT_USER_EMAIL || '').toLowerCase();
  const owner = ownerEmail ? await User.findOne({ email: ownerEmail }) : null;
  const legacyGoals = await CategoryGoal.countDocuments({ userId: { $exists: false } });
  if (legacyGoals && !owner) {
    throw new Error('Set DEFAULT_USER_EMAIL to the owner of existing category goals');
  }
  if (legacyGoals) await CategoryGoal.updateMany({ userId: { $exists: false } }, { userId: owner._id });

  try {
    await CategoryGoal.collection.dropIndex('categoryId_1');
  } catch (error) {
    if (error.codeName !== 'IndexNotFound') throw error;
  }
  await CategoryGoal.collection.createIndex({ userId: 1, categoryId: 1 }, { unique: true });
  console.log(`Security migration complete; assigned ${legacyGoals} legacy category goal(s).`);
  await mongoose.disconnect();
}

migrateSecurity().catch(async (error) => {
  console.error(`Security migration failed: ${error.message}`);
  await mongoose.disconnect();
  process.exit(1);
});
