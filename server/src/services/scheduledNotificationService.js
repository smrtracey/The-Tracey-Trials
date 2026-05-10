import { NotificationSchemaModel } from '../models/NotificationSchema.js'
import { sendPushToUsernames } from './pushService.js'

const POLL_INTERVAL_MS = 30 * 1000

async function sendScheduledSchema(schema) {
  for (const notification of schema.notifications) {
    if (!notification?.title || !notification?.body) {
      continue
    }

    const recipients = Array.isArray(notification.recipients)
      ? notification.recipients.filter(Boolean)
      : []

    if (recipients.length === 0) {
      continue
    }

    await sendPushToUsernames(recipients, {
      title: notification.title,
      body: notification.body,
    })
  }
}

async function processDueScheduledNotifications() {
  const now = new Date()
  const dueSchemas = await NotificationSchemaModel.find({
    kind: 'scheduled',
    scheduledFor: { $lte: now },
    sentAt: null,
  }).lean()

  for (const schema of dueSchemas) {
    try {
      await sendScheduledSchema(schema)
      await NotificationSchemaModel.updateOne(
        { _id: schema._id, sentAt: null },
        { $set: { sentAt: new Date() } },
      )
    } catch (error) {
      console.error(`Failed to process scheduled notification set ${schema.name}`, error)
    }
  }
}

export function startScheduledNotificationProcessor() {
  const intervalId = setInterval(() => {
    processDueScheduledNotifications().catch((error) => {
      console.error('Scheduled notification processor tick failed', error)
    })
  }, POLL_INTERVAL_MS)

  if (typeof intervalId.unref === 'function') {
    intervalId.unref()
  }

  processDueScheduledNotifications().catch((error) => {
    console.error('Initial scheduled notification processing failed', error)
  })

  return intervalId
}