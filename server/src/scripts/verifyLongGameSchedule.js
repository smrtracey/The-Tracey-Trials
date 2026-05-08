// Script to verify the double round-robin schedule: each pair appears exactly twice, each player has 2 byes
import { longGameSchedule } from '../data/longGameSchedule.js';

const pairCounts = new Map();
const byeCounts = {};

for (const round of longGameSchedule) {
  // Count byes
  byeCounts[round.byeUsername] = (byeCounts[round.byeUsername] || 0) + 1;
  // Count matchups
  for (const [a, b] of round.matchups) {
    const key = [a, b].sort().join(' vs ');
    pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
  }
}

console.log('Pair counts (should all be 2):');
for (const [pair, count] of [...pairCounts.entries()].sort()) {
  console.log(pair, count);
}
console.log('\nBye counts (should all be 2):');
for (const player of Object.keys(byeCounts).sort()) {
  console.log(player, byeCounts[player]);
}
