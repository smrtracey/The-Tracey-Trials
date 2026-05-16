import mongoose from 'mongoose'

const LEGACY_TASK_CATEGORIES = ['common', 'race', 'individual', 'timed', 'special']

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
    taskSource: {
      type: String,
      enum: ['core', 'additional'],
      default: 'core',
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
    taskTypes: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      enum: LEGACY_TASK_CATEGORIES,
      default: 'common',
      required: true,
    },
    hasSubmission: {
      type: Boolean,
      default: true,
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

taskSchema.pre('validate', function syncTaskTypeFields(next) {
  const normalizedTaskTypes = [...new Set((this.taskTypes ?? []).map((value) => String(value).trim()).filter(Boolean))]

  if (normalizedTaskTypes.length === 0 && this.category) {
    normalizedTaskTypes.push(this.category)
  }

  if (normalizedTaskTypes.length > 0) {
    this.taskTypes = normalizedTaskTypes

    const legacyCategory =
      normalizedTaskTypes.find((value) => LEGACY_TASK_CATEGORIES.includes(value)) ??
      (LEGACY_TASK_CATEGORIES.includes(this.category) ? this.category : null)

    this.category = legacyCategory ?? 'common'
  }

  next()
})

export const Task = mongoose.model('Task', taskSchema)
