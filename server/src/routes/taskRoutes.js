import { Router } from 'express'
import { env } from '../config/env.js'
import { longGameSchedule } from '../data/longGameSchedule.js'
import { LongGameDecision } from '../models/LongGameDecision.js'
import { requireAuth } from '../middleware/auth.js'
import { Task } from '../models/Task.js'
import { User } from '../models/User.js'
import { resolveMatchupPoints } from '../services/longGameScoringService.js'

const taskRoutes = Router()

function getLongGameReferenceDate() {
  if (!env.longGameDateOverride) {
    return new Date()
  }

  const parsed = new Date(`${env.longGameDateOverride}T12:00:00.000Z`)

  if (Number.isNaN(parsed.getTime())) {
    return new Date()
  }

  return parsed
}

function getDateKeyInIreland(referenceDate = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Dublin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(referenceDate)
}

function getRoundStatus(dateKey, round) {
  if (dateKey < round.startDate) {
    return 'upcoming'
  }

  if (dateKey > round.endDate) {
    return 'completed'
  }

  return 'active'
}

function getRelevantRound(referenceDate = getLongGameReferenceDate()) {
  const dateKey = getDateKeyInIreland(referenceDate)
  const activeRound = longGameSchedule.find((round) => dateKey >= round.startDate && dateKey <= round.endDate)

  if (activeRound) {
    return activeRound
  }

  const upcomingRound = longGameSchedule.find((round) => dateKey < round.startDate)

  if (upcomingRound) {
    return upcomingRound
  }

  return longGameSchedule[longGameSchedule.length - 1] ?? null
}

function getRoundMatchupForUser(round, username) {
  const normalizedUsername = username.trim().toLowerCase()

  if (round.byeUsername === normalizedUsername) {
    return {
      isBye: true,
      opponentUsername: null,
    }
  }

  for (const [playerA, playerB] of round.matchups) {
    if (playerA === normalizedUsername) {
      return {
        isBye: false,
        opponentUsername: playerB,
      }
    }

    if (playerB === normalizedUsername) {
      return {
        isBye: false,
        opponentUsername: playerA,
      }
    }
  }

  return {
    isBye: false,
    opponentUsername: null,
  }
}

function getMatchupKey(roundNumber, usernameA, usernameB) {
  const [firstPlayer, secondPlayer] = [usernameA, usernameB].map((value) => value.trim().toLowerCase()).sort()

  return `${roundNumber}:${firstPlayer}:${secondPlayer}`
}

function assignedTaskFilterForUser(user) {
  return {
    $or: [
      { audience: 'all' },
      { assignedUserIds: user._id },
      { assignedUsernames: user.username },
    ],
    isActive: true,
  }
}

async function getAssignedTasksForUser(user) {
  return Task.find(assignedTaskFilterForUser(user)).sort({ taskNumber: 1 })
}

function toTaskPayload(task, completedTaskNumbers, displayNumber) {
  return {
    taskNumber: task.taskNumber,
    displayNumber,
    title: task.title,
    mandatory: Boolean(task.mandatory),
    category: task.category,
    goal: task.goal,
    description: task.description,
    hasTimeConstraint: task.hasTimeConstraint,
    deadlineLabel: task.deadlineLabel,
    isCompleted: completedTaskNumbers.includes(task.taskNumber),
  }
}

taskRoutes.use(requireAuth)

taskRoutes.use((request, response, next) => {
  if (request.user.mustChangePassword) {
    return response.status(403).json({
      message: 'Please change your starter password before updating completed tasks.',
    })
  }

  return next()
})

taskRoutes.get('/', async (request, response, next) => {
  try {
    const tasks = await getAssignedTasksForUser(request.user)

    const completedTaskNumbers = request.user.completedTaskNumbers ?? []

    response.json({
      completedTaskNumbers,
      tasks: tasks.map((task, index) => toTaskPayload(task, completedTaskNumbers, index + 1)),
    })
  } catch (error) {
    next(error)
  }
})

taskRoutes.get('/display/:displayNumber', async (request, response, next) => {
  try {
    const displayNumber = Number(request.params.displayNumber)

    if (!Number.isInteger(displayNumber) || displayNumber < 1) {
      return response.status(400).json({ message: 'Display number must be a whole number.' })
    }

    const tasks = await getAssignedTasksForUser(request.user)
    const task = tasks[displayNumber - 1]

    if (!task) {
      return response.status(404).json({ message: 'Task not found.' })
    }

    const completedTaskNumbers = request.user.completedTaskNumbers ?? []

    return response.json({
      task: toTaskPayload(task, completedTaskNumbers, displayNumber),
    })
  } catch (error) {
    return next(error)
  }
})

