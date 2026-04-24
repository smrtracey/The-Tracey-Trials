import bcrypt from 'bcryptjs'
import { connectDatabase } from '../config/db.js'
import { User } from '../models/User.js'

const testUsername = (process.env.SEED_TEST_USERNAME ?? 'sean').trim().toLowerCase()
const testDisplayName = (process.env.SEED_TEST_DISPLAY_NAME ?? 'Sean').trim()
const testPassword = process.env.SEED_TEST_PASSWORD ?? 'SeanTest2026!'

if (!testUsername) {
  throw new Error('SEED_TEST_USERNAME cannot be empty.')
}

async function seedTestUser() {
  await connectDatabase()

  const passwordHash = await bcrypt.hash(testPassword, 10)

  await User.findOneAndUpdate(
    { role: 'tester', contestantNumber: 11 },
    {
      username: testUsername,
      displayName: testDisplayName,
      contestantNumber: 11,
      passwordHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      contactEmail: null,
      role: 'tester',
    },
    {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
    },
  )

  console.table([
    {
      role: 'tester',
      username: testUsername,
      password: testPassword,
      contestantNumber: 11,
    },
  ])

  process.exit(0)
}

seedTestUser().catch((error) => {
  console.error('Failed to seed tester user', error)
  process.exit(1)
})
