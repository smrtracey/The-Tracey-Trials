import mongoose from 'mongoose'

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
  },
  {
    timestamps: true,
  },
)

submissionSchema.statics.toClient = function toClient(submission) {
  return {
    id: submission._id.toString(),
    taskNumber: submission.taskNumber,
    caption: submission.caption,
    textBody: submission.textBody,
    mediaUrl: submission.mediaUrl,
    mediaType: submission.mediaType,
    createdAt: submission.createdAt,
    username: submission.user.username,
    displayName: submission.user.displayName,
    contestantNumber: submission.user.contestantNumber,
  }
}

export const Submission = mongoose.model('Submission', submissionSchema)
