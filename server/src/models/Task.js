import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema(
  {
    taskNumber: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    goal: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    audience: {
      type: String,
      enum: ['all', 'selected'],
      default: 'all',
      required: true,
    },
    assignedUserIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    assignedUsernames: {
      type: [String],
      default: [],
    },
    hasTimeConstraint: {
      type: Boolean,
      default: false,
    },
    mandatory: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      enum: ['common', 'race', 'individual', 'timed', 'special'],
      default: 'common',
      required: true,
    },
    deadlineLabel: {
      type: String,
      default: '',
    },
    deadlineAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

export const Task = mongoose.model('Task', taskSchema)
