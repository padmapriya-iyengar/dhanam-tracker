require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { EJSON } = require('bson');

async function backup() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const directory = path.join(__dirname, '..', 'backups', stamp);
  fs.mkdirSync(directory, { recursive: true });
  const collections = await mongoose.connection.db.listCollections().toArray();
  const manifest = { createdAt: new Date().toISOString(), database: mongoose.connection.name, collections: {} };
  for (const { name } of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    const documents = await mongoose.connection.db.collection(name).find({}).toArray();
    const payload = EJSON.stringify(documents, { relaxed: false }, 2);
    const filename = `${name}.json`;
    fs.writeFileSync(path.join(directory, filename), payload, { encoding: 'utf8', flag: 'wx' });
    manifest.collections[name] = {
      count: documents.length,
      sha256: crypto.createHash('sha256').update(payload).digest('hex'),
    };
  }
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2), { encoding: 'utf8', flag: 'wx' });
  console.log(JSON.stringify({ directory, ...manifest }, null, 2));
  await mongoose.disconnect();
}

backup().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
