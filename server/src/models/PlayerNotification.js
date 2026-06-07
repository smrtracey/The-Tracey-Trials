import mongoose from 'mongoose'

const playerNotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      enum: ['judge', 'task', 'funds', 'scheduled', 'system'],
      default: 'judge',
    },
  },
  {
    timestamps: true,
  },
)

playerNotificationSchema.index({ userId: 1, createdAt: -1 })

playerNotificationSchema.methods.toClient = function toClient() {
  return {
    id: this._id.toString(),
    title: this.title,
    body: this.body,
    source: this.source,
    createdAt: this.createdAt,
  }
}

export const PlayerNotification = mongoose.model('PlayerNotification', playerNotificationSchema)