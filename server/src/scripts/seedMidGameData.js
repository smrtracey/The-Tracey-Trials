import mongoose from 'mongoose'
import { connectDatabase } from '../config/db.js'
import { longGameSchedule } from '../data/longGameSchedule.js'
import { FundRequest } from '../models/FundRequest.js'
import { LongGameDecision } from '../models/LongGameDecision.js'
import { Submission } from '../models/Submission.js'
import { Task } from '../models/Task.js'
import { User } from '../models/User.js'
import { getLongGamePointsForChoices } from '../services/longGameScoringService.js'

const DAY_MS = 24 * 60 * 60 * 1000
const TIMELINE_START = new Date('2026-05-09T09:00:00.000Z')
const PASSWORD_CHANGED_AT = new Date('2026-05-10T08:30:00.000Z')

function hashString(value) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}

function isTaskAssignedToUser(task, username) {
  if (task.audience === 'all') {
    return true
  }

  return (task.assignedUsernames ?? []).includes(username)
}

function getMatchupKey(roundNumber, usernameA, usernameB) {
  const [firstPlayer, secondPlayer] = [usernameA, usernameB]
    .map((value) => value.trim().toLowerCase())
    .sort()

  return `${roundNumber}:${firstPlayer}:${secondPlayer}`
}

function getChoice(seedValue) {
  return seedValue % 3 === 0 ? 'betray' : 'cooperate'
}

function buildCompletedTasksForUser(user, assignedTasks) {
  const targetCount = Math.min(assignedTasks.length, 3 + (hashString(user.username) % 3))

  return assignedTasks
    .filter((task, index) => task.mandatory || index < targetCount)
    .map((task) => task.taskNumber)
    .slice(0, targetCount)
    .sort((first, second) => first - second)
}

function buildSubmissionDocument({ user, task, repeatIndex, dayOffset }) {
  const roll = (user.contestantNumber + task.taskNumber + repeatIndex) % 5
  const mediaType = roll === 0 ? null : roll % 2 === 0 ? 'video' : 'image'
  const extension = mediaType === 'video' ? 'mp4' : 'jpg'
  const createdAt = new Date(TIMELINE_START.getTime() + dayOffset * DAY_MS + repeatIndex * 50 * 60 * 1000)
  const mediaItems = mediaType
    ? [
        {
          url: `/uploads/mock-${user.username}-task-${task.taskNumber}-${repeatIndex + 1}.${extension}`,
          type: mediaType,
          originalName: `mock-${user.username}-task-${task.taskNumber}.${extension}`,
        },
      ]
    : []

  return {
    user: user._id,
    taskNumber: task.taskNumber,
    caption: mediaType ? `${task.title} update` : '',
    textBody: `Mid-game seed entry for ${task.title} by ${user.displayName}.`,
    mediaItems,
    mediaUrl: mediaItems[0]?.url ?? null,
    mediaType: mediaItems[0]?.type ?? null,
    originalName: mediaItems[0]?.originalName ?? null,
    done: (hashString(`${user.username}:${task.taskNumber}:${repeatIndex}`) % 4) === 0,
    createdAt,
    updatedAt: createdAt,
  }
}

function buildResolvedDecisionPair({ round, userA, userB, choiceA, choiceB, createdAtA, createdAtB }) {
  const matchupKey = getMatchupKey(round.roundNumber, userA.username, userB.username)
  const { pointsA, pointsB } = getLongGamePointsForChoices(choiceA, choiceB)
  const resolvedAt = new Date(Math.max(createdAtA.getTime(), createdAtB.getTime()) + 5 * 60 * 1000)

  return [
    {
      user: userA._id,
      roundNumber: round.roundNumber,
      username: userA.username,
      opponentUsername: userB.username,
      matchupKey,
      choice: choiceA,
      autoCooperate: false,
      awardedPoints: pointsA,
      resolvedAt,
      createdAt: createdAtA,
      updatedAt: resolvedAt,
    },
    {
      user: userB._id,
      roundNumber: round.roundNumber,
      username: userB.username,
      opponentUsername: userA.username,
      matchupKey,
      choice: choiceB,
      autoCooperate: false,
      awardedPoints: pointsB,
      resolvedAt,
      createdAt: createdAtB,
      updatedAt: resolvedAt,
    },
  ]
}

