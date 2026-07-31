require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Household = require('./models/Household');
const HouseholdMembership = require('./models/HouseholdMembership');
const AuthIdentity = require('./models/AuthIdentity');

async function ensureHouseholds() {
  const users = await User.find({ isActive: true });
  let created = 0;
  for (const user of users) {
    if (!user.emailVerifiedAt) user.emailVerifiedAt = user.createdAt || new Date();
    await user.save();
    if (user.passwordHash) await AuthIdentity.updateOne(
      { provider: 'password', subject: user.email },
      { $setOnInsert: { userId: user._id, provider: 'password', subject: user.email, email: user.email } },
      { upsert: true }
    );
    if (await HouseholdMembership.exists({ userId: user._id, status: 'active' })) continue;
    const household = await Household.create({ name: user.isDemo ? 'Dhanam Demo' : `${user.name}'s Household`, dataOwnerUserId: user._id, createdByUserId: user._id, currency: user.currency || 'AED', locale: user.locale || 'en-AE' });
    await HouseholdMembership.create({ householdId: household._id, userId: user._id, email: user.email, role: 'owner', status: 'active', joinedAt: new Date() });
    created += 1;
  }
  return created;
}

if (require.main === module) {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => console.log(`Household migration complete; created ${await ensureHouseholds()} household(s).`))
    .then(() => mongoose.disconnect())
    .catch(async (error) => { console.error(error.message); await mongoose.disconnect(); process.exit(1); });
}

module.exports = ensureHouseholds;
