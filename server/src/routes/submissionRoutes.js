import path from 'path'
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { Submission } from '../models/Submission.js'
import { Task } from '../models/Task.js'
import { upload } from '../middleware/upload.js'
import { sendSubmissionEmail } from '../services/submissionEmailService.js'

const submissionRoutes = Router()

submissionRoutes.use(requireAuth)
submissionRoutes.use((request, response, next) => {
  if (request.user.mustChangePassword) {
    return response.status(403).json({
      message: 'Please change your starter password before submitting tasks.',
    })
  }

  return next()
})

submissionRoutes.get('/', async (_request, response, next) => {
  try {
    const submissions = await Submission.find()
      .sort({ createdAt: -1 })
      .limit(24)
      .populate('user')

    response.json({
      submissions: submissions.map((submission) => Submission.toClient(submission)),
    })
  } catch (error) {
    next(error)
  }
})

submissionRoutes.post('/', upload.single('media'), async (request, response, next) => {
  try {
    const taskNumber = Number(request.body.taskNumber)
    const textBody = (request.body.textBody ?? '').trim()
    const hasMedia = Boolean(request.file)
    const hasTextBody = Boolean(textBody)

    if (!Number.isInteger(taskNumber) || taskNumber < 1) {
      return response.status(400).json({ message: 'Please provide a valid task number.' })
    }

    if (!hasMedia && !hasTextBody) {
      return response.status(400).json({
        message: 'Please attach a photo/video or enter a body of text before submitting.',
      })
    }

    const task = await Task.findOne({ taskNumber }).select('taskNumber title')

    if (!task) {
      return response.status(404).json({ message: 'Task not found for this submission.' })
    }

    const mediaUrl = hasMedia ? `/uploads/${path.basename(request.file.path)}` : null
    const mediaType = hasMedia
      ? request.file.mimetype.startsWith('video/')
        ? 'video'
        : 'image'
      : null

    const submission = await Submission.create({
      user: request.user._id,
      taskNumber,
      textBody,
      mediaUrl,
      mediaType,
      originalName: hasMedia ? request.file.originalname : null,
    })

    await submission.populate('user')

    try {
      await sendSubmissionEmail({
        submission: Submission.toClient(submission),
        user: submission.user,
        task,
        uploadedFile: request.file,
      })
    } catch (emailError) {
      console.error('Failed to send submission email notification.', emailError)
    }

    return response.status(201).json({
      submission: Submission.toClient(submission),
    })
  } catch (error) {
    return next(error)
  }
})

export default submissionRoutes
