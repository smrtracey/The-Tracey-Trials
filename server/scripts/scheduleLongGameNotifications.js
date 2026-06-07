import { connectDatabase } from '../src/config/db.js';
import { scheduleAllLongGameRoundNotifications } from '../src/services/longGameRoundNotificationService.js';

async function main() {
  await connectDatabase();
  await scheduleAllLongGameRoundNotifications();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});