import { Router } from 'express'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { requireAuth } from '../middleware/auth.js'
import { PlayerNotification } from '../models/PlayerNotification.js'
import { PushSubscription } from '../models/PushSubscription.js'

const pushRoutes = Router()

pushRoutes.get('/vapid-public-key', (_request, response) => {
  response.json({ vapidPublicKey: env.vapidPublicKey })
})

pushRoutes.post('/subscribe', requireAuth, async (request, response, next) => {
  const { endpoint, keys } = request.body

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return response.status(400).json({ message: 'Invalid push subscription object.' })
  }

  try {
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: request.user._id,
        username: request.user.username,
        endpoint,
        keys,
      },
      { upsert: true, new: true },
    )

    return response.status(201).json({ message: 'Subscribed.' })
  } catch (error) {
    return next(error)
  }
})

pushRoutes.delete('/subscribe', requireAuth, async (request, response, next) => {
  const { endpoint } = request.body

  if (!endpoint) {
    return response.status(400).json({ message: 'endpoint is required.' })
  }

  try {
    await PushSubscription.deleteOne({ endpoint, userId: request.user._id })
    return response.json({ message: 'Unsubscribed.' })
  } catch (error) {
    return next(error)
  }
})

pushRoutes.get('/notifications', requireAuth, async (request, response, next) => {
  try {
    const notifications = await PlayerNotification.find({ userId: request.user._id })
      .sort({ createdAt: -1 })
      .limit(100)

    return response.json({
      notifications: notifications.map((notification) => notification.toClient()),
    })
  } catch (error) {
    return next(error)
  }
})

pushRoutes.delete('/notifications/:notificationId', requireAuth, async (request, response, next) => {
  const { notificationId } = request.params

  if (!mongoose.isValidObjectId(notificationId)) {
    return response.status(400).json({ message: 'A valid notification id is required.' })
  }

  try {
    const notification = await PlayerNotification.findOneAndDelete({
      _id: notificationId,
      userId: request.user._id,
    })

    if (!notification) {
      return response.status(404).json({ message: 'Notification not found.' })
    }

    return response.json({ success: true })
  } catch (error) {
    return next(error)
  }
})

pushRoutes.delete('/notifications', requireAuth, async (request, response, next) => {
  try {
    const result = await PlayerNotification.deleteMany({ userId: request.user._id })

    return response.json({
      success: true,
      deletedCount: result.deletedCount ?? 0,
    })
  } catch (error) {
    return next(error)
  }
})

export default pushRoutes
