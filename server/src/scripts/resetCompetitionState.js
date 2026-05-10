import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { FundRequest } from '../models/FundRequest.js'
import { User } from '../models/User.js'
import { Submission } from '../models/Submission.js'
import { LongGameDecision } from '../models/LongGameDecision.js'
import { PushSubscription } from '../models/PushSubscription.js'

dotenv.config()

async function resetCompetitionState() {
  const starterPassword = process.env.SEED_DEFAULT_PASSWORD ?? 'TraceyTrials2026!'
  const judgeStarterPassword = process.env.SEED_JUDGE_PASSWORD ?? 'Judge12345'
  const starterPasswordHash = await bcrypt.hash(starterPassword, 10)
  const judgePasswordHash = await bcrypt.hash(judgeStarterPassword, 10)

  await mongoose.connect(env.mongoUri)

  try {
    await User.collection.dropIndex('loginBonusRank_1')
  } catch (error) {
    if (error?.codeName !== 'IndexNotFound') {
      throw error
    }
  }

  await User.collection.createIndex(
    { loginBonusRank: 1 },
    {
      unique: true,
      partialFilterExpression: {
        loginBonusRank: { $type: 'number' },
      },
      name: 'loginBonusRank_1',
    },
  )

  const contestantResetResult = await User.updateMany(
    { role: { $ne: 'judge' } },
    {
      $set: {
        passwordHash: starterPasswordHash,
        completedTaskNumbers: [],
        loginBonusPoints: 0,
        mustChangePassword: true,
        passwordChangedAt: null,
      },
      $unset: {
        contactEmail: '',
        loginBonusRank: '',
        loginBonusAwardedAt: '',
      },
    },
  )

  const judgeResetResult = await User.updateMany(
    { role: 'judge' },
    {
      $set: {
        passwordHash: judgePasswordHash,
        completedTaskNumbers: [],
        loginBonusPoints: 0,
        mustChangePassword: true,
        passwordChangedAt: null,
      },
      $unset: {
        contactEmail: '',
        loginBonusRank: '',
        loginBonusAwardedAt: '',
      },
    },
  )

  const submissionResult = await Submission.deleteMany({})
  const fundRequestResult = await FundRequest.deleteMany({})
  const longGameDecisionResult = await LongGameDecision.deleteMany({})
  const pushSubscriptionResult = await PushSubscription.deleteMany({})

  console.log(`contestantsReset=${contestantResetResult.modifiedCount}`)
  console.log(`judgesReset=${judgeResetResult.modifiedCount}`)
  console.log(`submissionsDeleted=${submissionResult.deletedCount}`)
  console.log(`fundRequestsDeleted=${fundRequestResult.deletedCount}`)
  console.log(`longGameDecisionsDeleted=${longGameDecisionResult.deletedCount}`)
  console.log(`pushSubscriptionsDeleted=${pushSubscriptionResult.deletedCount}`)

  await mongoose.disconnect()
}

resetCompetitionState().catch(async (error) => {
  console.error('Failed to reset competition state', error)
  try {
    await mongoose.disconnect()
  } catch {
    // ignore disconnect errors during cleanup
  }
  process.exit(1)
})
