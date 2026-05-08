// Debug script to print the long game schedule as a table
import { longGameSchedule } from '../data/longGameSchedule.js';

function formatMatchups(matchups) {
  return matchups.map(([a, b]) => `${a} vs ${b}`).join(', ');
}

const table = longGameSchedule.map(round => ({
  Round: round.roundNumber,
  Start: round.startDate,
  End: round.endDate,
  Matchups: formatMatchups(round.matchups),
  Bye: round.byeUsername,
}));

console.table(table);
