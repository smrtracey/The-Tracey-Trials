import mongoose from 'mongoose'
import { connectDatabase } from '../config/db.js'
import { longGameSchedule } from '../data/longGameSchedule.js'
import { LongGameDecision } from '../models/LongGameDecision.js'
import { Submission } from '../models/Submission.js'
import { Task } from '../models/Task.js'
import { User } from '../models/User.js'

const DAY_MS = 24 * 60 * 60 * 1000
const TIMELINE_START = new Date('2026-04-23T09:00:00.000Z')

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

function buildCompletedTasksForUser(user, assignedTasks) {
  const seed = hashString(user.username)

  const completed = assignedTasks
    .filter((task) => task.mandatory || ((task.taskNumber * 13 + seed) % 100 < 78))
    .map((task) => task.taskNumber)

  if (completed.length < 12) {
    for (const task of assignedTasks) {
      if (!completed.includes(task.taskNumber)) {
        completed.push(task.taskNumber)
      }

      if (completed.length >= 12) {
        break
      }
    }
  }

  return [...new Set(completed)].sort((a, b) => a - b)
}

function getMatchupKey(roundNumber, usernameA, usernameB) {
  const [firstPlayer, secondPlayer] = [usernameA, usernameB].map((value) => value.trim().toLowerCase()).sort()
  return `${roundNumber}:${firstPlayer}:${secondPlayer}`
}

function getLongGamePointsForChoices(choiceA, choiceB) {
  if (choiceA === 'cooperate' && choiceB === 'cooperate') {
    return { pointsA: 1, pointsB: 1 }
  }

  if (choiceA === 'betray' && choiceB === 'cooperate') {
    return { pointsA: 3, pointsB: 0 }
  }

  if (choiceA === 'cooperate' && choiceB === 'betray') {
    return { pointsA: 0, pointsB: 3 }
  }

  return { pointsA: 0, pointsB: 0 }
}

function getDeterministicChoice(seed) {
  return seed % 2 === 0 ? 'cooperate' : 'betray'
}

function buildSubmissionDocument({ user, task, repeatIndex, dayOffset }) {
  const roll = (user.contestantNumber + task.taskNumber + repeatIndex) % 4
  const mediaType = roll === 0 ? null : roll % 2 === 0 ? 'video' : 'image'
  const extension = mediaType === 'video' ? 'mp4' : 'jpg'
  const createdAt = new Date(TIMELINE_START.getTime() + dayOffset * DAY_MS + repeatIndex * 45 * 60 * 1000)

  return {
    user: user._id,
    taskNumber: task.taskNumber,
    caption: mediaType ? `${task.title} progress update` : '',
    textBody: `Late-stage seed entry for ${task.title} by ${user.displayName}.`,
    mediaUrl: mediaType ? `/uploads/mock-${user.username}-task-${task.taskNumber}-${repeatIndex + 1}.${extension}` : null,
    mediaType,
    originalName: mediaType ? `mock-${user.username}-${task.taskNumber}.${extension}` : null,
    createdAt,
    updatedAt: createdAt,
  }
}

async function seedLateStageData() {
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

  const userBulkOperations = []

  for (const contestant of contestants) {
    const assignedTasks = tasks.filter((task) => isTaskAssignedToUser(task, contestant.username))
    const completedTaskNumbers = buildCompletedTasksForUser(contestant, assignedTasks)

    userBulkOperations.push({
      updateOne: {
        filter: { _id: contestant._id },
        update: {
          $set: {
            completedTaskNumbers,
            mustChangePassword: false,
            passwordChangedAt: new Date('2026-05-01T10:00:00.000Z'),
            contactEmail: `${contestant.username}@example.com`,
          },
        },
      },
    })
  }

  if (judge) {
    userBulkOperations.push({
      updateOne: {
        filter: { _id: judge._id },
        update: {
          $set: {
            mustChangePassword: false,
            passwordChangedAt: new Date('2026-05-01T10:00:00.000Z'),
            contactEmail: 'mikaela@example.com',
          },
        },
      },
    })
  }

  if (userBulkOperations.length > 0) {
    await User.bulkWrite(userBulkOperations)
  }

  await Submission.deleteMany({})
  await LongGameDecision.deleteMany({})

  const submissionDocs = []

  for (const contestant of contestants) {
    const assignedTasks = tasks.filter((task) => isTaskAssignedToUser(task, contestant.username))
    const completedSet = new Set(buildCompletedTasksForUser(contestant, assignedTasks))

    for (const task of assignedTasks) {
      const taskSeed = hashString(`${contestant.username}:${task.taskNumber}`)
      const shouldInclude = completedSet.has(task.taskNumber) || taskSeed % 5 === 0

      if (!shouldInclude) {
        continue
      }

      const submissionCount = 1 + (taskSeed % 3 === 0 ? 1 : 0)
      const dayOffset = task.taskNumber * 6 + contestant.contestantNumber * 3

      for (let repeatIndex = 0; repeatIndex < submissionCount; repeatIndex += 1) {
        submissionDocs.push(
          buildSubmissionDocument({
            user: contestant,
            task,
            repeatIndex,
            dayOffset,
          }),
        )
      }
    }
  }

  if (submissionDocs.length > 0) {
    await Submission.insertMany(submissionDocs)
  }

  const longGameDocs = []

  for (const round of longGameSchedule) {
    const resolvedAt = new Date(`${round.endDate}T21:30:00.000Z`)

    for (const [playerA, playerB] of round.matchups) {
      const userA = usersByUsername.get(playerA)
      const userB = usersByUsername.get(playerB)

      if (!userA || !userB) {
        continue
      }

      const choiceA = getDeterministicChoice(hashString(`${round.roundNumber}:${playerA}:${playerB}`))
      const choiceB = getDeterministicChoice(hashString(`${round.roundNumber}:${playerB}:${playerA}`))
      const { pointsA, pointsB } = getLongGamePointsForChoices(choiceA, choiceB)
      const matchupKey = getMatchupKey(round.roundNumber, playerA, playerB)

      longGameDocs.push(
        {
          user: userA._id,
          roundNumber: round.roundNumber,
          username: playerA,
          opponentUsername: playerB,
          matchupKey,
          choice: choiceA,
          awardedPoints: pointsA,
          resolvedAt,
          createdAt: new Date(`${round.endDate}T20:10:00.000Z`),
          updatedAt: resolvedAt,
        },
        {
          user: userB._id,
          roundNumber: round.roundNumber,
          username: playerB,
          opponentUsername: playerA,
          matchupKey,
          choice: choiceB,
          awardedPoints: pointsB,
          resolvedAt,
          createdAt: new Date(`${round.endDate}T20:20:00.000Z`),
          updatedAt: resolvedAt,
        },
      )
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

seedLateStageData().catch(async (error) => {
  console.error('Failed to seed late-stage data', error)

  try {
    await mongoose.disconnect()
  } catch {
    // ignore disconnect errors during cleanup
  }

  process.exit(1)
})