function buildPendingDecision({ round, user, opponentUser, choice, createdAt }) {
  return {
    user: user._id,
    roundNumber: round.roundNumber,
    username: user.username,
    opponentUsername: opponentUser.username,
    matchupKey: getMatchupKey(round.roundNumber, user.username, opponentUser.username),
    choice,
    autoCooperate: false,
    awardedPoints: null,
    resolvedAt: null,
    createdAt,
    updatedAt: createdAt,
  }
}

function buildFundRequests(contestants) {
  const requestConfigs = [
    { username: contestants[0]?.username, amount: 20, status: 'paid', dayOffset: 1 },
    { username: contestants[1]?.username, amount: 35, status: 'pending', dayOffset: 2 },
    { username: contestants[2]?.username, amount: 15, status: 'paid', dayOffset: 3 },
    { username: contestants[3]?.username, amount: 40, status: 'pending', dayOffset: 4 },
    { username: contestants[4]?.username, amount: 25, status: 'paid', dayOffset: 5 },
    { username: contestants[5]?.username, amount: 10, status: 'pending', dayOffset: 6 },
  ].filter((config) => Boolean(config.username))

  return requestConfigs.map((config) => {
    const user = contestants.find((entry) => entry.username === config.username)
    const createdAt = new Date(TIMELINE_START.getTime() + config.dayOffset * DAY_MS + 2 * 60 * 60 * 1000)
    const paidAt = config.status === 'paid' ? new Date(createdAt.getTime() + 3 * 60 * 60 * 1000) : null

    return {
      user: user._id,
      amount: config.amount,
      status: config.status,
      paidAt,
      createdAt,
      updatedAt: paidAt ?? createdAt,
    }
  })
}

