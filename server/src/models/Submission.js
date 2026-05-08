import mongoose from 'mongoose'

const submissionMediaSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    originalName: {
      type: String,
      default: '',
    },
  },
  { _id: false },
)

function normalizeMediaItems(submission) {
  if (Array.isArray(submission.mediaItems) && submission.mediaItems.length > 0) {
    return submission.mediaItems.map((item) => ({
      url: item.url,
      type: item.type,
      originalName: item.originalName ?? '',
    }))
  }

  if (submission.mediaUrl && submission.mediaType) {
    return [
      {
        url: submission.mediaUrl,
        type: submission.mediaType,
        originalName: submission.originalName ?? '',
      },
    ]
  }

  return []
}

const submissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    taskNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 180,
      default: '',
    },
    textBody: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: '',
    },
    mediaItems: {
      type: [submissionMediaSchema],
      default: [],
    },
    mediaUrl: {
      type: String,
      default: null,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video', null],
      default: null,
    },
    originalName: {
      type: String,
      default: null,
    },
    done: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

submissionSchema.statics.toClient = function toClient(submission) {
  const mediaItems = normalizeMediaItems(submission)

  return {
    id: submission._id.toString(),
    taskNumber: submission.taskNumber,
    caption: submission.caption,
    textBody: submission.textBody,
    mediaItems,
    mediaUrl: mediaItems[0]?.url ?? null,
    mediaType: mediaItems[0]?.type ?? null,
    createdAt: submission.createdAt,
    username: submission.user.username,
    displayName: submission.user.displayName,
    contestantNumber: submission.user.contestantNumber,
    done: submission.done ?? false,
  }
}

export const Submission = mongoose.model('Submission', submissionSchema)
