import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { createApp } from '../app.js'
import { connectDatabase } from '../config/db.js'
import { User } from '../models/User.js'
import { Submission } from '../models/Submission.js'
import { Task } from '../models/Task.js'

dotenv.config()

const tempUsername = `bootstrap-test-${Date.now()}`
const testPassword = 'BootstrapTest123!'

async function findAvailableContestantNumber() {
  const users = await User.find().select('contestantNumber')
  const used = new Set(users.map((user) => user.contestantNumber))

  for (let value = 1; value <= 99; value += 1) {
    if (!used.has(value)) {
      return value
    }
  }

  throw new Error('No available contestantNumber values for bootstrap test user.')
}

async function main() {
  await connectDatabase()
  const app = createApp()
  const server = app.listen(0)

  const { port } = server.address()

  const sharedSecretsTask = await Task.findOne({ taskNumber: 1 }).select('_id taskNumber title')

  if (!sharedSecretsTask) {
    throw new Error('Task 1 (Shared Secrets) was not found. Seed tasks before running this test.')
  }

  const passwordHash = await bcrypt.hash(testPassword, 10)
  const contestantNumber = await findAvailableContestantNumber()

  const user = await User.create({
    username: tempUsername,
    displayName: 'Bootstrap Test User',
    contestantNumber,
    passwordHash,
    mustChangePassword: false,
    completedTaskNumbers: [],
  })

  try {
    const firstLoginResponse = await fetch(`http://localhost:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: tempUsername, password: testPassword }),
    })

    if (!firstLoginResponse.ok) {
      throw new Error(`First login failed with status ${firstLoginResponse.status}`)
    }

    const secondLoginResponse = await fetch(`http://localhost:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: tempUsername, password: testPassword }),
    })

    if (!secondLoginResponse.ok) {
      throw new Error(`Second login failed with status ${secondLoginResponse.status}`)
    }

    const refreshedUser = await User.findById(user._id)
    const submissionCount = await Submission.countDocuments({ user: user._id, taskNumber: 1 })
    const sharedSecretsCompleted = (refreshedUser?.completedTaskNumbers ?? []).includes(1)

    console.log(`submissionCountForTask1=${submissionCount}`)
    console.log(`sharedSecretsCompleted=${sharedSecretsCompleted}`)

    if (submissionCount !== 1) {
      throw new Error(`Expected exactly 1 auto-submission for task 1, got ${submissionCount}`)
    }

    if (!sharedSecretsCompleted) {
      throw new Error('Expected task 1 to be marked as completed after first login.')
    }
  } finally {
    await Submission.deleteMany({ user: user._id, taskNumber: 1 })
    await User.deleteOne({ _id: user._id })
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
    await mongoose.disconnect()
  }
}

main().catch(async (error) => {
  console.error(error.message)
  await mongoose.disconnect()
  process.exitCode = 1
})
