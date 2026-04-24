import dotenv from 'dotenv'
import { createApp } from '../app.js'
import { connectDatabase } from '../config/db.js'

dotenv.config()

const username = (process.argv[2] ?? 'danny').toLowerCase()
const password = process.env.SEED_DEFAULT_PASSWORD

async function main() {
  if (!password) {
    throw new Error('SEED_DEFAULT_PASSWORD is missing in .env')
  }

  await connectDatabase()
  const app = createApp()
  const server = app.listen(0)

  try {
    const address = server.address()

    if (!address || typeof address === 'string') {
      throw new Error('Could not determine test server address.')
    }

    const baseUrl = `http://localhost:${address.port}`

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    const loginPayload = await loginResponse.json()

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginPayload.message ?? loginResponse.status}`)
    }

    const statusResponse = await fetch(`${baseUrl}/api/tasks/long-game/status`, {
      headers: {
        Authorization: `Bearer ${loginPayload.token}`,
      },
    })

    const statusPayload = await statusResponse.json()

    if (!statusResponse.ok) {
      throw new Error(`Status call failed: ${statusPayload.message ?? statusResponse.status}`)
    }

    console.log(JSON.stringify(statusPayload.longGame, null, 2))
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