taskRoutes.get('/long-game/status', async (request, response, next) => {
  try {
    const round = getRelevantRound()

    if (!round) {
      return response.status(404).json({ message: 'Long Game schedule is not available.' })
    }

    const dateKey = getDateKeyInIreland()
    const matchup = getRoundMatchupForUser(round, request.user.username)
    const decision = await LongGameDecision.findOne({
      user: request.user._id,
      roundNumber: round.roundNumber,
    }).select('choice awardedPoints')

    const userPointsAggregate = await LongGameDecision.aggregate([
      {
        $match: {
          user: request.user._id,
          awardedPoints: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$awardedPoints' },
        },
      },
    ])

    const totalPoints = userPointsAggregate[0]?.totalPoints ?? 0

    let opponent = null

    if (matchup.opponentUsername) {
      const opponentUser = await User.findOne({ username: matchup.opponentUsername }).select('username displayName')

      opponent = opponentUser
        ? {
            username: opponentUser.username,
            displayName: opponentUser.displayName,
          }
        : {
            username: matchup.opponentUsername,
            displayName: matchup.opponentUsername,
          }
    }

    return response.json({
      longGame: {
        roundNumber: round.roundNumber,
        roundStatus: getRoundStatus(dateKey, round),
        startDate: round.startDate,
        endDate: round.endDate,
        isBye: matchup.isBye,
        opponent,
        currentChoice: decision?.choice ?? null,
        currentRoundPoints: decision?.awardedPoints ?? null,
        totalPoints,
      },
    })
  } catch (error) {
    return next(error)
  }
})

taskRoutes.post('/long-game/choice', async (request, response, next) => {
  try {
    const { choice } = request.body

    if (!['cooperate', 'betray'].includes(choice)) {
      return response.status(400).json({ message: 'Choice must be cooperate or betray.' })
    }

    const round = getRelevantRound()

    if (!round) {
      return response.status(404).json({ message: 'Long Game schedule is not available.' })
    }

    const matchup = getRoundMatchupForUser(round, request.user.username)

    if (matchup.isBye) {
      return response.status(400).json({ message: 'You have a bye this round and cannot submit a choice.' })
    }

    if (!matchup.opponentUsername) {
      return response.status(404).json({ message: 'No matchup found for your account this round.' })
    }

    const existingDecision = await LongGameDecision.findOne({
      user: request.user._id,
      roundNumber: round.roundNumber,
    }).select('_id')

    if (existingDecision) {
      return response.status(409).json({ message: 'You have already submitted your choice for this round.' })
    }

    const matchupKey = getMatchupKey(round.roundNumber, request.user.username, matchup.opponentUsername)

    const decision = await LongGameDecision.create({
      user: request.user._id,
      roundNumber: round.roundNumber,
      username: request.user.username,
      opponentUsername: matchup.opponentUsername,
      matchupKey,
      choice,
    })

    await resolveMatchupPoints(round.roundNumber, matchupKey)

    const savedDecision = await LongGameDecision.findById(decision._id).select('choice awardedPoints')

    return response.json({
      longGame: {
        roundNumber: round.roundNumber,
        choice: savedDecision?.choice ?? decision.choice,
        awardedPoints: savedDecision?.awardedPoints ?? null,
      },
    })
  } catch (error) {
    if (error?.code === 11000) {
      return response.status(409).json({ message: 'You have already submitted your choice for this round.' })
    }

    return next(error)
  }
})

