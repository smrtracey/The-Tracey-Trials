const today = new Date('2026-05-08');
const rounds = 18;
const endDate = new Date('2026-12-31');
const msPerRound = Math.floor((endDate - today) / rounds);

const contestants = ['tau','maria','adriana','marika','katy','will','pierce','cathal','danny'];



function generateSingleRoundRobin(players) {
  const n = players.length;
  const rounds = n; // For odd n, n rounds, each player gets one bye
  const schedule = [];
  // Create a copy and add a dummy for bye
  const arr = [...players];
  arr.push(null); // null represents a bye
  const total = arr.length; // n+1
  for (let r = 0; r < rounds; r++) {
    const round = [];
    let byeUsername = null;
    for (let i = 0; i < total / 2; i++) {
      const p1 = arr[i];
      const p2 = arr[total - 1 - i];
      if (p1 === null) {
        byeUsername = p2;
      } else if (p2 === null) {
        byeUsername = p1;
      } else {
        round.push([p1, p2]);
      }
    }
    schedule.push({ matchups: round, byeUsername });
    arr.splice(1, 0, arr.pop());
  }
  return schedule;
}


// Generate two full single round-robins for 18 rounds
const singleRound = generateSingleRoundRobin(contestants);
const fullSchedule = [...singleRound, ...singleRound];

export const longGameSchedule = Array.from({ length: rounds }, (_, i) => {
  const start = new Date(today.getTime() + i * msPerRound);
  const end = new Date(today.getTime() + (i + 1) * msPerRound - 1);
  const { matchups, byeUsername } = fullSchedule[i];
  return {
    roundNumber: i + 1,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    matchups,
    byeUsername,
  };
});
