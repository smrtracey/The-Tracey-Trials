import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { longGameSchedule } from '../data/longGameSchedule.js';
import { fillMissingVotesForCompletedRounds } from '../services/longGameNoVoteService.js';

const isDirectExecution = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;

async function autoCooperateForMissingVotes(roundNumber) {
  await connectDatabase();
  const round = longGameSchedule.find(r => r.roundNumber === roundNumber);
  if (!round) throw new Error('Round not found');

  // Only run if round is over
  const now = new Date();
  if (now < new Date(round.endDate + 'T23:59:59Z')) {
    throw new Error('Round is not over yet');
  }

  const beforeCount = await mongoose.connection.db.collection('longgamedecisions').countDocuments({ roundNumber });
  const insertedCount = await fillMissingVotesForCompletedRounds();
  const afterCount = await mongoose.connection.db.collection('longgamedecisions').countDocuments({ roundNumber });
  if (afterCount > beforeCount) {
    console.log(`Inserted ${afterCount - beforeCount} no-vote decisions for round ${roundNumber}`);
  } else {
    console.log('No missing votes to fill.');
  }
  mongoose.connection.close();
}

if (isDirectExecution) {
  const round = process.argv[2];
  if (!round) {
    console.error('Usage: node autoCooperateForMissingVotes.js <roundNumber>');
    process.exit(1);
  }
  autoCooperateForMissingVotes(Number(round)).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