taskRoutes.get('/long-game/round/:roundNumber/choices', async (request, response, next) => {
  try {
    const roundNumber = Number(request.params.roundNumber)

    if (!Number.isInteger(roundNumber) || roundNumber < 1) {
      return response.status(400).json({ message: 'Round number must be a whole number.' })
    }

    const round = longGameSchedule.find((item) => item.roundNumber === roundNumber)

    if (!round) {
      return response.status(404).json({ message: 'Round was not found in the Long Game schedule.' })
    }

    const decisions = await LongGameDecision.find({ roundNumber })
      .select('username opponentUsername matchupKey choice awardedPoints createdAt updatedAt')
      .sort({ createdAt: 1 })
      .lean()

    const matchupsByKey = new Map(
      round.matchups.map(([playerA, playerB]) => {
        const key = getMatchupKey(roundNumber, playerA, playerB)

        return [
          key,
          {
            matchupKey: key,
            players: [playerA, playerB],
            choices: {
              [playerA]: null,
              [playerB]: null,
            },
            points: {
              [playerA]: null,
              [playerB]: null,
            },
          },
        ]
      }),
    )

    for (const decision of decisions) {
      const normalizedUsername = decision.username?.trim().toLowerCase()
      const normalizedOpponent = decision.opponentUsername?.trim().toLowerCase()

      if (!normalizedUsername || !normalizedOpponent) {
        continue
      }

      const key = decision.matchupKey || getMatchupKey(roundNumber, normalizedUsername, normalizedOpponent)
      const existingMatchup = matchupsByKey.get(key)

      if (!existingMatchup) {
        matchupsByKey.set(key, {
          matchupKey: key,
          players: [normalizedUsername, normalizedOpponent],
          choices: {
            [normalizedUsername]: null,
            [normalizedOpponent]: null,
          },
          points: {
            [normalizedUsername]: null,
            [normalizedOpponent]: null,
          },
        })
      }

      const matchup = matchupsByKey.get(key)
      matchup.choices[normalizedUsername] = decision.choice
      matchup.points[normalizedUsername] = decision.awardedPoints ?? null
    }

    return response.json({
      roundNumber,
      matchups: [...matchupsByKey.values()],
    })
  } catch (error) {
    return next(error)
  }
})

taskRoutes.get('/:taskNumber', async (request, response, next) => {
  try {
    const taskNumber = Number(request.params.taskNumber)

    if (!Number.isInteger(taskNumber)) {
      return response.status(400).json({ message: 'Task number must be a whole number.' })
    }

    const tasks = await getAssignedTasksForUser(request.user)
    const task = tasks.find((assignedTask) => assignedTask.taskNumber === taskNumber)

    if (!task) {
      return response.status(404).json({ message: 'Task not found.' })
    }

    const completedTaskNumbers = request.user.completedTaskNumbers ?? []
    const displayNumber = tasks.findIndex((assignedTask) => assignedTask.taskNumber === taskNumber) + 1

    return response.json({
      task: toTaskPayload(task, completedTaskNumbers, displayNumber),
    })
  } catch (error) {
    return next(error)
  }
})

taskRoutes.patch('/:taskNumber/completion', async (request, response, next) => {
  try {
    const taskNumber = Number(request.params.taskNumber)
    const { isCompleted } = request.body

    if (!Number.isInteger(taskNumber)) {
      return response.status(400).json({ message: 'Task number must be a whole number.' })
    }

    if (typeof isCompleted !== 'boolean') {
      return response.status(400).json({ message: 'isCompleted must be a boolean.' })
    }

    const task = await Task.findOne({
      ...assignedTaskFilterForUser(request.user),
      taskNumber,
    }).select('taskNumber')

    if (!task) {
      return response.status(404).json({ message: 'Task not found.' })
    }

    const completedTaskNumbers = new Set(request.user.completedTaskNumbers ?? [])

    if (isCompleted) {
      completedTaskNumbers.add(taskNumber)
    } else {
      completedTaskNumbers.delete(taskNumber)
    }

    request.user.completedTaskNumbers = [...completedTaskNumbers].sort((a, b) => a - b)
    await request.user.save()

    return response.json({
      taskNumber,
      isCompleted,
      completedTaskNumbers: request.user.completedTaskNumbers,
      user: request.user.toClient(),
    })
  } catch (error) {
    return next(error)
  }
})

taskRoutes.put('/', async (request, response, next) => {
  try {
    const { completedTaskNumbers } = request.body

    if (!Array.isArray(completedTaskNumbers)) {
      return response.status(400).json({ message: 'completedTaskNumbers must be an array.' })
    }

    const normalized = [...new Set(completedTaskNumbers.map(Number))].sort((a, b) => a - b)

    const assignedTasks = await Task.find(assignedTaskFilterForUser(request.user)).select('taskNumber')

    const allowedTaskNumbers = new Set(assignedTasks.map((task) => task.taskNumber))

    const hasInvalidTaskNumber = normalized.some(
      (taskNumber) => !Number.isInteger(taskNumber) || !allowedTaskNumbers.has(taskNumber),
    )

    if (hasInvalidTaskNumber) {
      return response.status(400).json({
        message: 'Completed task list includes a task not assigned to this user.',
      })
    }

    request.user.completedTaskNumbers = normalized
    await request.user.save()

    return response.json({
      completedTaskNumbers: request.user.completedTaskNumbers,
      user: request.user.toClient(),
    })
  } catch (error) {
    return next(error)
  }
})

export default taskRoutes
