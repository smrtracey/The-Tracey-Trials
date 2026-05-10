import { Router } from 'express'
import { longGameSchedule } from '../data/longGameSchedule.js'
import { requireAuth } from '../middleware/auth.js'
import { FundRequest } from '../models/FundRequest.js'
import { LongGameDecision } from '../models/LongGameDecision.js'
import { Submission } from '../models/Submission.js'
import { Task } from '../models/Task.js'
import { User } from '../models/User.js'
import { sendPushToAll } from '../services/pushService.js'
import { NotificationSchemaModel } from '../models/NotificationSchema.js'

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

// PATCH /api/judge/submissions/:id/done - mark submission as done/undone
judgeRoutes.patch('/submissions/:id/done', async (request, response, next) => {
  try {
    const { id } = request.params
    const { done } = request.body
    if (typeof done !== 'boolean') {
      return response.status(400).json({ message: 'Missing or invalid done value.' })
    }
    const submission = await Submission.findByIdAndUpdate(
      id,
      { done },
      { new: true }
    ).populate('user')
    if (!submission) {
      return response.status(404).json({ message: 'Submission not found.' })
    }
    return response.json({ submission: Submission.toClient(submission) })
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
      .select('roundNumber username opponentUsername matchupKey choice awardedPoints autoCooperate')
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
            autoCooperate: {},
          })
        }

        const matchup = matchupsByKey.get(key)
        matchup.choices[normalizedUsername] = decision.choice
        matchup.points[normalizedUsername] = decision.awardedPoints ?? null
        if (decision.autoCooperate) {
          if (!matchup.autoCooperate) matchup.autoCooperate = {}
          matchup.autoCooperate[normalizedUsername] = true
        }
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
      .select('username displayName contestantNumber completedTaskNumbers loginBonusPoints loginBonusRank')
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
        longGamePoints: (pointsLookup.get(contestant.username) ?? 0) + (contestant.loginBonusPoints ?? 0),
        completedTaskNumbers: contestant.completedTaskNumbers ?? [],
        loginBonusPoints: contestant.loginBonusPoints ?? 0,
        loginBonusRank: contestant.loginBonusRank ?? null,
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

judgeRoutes.get('/funds', async (_request, response, next) => {
  try {
    const requests = await FundRequest.find()
      .sort({ createdAt: -1 })
      .populate('user')

    return response.json({
      requests: requests.map((fundRequest) => FundRequest.toClient(fundRequest)),
    })
  } catch (error) {
    return next(error)
  }
})

judgeRoutes.patch('/funds/:id', async (request, response, next) => {
  try {
    const { id } = request.params
    const { status } = request.body

    if (!['pending', 'paid'].includes(status)) {
      return response.status(400).json({ message: 'Missing or invalid status value.' })
    }

    const fundRequest = await FundRequest.findByIdAndUpdate(
      id,
      {
        status,
        paidAt: status === 'paid' ? new Date() : null,
      },
      { new: true },
    ).populate('user')

    if (!fundRequest) {
      return response.status(404).json({ message: 'Fund request not found.' })
    }

    return response.json({
      request: FundRequest.toClient(fundRequest),
    })
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

// Notification Schema CRUD
// Get all schemas for this judge
judgeRoutes.get('/notification-schemas', async (request, response, next) => {
  try {
    const schemas = await NotificationSchemaModel.find({ createdBy: request.user._id })
      .sort({ createdAt: -1 })
      .lean();
    response.json({ schemas });
  } catch (error) {
    next(error);
  }
});

// Create or update a schema
judgeRoutes.post('/notification-schemas', async (request, response, next) => {
  try {
    const { name, notifications } = request.body;
    if (!name || !Array.isArray(notifications)) {
      return response.status(400).json({ message: 'Name and notifications are required.' });
    }
    let schema = await NotificationSchemaModel.findOneAndUpdate(
      { name, createdBy: request.user._id },
      { name, notifications, createdBy: request.user._id },
      { new: true, upsert: true }
    );
    response.json({ schema });
  } catch (error) {
    next(error);
  }
});

// Delete a schema
judgeRoutes.delete('/notification-schemas/:name', async (request, response, next) => {
  try {
    const { name } = request.params;
    await NotificationSchemaModel.deleteOne({ name, createdBy: request.user._id });
    response.json({ success: true });
  } catch (error) {
    next(error);
  }
})

export default judgeRoutes
