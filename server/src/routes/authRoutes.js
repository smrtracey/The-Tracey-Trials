import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { Submission } from '../models/Submission.js'
import { Task } from '../models/Task.js'
import { createToken } from '../utils/createToken.js'
import { requireAuth } from '../middleware/auth.js'
import { User } from '../models/User.js'

const authRoutes = Router()
const SHARED_SECRETS_TASK_NUMBER = 1
const LOGIN_BONUS_BY_RANK = new Map([
  [1, 5],
  [2, 3],
  [3, 2],
])

function bootstrapSharedSecretsInBackground(user) {
  void bootstrapSharedSecretsForUser(user).catch((bootstrapError) => {
    console.error('Failed to bootstrap Shared Secrets completion for login.', bootstrapError)
  })
}

function isDuplicateKeyError(error) {
  return error?.name === 'MongoServerError' && error?.code === 11000
}

async function awardLoginBonusForUser(user) {
  if (user.role !== 'contestant' || user.loginBonusRank) {
    return user
  }

  for (const [rank, points] of LOGIN_BONUS_BY_RANK) {
    try {
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: user._id,
          role: 'contestant',
          loginBonusRank: null,
        },
        {
          $set: {
            loginBonusRank: rank,
            loginBonusPoints: points,
            loginBonusAwardedAt: new Date(),
          },
        },
        {
          new: true,
        },
      )

      if (updatedUser) {
        return updatedUser
      }

      return (await User.findById(user._id)) ?? user
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        continue
      }

      throw error
    }
  }

  return (await User.findById(user._id)) ?? user
}

async function bootstrapSharedSecretsForUser(user) {
  if (user.role !== 'contestant') {
    return
  }

  const existingSubmission = await Submission.findOne({
    user: user._id,
    taskNumber: SHARED_SECRETS_TASK_NUMBER,
  }).select('_id')

  const hasCompletedSharedSecrets = (user.completedTaskNumbers ?? []).includes(SHARED_SECRETS_TASK_NUMBER)
  const task = await Task.findOne({ taskNumber: SHARED_SECRETS_TASK_NUMBER }).select('taskNumber title')

  if (!existingSubmission && task) {
    const submission = await Submission.create({
      user: user._id,
      taskNumber: SHARED_SECRETS_TASK_NUMBER,
      textBody: 'Automatic submission: contestant logged in and unlocked the homepage.',
      mediaItems: [],
      mediaUrl: null,
      mediaType: null,
      originalName: null,
    })

    await submission.populate('user')
  }

  if (!hasCompletedSharedSecrets) {
    user.completedTaskNumbers = [...new Set([...(user.completedTaskNumbers ?? []), SHARED_SECRETS_TASK_NUMBER])].sort(
      (a, b) => a - b,
    )
    await user.save()
  }
}

authRoutes.post('/login', async (request, response, next) => {
  try {
    const { username = '', password = '' } = request.body
    const normalizedUsername = username.trim().toLowerCase()

    if (!normalizedUsername || !password) {
      return response.status(400).json({ message: 'Username and password are required.' })
    }

    const user = await User.findOne({ username: normalizedUsername })

    if (!user) {
      return response.status(401).json({ message: 'Incorrect username or password.' })
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash)

    if (!passwordMatches) {
      return response.status(401).json({ message: 'Incorrect username or password.' })
    }

    let authenticatedUser = user

    try {
      authenticatedUser = await awardLoginBonusForUser(authenticatedUser)
    } catch (loginBonusError) {
      console.error('Failed to award first-login bonus.', loginBonusError)
    }

    bootstrapSharedSecretsInBackground(authenticatedUser)

    return response.json({
      token: createToken(authenticatedUser),
      user: authenticatedUser.toClient(),
    })
  } catch (error) {
    return next(error)
  }
})

authRoutes.get('/me', requireAuth, (request, response) => {
  response.json({ user: request.user.toClient() })
})

authRoutes.post('/change-password', requireAuth, async (request, response, next) => {
  try {
    const { newPassword = '', confirmPassword = '' } = request.body

    if (!request.user.mustChangePassword) {
      return response.status(400).json({
        message: 'Password setup has already been completed for this account.',
      })
    }

    if (!newPassword || !confirmPassword) {
      return response.status(400).json({ message: 'New password and confirmation are required.' })
    }

    if (newPassword.length < 8) {
      return response.status(400).json({ message: 'New password must be at least 8 characters.' })
    }

    if (newPassword !== confirmPassword) {
      return response.status(400).json({ message: 'New password and confirmation do not match.' })
    }

    request.user.passwordHash = await bcrypt.hash(newPassword, 10)
    request.user.mustChangePassword = false
    request.user.passwordChangedAt = new Date()
    await request.user.save()

    return response.json({
      message: 'Password updated successfully.',
      user: request.user.toClient(),
    })
  } catch (error) {
    return next(error)
  }
})

export default authRoutes
