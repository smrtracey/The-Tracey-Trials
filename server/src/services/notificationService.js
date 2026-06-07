import { PlayerNotification } from '../models/PlayerNotification.js'
import { User } from '../models/User.js'
import { sendPushToUsernames } from './pushService.js'

function normalizeUsernames(usernames) {
  return [...new Set((Array.isArray(usernames) ? usernames : [])
    .map((username) => String(username).trim().toLowerCase())
    .filter(Boolean))]
}

export async function createNotificationsForUsernames(usernames, payload, options = {}) {
  const normalizedUsernames = normalizeUsernames(usernames)

  if (normalizedUsernames.length === 0) {
    return { recipientUsernames: [], notifications: [] }
  }

  const users = await User.find({ username: { $in: normalizedUsernames } })
    .select('_id username')
    .lean()

  if (users.length === 0) {
    return { recipientUsernames: [], notifications: [] }
  }

  const notifications = await PlayerNotification.insertMany(
    users.map((user) => ({
      userId: user._id,
      username: user.username,
      title: payload.title,
      body: payload.body,
      source: options.source ?? 'judge',
    })),
  )

  return {
    recipientUsernames: users.map((user) => user.username),
    notifications,
  }
}

export async function sendStoredNotificationToUsernames(usernames, payload, options = {}) {
  const { recipientUsernames, notifications } = await createNotificationsForUsernames(
    usernames,
    payload,
    options,
  )

  let pushResult = { sent: 0, failed: 0 }
  let pushError = null

  if (recipientUsernames.length > 0) {
    try {
      pushResult = await sendPushToUsernames(recipientUsernames, payload)
    } catch (error) {
      pushError = error
      pushResult = {
        sent: 0,
        failed: recipientUsernames.length,
      }
    }
  }

  return {
    notifications,
    recipientUsernames,
    pushResult,
    pushError,
  }
}