require('dotenv').config();
const mongoose = require('mongoose');

const LOCAL_URI = process.env.MONGODB_LOCAL_URI || 'mongodb://localhost:27017/dhanam-tracker';
const ATLAS_URI = process.env.MONGODB_URI;

// Mongoose default pluralised collection names for each model
const COLLECTIONS = [
  'members',
  'users',
  'categories',
  'subcategories',
  'incomes',
  'expenses',
  'balances',
  'savingsaccounts',
  'creditcards',
  'creditcardstatements',
  'transfers',
  'subscriptions',
];

async function migrate() {
  if (!ATLAS_URI || ATLAS_URI.includes('localhost')) {
    console.error('MONGODB_URI in .env must point to Atlas, not localhost.');
    process.exit(1);
  }

  console.log('Connecting to local MongoDB...');
  const local = await mongoose.createConnection(LOCAL_URI).asPromise();

  console.log('Connecting to Atlas...');
  const atlas = await mongoose.createConnection(ATLAS_URI).asPromise();

  console.log('Both connections established.\n');

  let totalMigrated = 0;

  for (const name of COLLECTIONS) {
    const localColl = local.db.collection(name);
    const atlasColl = atlas.db.collection(name);

    const docs = await localColl.find({}).toArray();

    if (docs.length === 0) {
      console.log(`  ${name}: empty — skipped`);
      continue;
    }

    // Drop existing Atlas data for this collection so re-runs are idempotent
    await atlasColl.deleteMany({});
    await atlasColl.insertMany(docs, { ordered: false });

    console.log(`  ${name}: ${docs.length} document(s) migrated`);
    totalMigrated += docs.length;
  }

  // Copy indexes from local to Atlas
  console.log('\nCopying indexes...');
  for (const name of COLLECTIONS) {
    const localColl = local.db.collection(name);
    const atlasColl = atlas.db.collection(name);

    const indexes = await localColl.indexes();
    for (const idx of indexes) {
      if (idx.name === '_id_') continue; // _id index is automatic
      const { key, name: idxName, ...options } = idx;
      try {
        await atlasColl.createIndex(key, { ...options, name: idxName });
      } catch {
        // Ignore if index already exists
      }
    }
  }

  await local.close();
  await atlas.close();

  console.log(`\nMigration complete — ${totalMigrated} total document(s) moved to Atlas.`);
}

migrate().catch((err) => {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
});
