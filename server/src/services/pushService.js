import webpush from 'web-push'
import { env } from '../config/env.js'
import { PushSubscription } from '../models/PushSubscription.js'

webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey)

/**
 * Send a push notification to all stored subscriptions.
 * Subscriptions that return 410 Gone are automatically removed.
 */
export async function sendPushToAll(payload) {
  const subscriptions = await PushSubscription.find().lean()

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 }
  }

  const payloadString = JSON.stringify(payload)
  let sent = 0
  let failed = 0

  await Promise.all(
    subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: sub.keys,
      }

      try {
        await webpush.sendNotification(pushSubscription, payloadString)
        sent++
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription is expired/invalid — remove it
          await PushSubscription.deleteOne({ _id: sub._id })
        }
        failed++
      }
    }),
  )

  return { sent, failed }
}
