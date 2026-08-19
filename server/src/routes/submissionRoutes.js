import fs from 'fs/promises'
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { Submission } from '../models/Submission.js'
import { Task } from '../models/Task.js'
import { upload } from '../middleware/upload.js'
import {
  deleteSubmissionMediaItems,
  resolveSubmissionMediaUrl,
  uploadSubmissionFiles,
} from '../services/r2Service.js'

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

    const serializedSubmissions = await Promise.all(
      submissions.map((submission) => Submission.toClient(
        submission,
        { resolveMediaUrl: resolveSubmissionMediaUrl },
      )),
    )

    response.json({ submissions: serializedSubmissions })
  } catch (error) {
    next(error)
  }
})

submissionRoutes.post('/', upload.array('media', 10), async (request, response, next) => {
  const uploadedFiles = Array.isArray(request.files) ? request.files : []
  let storedMediaItems = []
  let submissionWasCreated = false

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

    storedMediaItems = await uploadSubmissionFiles(uploadedFiles, {
      userId: request.user._id,
      taskNumber,
    })

    if (storedMediaItems.some((item) => !item?.storageKey || !item?.type)) {
      const error = new Error('One or more uploaded files could not be processed. Please try again.')
      error.statusCode = 502
      throw error
    }

    await deleteUploadedFiles(uploadedFiles)

    const submission = await Submission.create({
      user: request.user._id,
      taskNumber,
      textBody,
      mediaItems: storedMediaItems,
      mediaUrl: null,
      mediaType: storedMediaItems[0]?.type ?? null,
      originalName: storedMediaItems[0]?.originalName ?? null,
    })
    submissionWasCreated = true

    await submission.populate('user')

    const submissionData = await Submission.toClient(
      submission,
      { resolveMediaUrl: resolveSubmissionMediaUrl },
    )

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

    if (!submissionWasCreated && storedMediaItems.length > 0) {
      try {
        await deleteSubmissionMediaItems(storedMediaItems)
      } catch (cleanupError) {
        console.error('Could not clean up R2 objects after submission failure.', cleanupError)
      }
    }

    return next(error)
  }
})

export default submissionRoutes
