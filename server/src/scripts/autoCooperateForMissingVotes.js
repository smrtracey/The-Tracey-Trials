import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import { longGameSchedule } from '../data/longGameSchedule.js';
import { LongGameDecision } from '../models/LongGameDecision.js';
import { User } from '../models/User.js';

async function autoCooperateForMissingVotes(roundNumber) {
  await connectDatabase();
  const round = longGameSchedule.find(r => r.roundNumber === roundNumber);
  if (!round) throw new Error('Round not found');

  // Only run if round is over
  const now = new Date();
  if (now < new Date(round.endDate + 'T23:59:59Z')) {
    throw new Error('Round is not over yet');
  }

  // Get all users
  const users = await User.find({ role: 'contestant' }).lean();
  const usersByUsername = new Map(users.map(u => [u.username.trim().toLowerCase(), u]));

  // Get all decisions for this round
  const decisions = await LongGameDecision.find({ roundNumber }).lean();
  const decided = new Set(decisions.map(d => d.username + ':' + d.opponentUsername));

  // For each matchup, check for missing votes
  const ops = [];
  for (const [playerA, playerB] of round.matchups) {
    for (const [user, opponent] of [[playerA, playerB], [playerB, playerA]]) {
      const key = user + ':' + opponent;
      if (decided.has(key)) continue;
      const userObj = usersByUsername.get(user);
      if (!userObj) continue;
      ops.push({
        insertOne: {
          document: {
            user: userObj._id,
            roundNumber,
            username: user,
            opponentUsername: opponent,
            matchupKey: `${roundNumber}:${[user, opponent].sort().join(':')}`,
            choice: 'cooperate',
            autoCooperate: true,
            awardedPoints: null, // Will be resolved by resolveMatchupPoints
            resolvedAt: null,
            createdAt: new Date(round.endDate + 'T23:59:59Z'),
            updatedAt: new Date(round.endDate + 'T23:59:59Z'),
          }
        }
      });
    }
  }
  if (ops.length) {
    await LongGameDecision.bulkWrite(ops);
    console.log(`Inserted ${ops.length} auto-cooperate decisions for round ${roundNumber}`);
  } else {
    console.log('No missing votes to fill.');
  }
  mongoose.connection.close();
}

if (require.main === module) {
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
