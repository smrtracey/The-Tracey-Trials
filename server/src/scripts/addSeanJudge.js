import bcrypt from 'bcryptjs'
import { connectDatabase } from '../config/db.js'
import { User } from '../models/User.js'

const JUDGE_USERNAME = 'sean'
const JUDGE_DISPLAY_NAME = 'Sean'
const JUDGE_CONTESTANT_NUMBER = 98
const judgeStarterPassword = process.env.SEED_JUDGE_PASSWORD ?? 'Judge12345'

async function addSeanJudge() {
  await connectDatabase()

  const passwordHash = await bcrypt.hash(judgeStarterPassword, 10)

  const user = await User.findOneAndUpdate(
    { username: JUDGE_USERNAME },
    {
      $set: {
        username: JUDGE_USERNAME,
        displayName: JUDGE_DISPLAY_NAME,
        contestantNumber: JUDGE_CONTESTANT_NUMBER,
        passwordHash,
        completedTaskNumbers: [],
        loginBonusPoints: 0,
        judgeAdjustmentPoints: 0,
        mustChangePassword: true,
        passwordChangedAt: null,
        role: 'judge',
      },
      $unset: {
        contactEmail: '',
        loginBonusRank: '',
        loginBonusAwardedAt: '',
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
    },
  ).select('username displayName contestantNumber role mustChangePassword')

  console.log(
    JSON.stringify(
      {
        createdOrUpdated: true,
        starterPassword: judgeStarterPassword,
        user,
      },
      null,
      2,
    ),
  )

  process.exit(0)
}

addSeanJudge().catch((error) => {
  console.error('Failed to add Sean as judge', error)
  process.exit(1)
})
