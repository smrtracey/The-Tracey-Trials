import { Router } from 'express'
import { longGameSchedule } from '../data/longGameSchedule.js'
import { requireAuth } from '../middleware/auth.js'
import { FundRequest } from '../models/FundRequest.js'
import { LongGameDecision } from '../models/LongGameDecision.js'
import { Submission } from '../models/Submission.js'
import { Task } from '../models/Task.js'
import { User } from '../models/User.js'
import { sendPushToAll, sendPushToUsernames } from '../services/pushService.js'
import { NotificationSchemaModel } from '../models/NotificationSchema.js'

const judgeRoutes = Router()

function formatDeadlineLabel(deadlineAt) {
  return new Intl.DateTimeFormat('en-IE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Dublin',
  }).format(deadlineAt)
}

function normalizeJudgeTaskDraft(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const taskType = typeof body.taskType === 'string' ? body.taskType.trim() : ''
  const dueDate = typeof body.dueDate === 'string' ? body.dueDate.trim() : ''
  const audience = typeof body.audience === 'string' ? body.audience.trim() : 'all'
  const recipients = Array.isArray(body.recipients)
    ? [...new Set(body.recipients.map((value) => String(value).trim().toLowerCase()).filter(Boolean))]
    : []
  const notifyPlayers = Boolean(body.notifyPlayers)
  const notificationTitle = typeof body.notificationTitle === 'string' ? body.notificationTitle.trim() : ''
  const notificationBody = typeof body.notificationBody === 'string' ? body.notificationBody.trim() : ''

  if (!title) {
    return { error: 'Task title is required.' }
  }

  if (!description) {
    return { error: 'Task description is required.' }
  }

  if (!['race', 'timed', 'open'].includes(taskType)) {
    return { error: 'Task type must be race, timed, or open.' }
  }

  if (!['all', 'selected'].includes(audience)) {
    return { error: 'Audience must be all or selected.' }
  }

  if (audience === 'selected' && recipients.length === 0) {
    return { error: 'Select at least one player for a targeted task.' }
  }

  if (notifyPlayers && (!notificationTitle || !notificationBody)) {
    return { error: 'Push title and message are required when notifications are enabled.' }
  }

  if (taskType === 'timed') {
    if (!dueDate) {
      return { error: 'A due date is required for a timed task.' }
    }

    const deadlineAt = new Date(`${dueDate}T23:59:59.000Z`)

    if (Number.isNaN(deadlineAt.getTime())) {
      return { error: 'Due date is invalid.' }
    }

    return {
      value: {
        title,
        description,
        goal: title,
        audience,
        recipients,
        notifyPlayers,
        notificationTitle,
        notificationBody,
        category: 'timed',
        hasTimeConstraint: true,
        deadlineAt,
        deadlineLabel: formatDeadlineLabel(deadlineAt),
      },
    }
  }

  if (dueDate) {
    return { error: 'Only timed tasks can have a due date.' }
  }

  return {
    value: {
      title,
      description,
      goal: title,
      audience,
      recipients,
      notifyPlayers,
      notificationTitle,
      notificationBody,
      category: taskType === 'race' ? 'race' : 'common',
      hasTimeConstraint: false,
      deadlineAt: null,
      deadlineLabel: '',
    },
  }
}

function toJudgeTaskPayload(task) {
  return {
    id: task._id.toString(),
    taskNumber: task.taskNumber,
    title: task.title,
    taskSource: task.taskSource ?? 'core',
    audience: task.audience,
    assignedUsernames: task.assignedUsernames ?? [],
    category: task.category,
    deadlineLabel: task.deadlineLabel ?? '',
  }
}

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
      .select('taskNumber title taskSource audience assignedUsernames category deadlineLabel')
      .sort({ taskNumber: 1 })
      .lean()

    return response.json({
      tasks,
    })
  } catch (error) {
    return next(error)
  }
})

