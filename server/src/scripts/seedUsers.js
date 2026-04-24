import bcrypt from 'bcryptjs'
import { connectDatabase } from '../config/db.js'
import { User } from '../models/User.js'

const defaultFirstNames = [
  'alex',
  'blake',
  'casey',
  'devon',
  'ellis',
  'frankie',
  'georgia',
  'harper',
  'indie',
  'jordan',
  'sean',
]

const configuredFirstNames = (process.env.SEED_FIRST_NAMES ?? '')
  .split(',')
  .map((name) => name.trim().toLowerCase())
  .filter(Boolean)

const firstNames = configuredFirstNames.length ? configuredFirstNames : defaultFirstNames

if (firstNames.length === 0) {
  throw new Error('SEED_FIRST_NAMES must contain at least one comma-separated first name.')
}

const uniqueNames = new Set(firstNames)
if (uniqueNames.size !== firstNames.length) {
  throw new Error('SEED_FIRST_NAMES contains duplicates. Each username must be unique.')
}

const starterPassword = process.env.SEED_DEFAULT_PASSWORD ?? 'TraceyTrials2026!'
const judgeStarterPassword = process.env.SEED_JUDGE_PASSWORD ?? 'Judge12345'

const contestants = firstNames.map((firstName, index) => ({
  contestantNumber: index + 1,
  username: firstName,
  displayName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
  password: starterPassword,
}))

const judge = {
  contestantNumber: 99,
  username: 'mikaela',
  displayName: 'Mikaela',
  password: judgeStarterPassword,
}

async function seedUsers() {
  await connectDatabase()

  const usernamesToKeep = [...contestants.map((contestant) => contestant.username), judge.username]
  await User.deleteMany({ username: { $nin: usernamesToKeep } })

  for (const contestant of contestants) {
    const passwordHash = await bcrypt.hash(contestant.password, 10)

    await User.findOneAndUpdate(
      { username: contestant.username },
      {
        $set: {
          username: contestant.username,
          displayName: contestant.displayName,
          contestantNumber: contestant.contestantNumber,
          passwordHash,
          completedTaskNumbers: [],
          mustChangePassword: true,
          passwordChangedAt: null,
          role: 'contestant',
        },
        $unset: {
          contactEmail: '',
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
      },
    )
  }

  const judgePasswordHash = await bcrypt.hash(judge.password, 10)

  await User.findOneAndUpdate(
    { username: judge.username },
    {
      $set: {
        username: judge.username,
        displayName: judge.displayName,
        contestantNumber: judge.contestantNumber,
        passwordHash: judgePasswordHash,
        completedTaskNumbers: [],
        mustChangePassword: true,
        passwordChangedAt: null,
        role: 'judge',
      },
      $unset: {
        contactEmail: '',
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
      setDefaultsOnInsert: true,
    },
  )

  console.table(
    [...contestants, judge].map(({ username, contestantNumber }) => ({
      contestantNumber,
      username,
      role: username === judge.username ? 'judge' : 'contestant',
      starterPassword: username === judge.username ? judgeStarterPassword : starterPassword,
    })),
  )

  process.exit(0)
}

seedUsers().catch((error) => {
  console.error('Failed to seed contestants', error)
  process.exit(1)
})
