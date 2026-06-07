import { connectDatabase } from '../config/db.js'
import { User } from '../models/User.js'
import { Task } from '../models/Task.js'
import { LongGameDecision } from '../models/LongGameDecision.js'
import { PlayerNotification } from '../models/PlayerNotification.js'
import { PushSubscription } from '../models/PushSubscription.js'
import { Submission } from '../models/Submission.js'
import { FundRequest } from '../models/FundRequest.js'
import { NotificationSchemaModel } from '../models/NotificationSchema.js'

const OLD_USERNAME = 'maria'
const NEW_USERNAME = 'luke'
const NEW_DISPLAY_NAME = 'Luke'

async function run() {
  await connectDatabase()

  const mariaUser = await User.findOne({ username: OLD_USERNAME })
  let lukeUser = await User.findOne({ username: NEW_USERNAME })

  const summary = {
    users: {
      mariaFound: Boolean(mariaUser),
      lukeFound: Boolean(lukeUser),
      action: 'none',
    },
    updates: {},
  }

  if (mariaUser && !lukeUser) {
    await User.updateOne(
      { _id: mariaUser._id },
      { $set: { username: NEW_USERNAME, displayName: NEW_DISPLAY_NAME } },
    )

    lukeUser = await User.findById(mariaUser._id)
    summary.users.action = 'renamed-maria-user'
  }

  if (mariaUser && lukeUser && mariaUser._id.toString() !== lukeUser._id.toString()) {
    const tasksWithMariaUserId = await Task.find({ assignedUserIds: mariaUser._id }).select('_id')
    const taskIdsWithMariaUserId = tasksWithMariaUserId.map((task) => task._id)

    if (taskIdsWithMariaUserId.length > 0) {
      await Task.updateMany(
        { _id: { $in: taskIdsWithMariaUserId } },
        { $pull: { assignedUserIds: mariaUser._id } },
      )

      await Task.updateMany(
        { _id: { $in: taskIdsWithMariaUserId } },
        { $addToSet: { assignedUserIds: lukeUser._id } },
      )
    }

    const migrateUserRefs = await Promise.all([
      Submission.updateMany({ user: mariaUser._id }, { $set: { user: lukeUser._id } }),
      FundRequest.updateMany({ user: mariaUser._id }, { $set: { user: lukeUser._id } }),
      LongGameDecision.updateMany({ user: mariaUser._id }, { $set: { user: lukeUser._id } }),
      PlayerNotification.updateMany({ userId: mariaUser._id }, { $set: { userId: lukeUser._id } }),
      PushSubscription.updateMany({ userId: mariaUser._id }, { $set: { userId: lukeUser._id } }),
      Task.updateMany({ _id: { $in: taskIdsWithMariaUserId } }, { $set: { updatedAt: new Date() } }),
    ])

    const deleteResult = await User.deleteOne({ _id: mariaUser._id })
    summary.users.action = 'migrated-refs-and-deleted-maria-user'
    summary.updates.userReferenceMigrations = {
      submissions: migrateUserRefs[0].modifiedCount,
      fundRequests: migrateUserRefs[1].modifiedCount,
      longGameDecisions: migrateUserRefs[2].modifiedCount,
      playerNotifications: migrateUserRefs[3].modifiedCount,
      pushSubscriptions: migrateUserRefs[4].modifiedCount,
      taskAssignedUserIds: migrateUserRefs[5].modifiedCount,
      mariaUserDeleted: deleteResult.deletedCount,
    }
  }

  const tasksWithMariaUsername = await Task.find({ assignedUsernames: OLD_USERNAME }).select('_id')
  const taskIdsWithMariaUsername = tasksWithMariaUsername.map((task) => task._id)

  if (taskIdsWithMariaUsername.length > 0) {
    await Task.updateMany(
      { _id: { $in: taskIdsWithMariaUsername } },
      { $pull: { assignedUsernames: OLD_USERNAME } },
    )

    await Task.updateMany(
      { _id: { $in: taskIdsWithMariaUsername } },
      { $addToSet: { assignedUsernames: NEW_USERNAME } },
    )
  }

  const notificationSchemas = await NotificationSchemaModel.find({
    'notifications.recipients': OLD_USERNAME,
  })

  let notificationRecipientsUpdated = 0
  for (const schemaDoc of notificationSchemas) {
    let changed = false

    schemaDoc.notifications = schemaDoc.notifications.map((notification) => {
      const recipients = Array.isArray(notification.recipients) ? notification.recipients : []
      const replacedRecipients = [...new Set(recipients.map((recipient) => (recipient === OLD_USERNAME ? NEW_USERNAME : recipient)))]

      if (replacedRecipients.length !== recipients.length || replacedRecipients.some((value, index) => value !== recipients[index])) {
        changed = true
      }

      return {
        ...notification.toObject(),
        recipients: replacedRecipients,
      }
    })

    if (changed) {
      await schemaDoc.save()
      notificationRecipientsUpdated += 1
    }
  }

  const usernameUpdates = await Promise.all([
    LongGameDecision.updateMany(
      { username: OLD_USERNAME },
      { $set: { username: NEW_USERNAME } },
    ),
    LongGameDecision.updateMany(
      { opponentUsername: OLD_USERNAME },
      { $set: { opponentUsername: NEW_USERNAME } },
    ),
    PlayerNotification.updateMany(
      { username: OLD_USERNAME },
      { $set: { username: NEW_USERNAME } },
    ),
    PushSubscription.updateMany(
      { username: OLD_USERNAME },
      { $set: { username: NEW_USERNAME } },
    ),
  ])

  await User.updateOne(
    { username: NEW_USERNAME },
    { $set: { displayName: NEW_DISPLAY_NAME } },
  )

  const validation = {
    usersNamedMaria: await User.countDocuments({ username: OLD_USERNAME }),
    tasksWithMaria: await Task.countDocuments({ assignedUsernames: OLD_USERNAME }),
    longGameUsernameMaria: await LongGameDecision.countDocuments({ username: OLD_USERNAME }),
    longGameOpponentMaria: await LongGameDecision.countDocuments({ opponentUsername: OLD_USERNAME }),
    playerNotificationsMaria: await PlayerNotification.countDocuments({ username: OLD_USERNAME }),
    pushSubscriptionsMaria: await PushSubscription.countDocuments({ username: OLD_USERNAME }),
  }

  summary.updates.usernameFields = {
    taskAssignedUsernames: taskIdsWithMariaUsername.length,
    longGameUsername: usernameUpdates[0].modifiedCount,
    longGameOpponentUsername: usernameUpdates[1].modifiedCount,
    playerNotifications: usernameUpdates[2].modifiedCount,
    pushSubscriptions: usernameUpdates[3].modifiedCount,
    notificationRecipients: notificationRecipientsUpdated,
  }

  summary.validation = validation

  console.log(JSON.stringify(summary, null, 2))
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
