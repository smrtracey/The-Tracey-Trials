import { longGameSchedule } from '../data/longGameSchedule.js';
import { NotificationSchemaModel } from '../models/NotificationSchema.js';
import { User } from '../models/User.js';

// Schedules a push notification for each Long Game round at noon on the first day of the round
export async function scheduleAllLongGameRoundNotifications() {
  const admin = await User.findOne({ role: 'judge' });
  if (!admin) throw new Error('No judge user found');

  for (const round of longGameSchedule) {
    const roundStart = new Date(round.startDate + 'T12:00:00Z');
    const name = `long-game-round-${round.roundNumber}`;
    const exists = await NotificationSchemaModel.findOne({ name });
    if (exists) continue;
    await NotificationSchemaModel.create({
      name,
      kind: 'scheduled',
      notifications: [{
        title: 'New Long Game Round.',
        body: 'The next round of the long game has begun.',
        recipients: round.matchups.flat().filter(Boolean)
      }],
      scheduledFor: roundStart,
      createdBy: admin._id,
    });
    console.log('Scheduled notification for round', round.roundNumber, 'at', roundStart.toISOString());
  }
}
