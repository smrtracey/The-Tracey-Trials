import { createApp } from './app.js'
import { connectDatabase } from './config/db.js'
import { env } from './config/env.js'
import { startScheduledNotificationProcessor } from './services/scheduledNotificationService.js'

async function startServer() {
  try {
    await connectDatabase()
    startScheduledNotificationProcessor()
    const app = createApp()

    app.listen(env.port, () => {
      console.log(`Tracey Trials API listening on http://localhost:${env.port}`)
    })
  } catch (error) {
    console.error('Failed to start server', error)
    process.exit(1)
  }
}

startServer()
