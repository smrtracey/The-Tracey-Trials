// Script to verify byes for each player in the current schedule
import { longGameSchedule } from '../data/longGameSchedule.js';

const byeCounts = {};
for (const round of longGameSchedule) {
  byeCounts[round.byeUsername] = (byeCounts[round.byeUsername] || 0) + 1;
}

console.log('Bye counts:');
for (const player of Object.keys(byeCounts).sort()) {
  console.log(player, byeCounts[player]);
}
