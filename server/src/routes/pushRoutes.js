import { Router } from 'express'
import { env } from '../config/env.js'
import { requireAuth } from '../middleware/auth.js'
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

export default pushRoutes
