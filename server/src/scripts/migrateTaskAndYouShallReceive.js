// Migration script: Rename task title in DB
// Usage: node server/src/scripts/migrateTaskAndYouShallReceive.js
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Task } from '../models/Task.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/traceytrials';

async function run() {
  await mongoose.connect(MONGO_URI);
  const result = await Task.updateMany(
    { title: 'This taskmaster thing is harder than it looks.' },
    { $set: { title: 'Task and you shall receive' } }
  );
  console.log(`Updated ${result.modifiedCount} task(s).`);
  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