judgeRoutes.post('/tasks', async (request, response, next) => {
  try {
    const normalizedDraft = normalizeJudgeTaskDraft(request.body)

    if (normalizedDraft.error) {
      return response.status(400).json({ message: normalizedDraft.error })
    }

    const highestTask = await Task.findOne().sort({ taskNumber: -1 }).select('taskNumber').lean()
    const nextTaskNumber = (highestTask?.taskNumber ?? 0) + 1
    const recipientUsernames = normalizedDraft.value.recipients ?? []
    const assignedUsers =
      normalizedDraft.value.audience === 'selected'
        ? await User.find({
            role: 'contestant',
            username: { $in: recipientUsernames },
          })
            .select('_id username')
            .lean()
        : []

    if (normalizedDraft.value.audience === 'selected' && assignedUsers.length !== recipientUsernames.length) {
      return response.status(400).json({ message: 'One or more selected players could not be found.' })
    }

    const task = await Task.create({
      taskNumber: nextTaskNumber,
      audience: normalizedDraft.value.audience,
      assignedUserIds: assignedUsers.map((user) => user._id),
      assignedUsernames: assignedUsers.map((user) => user.username),
      taskSource: 'additional',
      mandatory: false,
      title: normalizedDraft.value.title,
      description: normalizedDraft.value.description,
      goal: normalizedDraft.value.goal,
      category: normalizedDraft.value.category,
      hasTimeConstraint: normalizedDraft.value.hasTimeConstraint,
      deadlineAt: normalizedDraft.value.deadlineAt,
      deadlineLabel: normalizedDraft.value.deadlineLabel,
    })

    let pushResult = null

    if (normalizedDraft.value.notifyPlayers) {
      const payload = {
        title: normalizedDraft.value.notificationTitle,
        body: normalizedDraft.value.notificationBody,
      }

      const contestantRecipients =
        normalizedDraft.value.audience === 'selected'
          ? assignedUsers.map((user) => user.username)
          : await User.find({ role: 'contestant' }).distinct('username')

      pushResult = await sendPushToUsernames(contestantRecipients, payload)
    }

    return response.status(201).json({
      task: toJudgeTaskPayload(task),
      pushResult,
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
      .select('username displayName contestantNumber completedTaskNumbers loginBonusPoints loginBonusRank judgeAdjustmentPoints')
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
        longGamePoints:
          (pointsLookup.get(contestant.username) ?? 0) +
          (contestant.loginBonusPoints ?? 0) +
          (contestant.judgeAdjustmentPoints ?? 0),
        completedTaskNumbers: contestant.completedTaskNumbers ?? [],
        loginBonusPoints: contestant.loginBonusPoints ?? 0,
        loginBonusRank: contestant.loginBonusRank ?? null,
        judgeAdjustmentPoints: contestant.judgeAdjustmentPoints ?? 0,
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

judgeRoutes.patch('/leaderboard/:username/points', async (request, response, next) => {
  const normalizedUsername = request.params.username?.trim().toLowerCase()
  const { judgeAdjustmentPoints } = request.body ?? {}

  if (!normalizedUsername) {
    return response.status(400).json({ message: 'A contestant username is required.' })
  }

  if (!Number.isInteger(judgeAdjustmentPoints)) {
    return response.status(400).json({ message: 'judgeAdjustmentPoints must be an integer.' })
  }

  try {
    const contestant = await User.findOneAndUpdate(
      { username: normalizedUsername, role: 'contestant' },
      { $set: { judgeAdjustmentPoints } },
      {
        new: true,
        runValidators: true,
      },
    ).select('username judgeAdjustmentPoints')

    if (!contestant) {
      return response.status(404).json({ message: 'Contestant not found.' })
    }

    return response.json({
      username: contestant.username,
      judgeAdjustmentPoints: contestant.judgeAdjustmentPoints ?? 0,
    })
  } catch (error) {
    return next(error)
  }
})

judgeRoutes.post('/push/send', async (request, response, next) => {
  const { title, body, recipients } = request.body

  if (!title || !body) {
    return response.status(400).json({ message: 'title and body are required.' })
  }

  try {
    const normalizedRecipients = Array.isArray(recipients)
      ? [...new Set(recipients.map((value) => String(value).trim().toLowerCase()).filter(Boolean))]
      : []

    const result = normalizedRecipients.length > 0
      ? await sendPushToUsernames(normalizedRecipients, { title, body })
      : await sendPushToAll({ title, body })
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
  const { title, body, recipients } = request.body

  if (!title || !body) {
    return response.status(400).json({ message: 'title and body are required.' })
  }

  try {
    const normalizedRecipients = Array.isArray(recipients)
      ? [...new Set(recipients.map((value) => String(value).trim().toLowerCase()).filter(Boolean))]
      : []

    const result = normalizedRecipients.length > 0
      ? await sendPushToUsernames(normalizedRecipients, { title, body })
      : await sendPushToAll({ title, body })
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
    const { name, notifications, kind = 'template', scheduledFor = null } = request.body;
    if (!name || !Array.isArray(notifications)) {
      return response.status(400).json({ message: 'Name and notifications are required.' });
    }
    if (!['template', 'scheduled'].includes(kind)) {
      return response.status(400).json({ message: 'Invalid notification schema kind.' });
    }
    if (kind === 'scheduled' && !scheduledFor) {
      return response.status(400).json({ message: 'scheduledFor is required for scheduled notification sets.' });
    }
    let schema = await NotificationSchemaModel.findOneAndUpdate(
      { name, createdBy: request.user._id },
      { name, notifications, kind, scheduledFor, createdBy: request.user._id },
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
