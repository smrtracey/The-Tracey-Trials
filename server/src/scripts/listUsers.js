import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { User } from '../models/User.js'

dotenv.config()

async function listUsers() {
  await mongoose.connect(env.mongoUri)

  const users = await User.find()
    .select('contestantNumber username displayName mustChangePassword')
    .sort({ contestantNumber: 1 })

  for (const user of users) {
    console.log(
      `${user.contestantNumber}. ${user.displayName} (@${user.username}) mustChangePassword=${user.mustChangePassword}`,
    )
  }

  console.log(`totalUsers=${users.length}`)

  await mongoose.disconnect()
}

listUsers().catch(async (error) => {
  console.error('Failed to list users', error)
  try {
    await mongoose.disconnect()
  } catch {
    // ignore disconnect errors during cleanup
  }
  process.exit(1)
})
