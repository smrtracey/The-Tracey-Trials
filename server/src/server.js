import { createApp } from './app.js'
import { connectDatabase } from './config/db.js'
import { env } from './config/env.js'

async function startServer() {
  try {
    await connectDatabase()
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
