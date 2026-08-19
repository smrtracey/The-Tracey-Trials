import bcrypt from 'bcryptjs'
import { connectDatabase } from '../config/db.js'
import { User } from '../models/User.js'

const testUsername = (process.env.SEED_TEST_USERNAME ?? 'tester').trim().toLowerCase()
const testDisplayName = (process.env.SEED_TEST_DISPLAY_NAME ?? 'Tester').trim()
const testPassword = process.env.SEED_TEST_PASSWORD ?? 'Tester2026!'
const requestedTestContestantNumber = Number(process.env.SEED_TEST_CONTESTANT_NUMBER ?? 97)

function parseDefaultPinnedTaskNumbers() {
  const raw = process.env.SEED_DEFAULT_PINNED_TASK_NUMBERS ?? '1,2,3,11,20'

  return [...new Set(raw.split(',').map((value) => Number(value.trim())).filter((value) => Number.isInteger(value) && value > 0))].sort(
    (a, b) => a - b,
  )
}

if (!testUsername) {
  throw new Error('SEED_TEST_USERNAME cannot be empty.')
}

if (!testDisplayName) {
  throw new Error('SEED_TEST_DISPLAY_NAME cannot be empty.')
}

if (testPassword.length < 8) {
  throw new Error('SEED_TEST_PASSWORD must be at least 8 characters.')
}

if (!Number.isInteger(requestedTestContestantNumber) || requestedTestContestantNumber < 1 || requestedTestContestantNumber > 99) {
  throw new Error('SEED_TEST_CONTESTANT_NUMBER must be a whole number from 1 to 99.')
}

async function seedTestUser() {
  await connectDatabase()

  const passwordHash = await bcrypt.hash(testPassword, 10)
  const existingTester = await User.findOne({
    $or: [
      { username: testUsername },
      { role: 'tester' },
    ],
  }).sort({ updatedAt: -1 })
  let testContestantNumber = requestedTestContestantNumber
  let contestantNumberConflict = await User.findOne({
    contestantNumber: testContestantNumber,
    ...(existingTester ? { _id: { $ne: existingTester._id } } : {}),
  }).select('username')

  if (contestantNumberConflict) {
    const usedContestantNumbers = new Set(await User.distinct('contestantNumber'))
    const availableContestantNumber = Array.from(
      { length: 98 },
      (_value, index) => 98 - index,
    ).find((contestantNumber) => !usedContestantNumbers.has(contestantNumber))

    if (!availableContestantNumber) {
      throw new Error('No contestant number is available for the test user.')
    }

    console.warn(
      `Contestant number ${testContestantNumber} belongs to ${contestantNumberConflict.username}; using ${availableContestantNumber} instead.`,
    )
    testContestantNumber = availableContestantNumber
    contestantNumberConflict = null
  }

  const tester = await User.findOneAndUpdate(
    existingTester ? { _id: existingTester._id } : { username: testUsername },
    {
      $set: {
        username: testUsername,
        displayName: testDisplayName,
        contestantNumber: testContestantNumber,
        passwordHash,
        pinnedTaskNumbers: parseDefaultPinnedTaskNumbers(),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        role: 'tester',
      },
      $setOnInsert: {
        completedTaskNumbers: [],
        loginBonusPoints: 0,
        judgeAdjustmentPoints: 0,
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
  )

  console.table([
    {
      role: tester.role,
      username: tester.username,
      displayName: tester.displayName,
      contestantNumber: tester.contestantNumber,
      password: testPassword,
    },
  ])

  process.exit(0)
}

seedTestUser().catch((error) => {
  console.error('Failed to seed tester user', error)
  process.exit(1)
})
