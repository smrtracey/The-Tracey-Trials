import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { Submission } from '../models/Submission.js'

dotenv.config()

async function verifyResetState() {
  await mongoose.connect(env.mongoUri)

  const users = await User.countDocuments({})
  const mustChangePasswordTrue = await User.countDocuments({ mustChangePassword: true })
  const usersWithCompletedTasks = await User.countDocuments({ completedTaskNumbers: { $exists: true, $ne: [] } })
  const submissions = await Submission.countDocuments({})

  console.log(`users=${users}`)
  console.log(`mustChangePasswordTrue=${mustChangePasswordTrue}`)
  console.log(`usersWithCompletedTasks=${usersWithCompletedTasks}`)
  console.log(`submissions=${submissions}`)

  await mongoose.disconnect()
}

verifyResetState().catch(async (error) => {
  console.error('Failed to verify reset state', error)
  try {
    await mongoose.disconnect()
  } catch {
    // ignore disconnect errors during cleanup
  }
  process.exit(1)
})
