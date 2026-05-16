import fs from 'fs/promises'
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { Submission } from '../models/Submission.js'
import { Task } from '../models/Task.js'
import { upload } from '../middleware/upload.js'
import { uploadSubmissionFiles } from '../services/cloudinaryService.js'

const submissionRoutes = Router()

function getTaskTypes(task) {
  if (Array.isArray(task?.taskTypes) && task.taskTypes.length > 0) {
    return task.taskTypes
  }

  return [task?.category ?? 'common']
}

function isAutocompleteTask(task) {
  return getTaskTypes(task).includes('autocomplete')
}

async function deleteUploadedFiles(files) {
  await Promise.all(
    files.map(async (file) => {
      try {
        await fs.unlink(file.path)
      } catch {
        // Ignore cleanup failures.
      }
    }),
  )
}

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
    const submissions = await Submission.find({ user: _request.user._id })
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
      await deleteUploadedFiles(uploadedFiles)
      return response.status(400).json({ message: 'Please provide a valid task number.' })
    }

    if (!hasMedia && !hasTextBody) {
      await deleteUploadedFiles(uploadedFiles)
      return response.status(400).json({
        message: 'Please attach a photo/video or enter a body of text before submitting.',
      })
    }

    const task = await Task.findOne({ taskNumber }).select('taskNumber title taskTypes category')

    if (!task) {
      await deleteUploadedFiles(uploadedFiles)
      return response.status(404).json({ message: 'Task not found for this submission.' })
    }

    const shouldMarkCompleted = request.body.markTaskCompleted === 'true' || isAutocompleteTask(task)

    const mediaItems = await uploadSubmissionFiles(uploadedFiles)

    if (mediaItems.some((item) => !item?.url || !item?.type)) {
      await deleteUploadedFiles(uploadedFiles)
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

    if (shouldMarkCompleted) {
      const completedTaskNumbers = new Set(request.user.completedTaskNumbers ?? [])
      completedTaskNumbers.add(taskNumber)
      request.user.completedTaskNumbers = [...completedTaskNumbers].sort((a, b) => a - b)
      await request.user.save()
    }

    return response.status(201).json({
      submission: submissionData,
      completedTaskNumbers: request.user.completedTaskNumbers ?? [],
      completionLocked: isAutocompleteTask(task) && (request.user.completedTaskNumbers ?? []).includes(taskNumber),
    })
  } catch (error) {
    await deleteUploadedFiles(uploadedFiles)
    return next(error)
  }
})

export default submissionRoutes
