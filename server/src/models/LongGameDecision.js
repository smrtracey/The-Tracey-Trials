import mongoose from 'mongoose'

const longGameDecisionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    roundNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    opponentUsername: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    matchupKey: {
      type: String,
      required: true,
      trim: true,
    },
    choice: {
      type: String,
      enum: ['cooperate', 'betray'],
      required: true,
    },
    awardedPoints: {
      type: Number,
      min: 0,
      max: 3,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

longGameDecisionSchema.index({ user: 1, roundNumber: 1 }, { unique: true })
longGameDecisionSchema.index({ roundNumber: 1, matchupKey: 1 })
longGameDecisionSchema.index({ roundNumber: 1, username: 1 })

export const LongGameDecision = mongoose.model('LongGameDecision', longGameDecisionSchema)
