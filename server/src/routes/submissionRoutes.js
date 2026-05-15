import fs from 'fs/promises'
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { Submission } from '../models/Submission.js'
import { Task } from '../models/Task.js'
import { upload } from '../middleware/upload.js'
import { uploadSubmissionFiles } from '../services/cloudinaryService.js'

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

submissionRoutes.post('/', upload.array('media', 10), async (request, response, next) => {
  const uploadedFiles = Array.isArray(request.files) ? request.files : []

  try {
    const taskNumber = Number(request.body.taskNumber)
    const textBody = (request.body.textBody ?? '').trim()
    const hasMedia = uploadedFiles.length > 0
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

    const mediaItems = await uploadSubmissionFiles(uploadedFiles)

    if (mediaItems.some((item) => !item?.url || !item?.type)) {
      return response.status(502).json({
        message: 'One or more uploaded files could not be processed. Please try again.',
      })
    }

    const submission = await Submission.create({
      user: request.user._id,
      taskNumber,
      textBody,
      mediaItems,
      mediaUrl: mediaItems[0]?.url ?? null,
      mediaType: mediaItems[0]?.type ?? null,
      originalName: mediaItems[0]?.originalName ?? null,
    })

    await submission.populate('user')

    const submissionData = Submission.toClient(submission)

    return response.status(201).json({
      submission: submissionData,
    })
  } catch (error) {
    return next(error)
  } finally {
    await Promise.all(
      uploadedFiles.map(async (file) => {
        try {
          await fs.unlink(file.path)
        } catch {
          // Ignore temp-file cleanup failures.
        }
      }),
    )
  }
})

export default submissionRoutes
