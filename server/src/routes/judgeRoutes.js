import { Router } from 'express'
import { longGameSchedule } from '../data/longGameSchedule.js'
import { requireAuth } from '../middleware/auth.js'
import { LongGameDecision } from '../models/LongGameDecision.js'
import { Submission } from '../models/Submission.js'
import { Task } from '../models/Task.js'
import { User } from '../models/User.js'
import { sendPushToAll } from '../services/pushService.js'

const judgeRoutes = Router()

function getMatchupKey(roundNumber, usernameA, usernameB) {
  const [firstPlayer, secondPlayer] = [usernameA, usernameB].map((value) => value.trim().toLowerCase()).sort()
  return `${roundNumber}:${firstPlayer}:${secondPlayer}`
}

judgeRoutes.use(requireAuth)
judgeRoutes.use((request, response, next) => {
  if (request.user.mustChangePassword) {
    return response.status(403).json({
      message: 'Please change your starter password before opening the judge dashboard.',
    })
  }

  if (request.user.role !== 'judge') {
    return response.status(403).json({
      message: 'Judge access is required for this resource.',
    })
  }

  return next()
})

judgeRoutes.get('/submissions', async (_request, response, next) => {
  try {
    const submissions = await Submission.find()
      .sort({ createdAt: -1 })
      .populate('user')

    return response.json({
      submissions: submissions.map((submission) => Submission.toClient(submission)),
    })
  } catch (error) {
    return next(error)
  }
})

judgeRoutes.get('/tasks', async (_request, response, next) => {
  try {
    const tasks = await Task.find({ isActive: true })
      .select('taskNumber title')
      .sort({ taskNumber: 1 })
      .lean()

    return response.json({
      tasks,
    })
  } catch (error) {
    return next(error)
  }
})

judgeRoutes.get('/long-game/rounds', async (_request, response, next) => {
  try {
    const allDecisions = await LongGameDecision.find()
      .select('roundNumber username opponentUsername matchupKey choice awardedPoints')
      .sort({ roundNumber: 1, createdAt: 1 })
      .lean()

    const decisionsByRound = new Map()

    for (const decision of allDecisions) {
      if (!decisionsByRound.has(decision.roundNumber)) {
        decisionsByRound.set(decision.roundNumber, [])
      }

      decisionsByRound.get(decision.roundNumber).push(decision)
    }

    const rounds = longGameSchedule.map((round) => {
      const roundDecisions = decisionsByRound.get(round.roundNumber) ?? []

      const matchupsByKey = new Map(
        round.matchups.map(([playerA, playerB]) => {
          const key = getMatchupKey(round.roundNumber, playerA, playerB)

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

      for (const decision of roundDecisions) {
        const normalizedUsername = decision.username?.trim().toLowerCase()
        const normalizedOpponent = decision.opponentUsername?.trim().toLowerCase()

        if (!normalizedUsername || !normalizedOpponent) {
          continue
        }

        const key = decision.matchupKey || getMatchupKey(round.roundNumber, normalizedUsername, normalizedOpponent)

        if (!matchupsByKey.has(key)) {
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

      return {
        roundNumber: round.roundNumber,
        startDate: round.startDate,
        endDate: round.endDate,
        byeUsername: round.byeUsername,
        matchups: [...matchupsByKey.values()],
      }
    })

    return response.json({ rounds })
  } catch (error) {
    return next(error)
  }
})

judgeRoutes.get('/leaderboard', async (_request, response, next) => {
  try {
    const contestants = await User.find({ role: 'contestant' })
      .select('username displayName contestantNumber')
      .sort({ contestantNumber: 1 })
      .lean()

    const pointsByUsername = await LongGameDecision.aggregate([
      {
        $match: {
          awardedPoints: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$username',
          longGamePoints: { $sum: '$awardedPoints' },
        },
      },
    ])

    const pointsLookup = new Map(pointsByUsername.map((entry) => [entry._id, entry.longGamePoints]))

    const leaderboard = contestants
      .map((contestant) => ({
        username: contestant.username,
        displayName: contestant.displayName,
        contestantNumber: contestant.contestantNumber,
        longGamePoints: pointsLookup.get(contestant.username) ?? 0,
      }))
      .sort((first, second) => {
        if (second.longGamePoints !== first.longGamePoints) {
          return second.longGamePoints - first.longGamePoints
        }

        return first.contestantNumber - second.contestantNumber
      })
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }))

    return response.json({ leaderboard })
  } catch (error) {
    return next(error)
  }
})

judgeRoutes.post('/push/send', async (request, response, next) => {
  const { title, body } = request.body

  if (!title || !body) {
    return response.status(400).json({ message: 'title and body are required.' })
  }

  try {
    const result = await sendPushToAll({ title, body })
    return response.json(result)
  } catch (error) {
    return next(error)
  }
})

judgeRoutes.post('/push/send', async (request, response, next) => {
  const { title, body } = request.body

  if (!title || !body) {
    return response.status(400).json({ message: 'title and body are required.' })
  }

  try {
    const result = await sendPushToAll({ title, body })
    return response.json(result)
  } catch (error) {
    return next(error)
  }
})

export default judgeRoutes
