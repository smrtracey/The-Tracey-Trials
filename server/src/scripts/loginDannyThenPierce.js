import dotenv from 'dotenv'
import { createApp } from '../app.js'
import { connectDatabase } from '../config/db.js'

dotenv.config()

const PASSWORD = process.env.SEED_DEFAULT_PASSWORD

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function login(baseUrl, username, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })

  const payload = await response.json().catch(() => ({}))

  return {
    ok: response.ok,
    status: response.status,
    payload,
  }
}

async function main() {
  if (!PASSWORD) {
    throw new Error('SEED_DEFAULT_PASSWORD is missing in .env')
  }

  await connectDatabase()
  const app = createApp()
  const server = app.listen(0)

  try {
    const address = server.address()

    if (!address || typeof address === 'string') {
      throw new Error('Could not determine temporary server port.')
    }

    const baseUrl = `http://localhost:${address.port}`

    const dannyResult = await login(baseUrl, 'danny', PASSWORD)
    console.log(`Danny login: status=${dannyResult.status} ok=${dannyResult.ok}`)
    if (!dannyResult.ok) {
      console.log(`Danny error: ${dannyResult.payload?.message ?? 'Unknown error'}`)
      return
    }

    console.log('Waiting 30 seconds before logging in as Pierce...')
    await wait(30000)

    const pierceResult = await login(baseUrl, 'pierce', PASSWORD)
    console.log(`Pierce login: status=${pierceResult.status} ok=${pierceResult.ok}`)
    if (!pierceResult.ok) {
      console.log(`Pierce error: ${pierceResult.payload?.message ?? 'Unknown error'}`)
      return
    }

    console.log('Both logins completed successfully with a 30-second gap.')
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
  console.error('Failed to run sequential login script.')
  console.error(error.message)
  process.exitCode = 1
})
