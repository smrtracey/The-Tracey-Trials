import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { Submission } from '../models/Submission.js'
import { Task } from '../models/Task.js'
import { sendSubmissionEmail } from '../services/submissionEmailService.js'
import { createToken } from '../utils/createToken.js'
import { requireAuth } from '../middleware/auth.js'
import { User } from '../models/User.js'

const authRoutes = Router()
const SHARED_SECRETS_TASK_NUMBER = 1

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
      mediaUrl: null,
      mediaType: null,
      originalName: null,
    })

    await submission.populate('user')

    try {
      await sendSubmissionEmail({
        submission: Submission.toClient(submission),
        user: submission.user,
        task,
        uploadedFile: null,
      })
    } catch (emailError) {
      console.error('Failed to send Shared Secrets auto-submission email.', emailError)
    }
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

    try {
      await bootstrapSharedSecretsForUser(user)
    } catch (bootstrapError) {
      console.error('Failed to bootstrap Shared Secrets completion for login.', bootstrapError)
    }

    return response.json({
      token: createToken(user),
      user: user.toClient(),
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
    const { newPassword = '', confirmPassword = '', contactEmail = '' } = request.body
    const normalizedEmail = contactEmail.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!request.user.mustChangePassword) {
      return response.status(400).json({
        message: 'Password setup has already been completed for this account.',
      })
    }

    if (!newPassword || !confirmPassword || !normalizedEmail) {
      return response.status(400).json({ message: 'Password fields and contact email are required.' })
    }

    if (!emailRegex.test(normalizedEmail)) {
      return response.status(400).json({ message: 'Please enter a valid email address.' })
    }

    const emailOwner = await User.findOne({ contactEmail: normalizedEmail, _id: { $ne: request.user._id } })

    if (emailOwner) {
      return response.status(409).json({ message: 'That email is already in use by another user.' })
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
    request.user.contactEmail = normalizedEmail
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