async function seedMidGameData() {
  await connectDatabase()

  const contestants = await User.find({ role: 'contestant' }).sort({ contestantNumber: 1 })
  const judge = await User.findOne({ role: 'judge' })
  const tasks = await Task.find({ isActive: true }).sort({ taskNumber: 1 })

  if (contestants.length === 0) {
    throw new Error('No contestant users found. Run seed:users first.')
  }

  if (tasks.length === 0) {
    throw new Error('No active tasks found. Run seed:tasks first.')
  }

  const usersByUsername = new Map(contestants.map((user) => [user.username, user]))
  const userOperations = []

  for (const contestant of contestants) {
    const assignedTasks = tasks.filter((task) => isTaskAssignedToUser(task, contestant.username))
    const completedTaskNumbers = buildCompletedTasksForUser(contestant, assignedTasks)
    const loginBonusRank = contestant.contestantNumber <= 3 ? contestant.contestantNumber : undefined
    const loginBonusPoints = contestant.contestantNumber === 1 ? 3 : contestant.contestantNumber === 2 ? 2 : contestant.contestantNumber === 3 ? 1 : 0

    userOperations.push({
      updateOne: {
        filter: { _id: contestant._id },
        update: {
          $set: {
            completedTaskNumbers,
            mustChangePassword: false,
            passwordChangedAt: PASSWORD_CHANGED_AT,
            contactEmail: `${contestant.username}@example.com`,
            loginBonusRank,
            loginBonusPoints,
            loginBonusAwardedAt: loginBonusPoints > 0 ? PASSWORD_CHANGED_AT : undefined,
            judgeAdjustmentPoints: 0,
          },
        },
      },
    })
  }

  if (judge) {
    userOperations.push({
      updateOne: {
        filter: { _id: judge._id },
        update: {
          $set: {
            mustChangePassword: false,
            passwordChangedAt: PASSWORD_CHANGED_AT,
            contactEmail: 'judge@example.com',
            judgeAdjustmentPoints: 0,
          },
        },
      },
    })
  }

  if (userOperations.length > 0) {
    await User.bulkWrite(userOperations)
  }

  await Submission.deleteMany({})
  await FundRequest.deleteMany({})
  await LongGameDecision.deleteMany({})

  const submissionDocs = []

  for (const contestant of contestants) {
    const assignedTasks = tasks.filter((task) => isTaskAssignedToUser(task, contestant.username))
    const completedTaskNumbers = new Set(buildCompletedTasksForUser(contestant, assignedTasks))

    assignedTasks
      .filter((task) => completedTaskNumbers.has(task.taskNumber))
      .slice(0, 3)
      .forEach((task, index) => {
        submissionDocs.push(
          buildSubmissionDocument({
            user: contestant,
            task,
            repeatIndex: 0,
            dayOffset: index + contestant.contestantNumber,
          }),
        )

        if ((hashString(`${contestant.username}:${task.taskNumber}`) % 3) === 0) {
          submissionDocs.push(
            buildSubmissionDocument({
              user: contestant,
              task,
              repeatIndex: 1,
              dayOffset: index + contestant.contestantNumber,
            }),
          )
        }
      })
  }

  if (submissionDocs.length > 0) {
    await Submission.insertMany(submissionDocs)
  }

  const fundRequestDocs = buildFundRequests(contestants)
  if (fundRequestDocs.length > 0) {
    await FundRequest.insertMany(fundRequestDocs)
  }

  const roundOne = longGameSchedule.find((round) => round.roundNumber === 1)
  const roundTwo = longGameSchedule.find((round) => round.roundNumber === 2)
  const longGameDocs = []

  if (roundOne) {
    roundOne.matchups.forEach(([playerA, playerB], matchupIndex) => {
      const userA = usersByUsername.get(playerA)
      const userB = usersByUsername.get(playerB)
      if (!userA || !userB) {
        return
      }

      const createdAtA = new Date(`${roundOne.endDate}T18:${String(10 + matchupIndex).padStart(2, '0')}:00.000Z`)
      const createdAtB = new Date(`${roundOne.endDate}T18:${String(20 + matchupIndex).padStart(2, '0')}:00.000Z`)
      const choiceA = getChoice(hashString(`${roundOne.roundNumber}:${playerA}:${playerB}`))
      const choiceB = getChoice(hashString(`${roundOne.roundNumber}:${playerB}:${playerA}`))

      longGameDocs.push(
        ...buildResolvedDecisionPair({
          round: roundOne,
          userA,
          userB,
          choiceA,
          choiceB,
          createdAtA,
          createdAtB,
        }),
      )
    })
  }

  if (roundTwo) {
    const [matchupA, matchupB, matchupC] = roundTwo.matchups

    if (matchupA) {
      const [playerA, playerB] = matchupA
      const userA = usersByUsername.get(playerA)
      const userB = usersByUsername.get(playerB)

      if (userA && userB) {
        longGameDocs.push(
          ...buildResolvedDecisionPair({
            round: roundTwo,
            userA,
            userB,
            choiceA: 'cooperate',
            choiceB: 'betray',
            createdAtA: new Date(`${roundTwo.startDate}T09:10:00.000Z`),
            createdAtB: new Date(`${roundTwo.startDate}T10:00:00.000Z`),
          }),
        )
      }
    }

    if (matchupB) {
      const [playerA, playerB] = matchupB
      const userA = usersByUsername.get(playerA)
      const userB = usersByUsername.get(playerB)

      if (userA && userB) {
        longGameDocs.push(
          buildPendingDecision({
            round: roundTwo,
            user: userA,
            opponentUser: userB,
            choice: 'cooperate',
            createdAt: new Date(`${roundTwo.startDate}T11:15:00.000Z`),
          }),
        )
      }
    }

    if (matchupC) {
      const [playerA, playerB] = matchupC
      const userA = usersByUsername.get(playerA)
      const userB = usersByUsername.get(playerB)

      if (userA && userB) {
        longGameDocs.push(
          ...buildResolvedDecisionPair({
            round: roundTwo,
            userA,
            userB,
            choiceA: 'cooperate',
            choiceB: 'cooperate',
            createdAtA: new Date(`${roundTwo.startDate}T12:20:00.000Z`),
            createdAtB: new Date(`${roundTwo.startDate}T12:55:00.000Z`),
          }),
        )
      }
    }
  }

  if (longGameDocs.length > 0) {
    await LongGameDecision.insertMany(longGameDocs)
  }

  const leaderboard = await LongGameDecision.aggregate([
    {
      $group: {
        _id: '$username',
        longGamePoints: { $sum: '$awardedPoints' },
      },
    },
    {
      $sort: {
        longGamePoints: -1,
        _id: 1,
      },
    },
  ])

  console.log(`contestantsUpdated=${contestants.length}`)
  console.log(`judgeUpdated=${judge ? 1 : 0}`)
  console.log(`submissionsSeeded=${submissionDocs.length}`)
  console.log(`fundRequestsSeeded=${fundRequestDocs.length}`)
  console.log(`longGameChoicesSeeded=${longGameDocs.length}`)

  console.table(
    leaderboard.map((entry, index) => ({
      rank: index + 1,
      username: entry._id,
      longGamePoints: entry.longGamePoints,
    })),
  )

  await mongoose.disconnect()
}

seedMidGameData().catch(async (error) => {
  console.error('Failed to seed mid-game data', error)

  try {
    await mongoose.disconnect()
  } catch {
    // ignore disconnect errors during cleanup
  }

  process.exit(1)
})