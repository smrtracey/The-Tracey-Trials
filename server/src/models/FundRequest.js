import mongoose from 'mongoose'

const fundRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

fundRequestSchema.statics.toClient = function toClient(fundRequest) {
  return {
    id: fundRequest._id.toString(),
    amount: fundRequest.amount,
    status: fundRequest.status,
    requestedAt: fundRequest.createdAt,
    paidAt: fundRequest.paidAt,
    username: fundRequest.user?.username,
    displayName: fundRequest.user?.displayName,
    contestantNumber: fundRequest.user?.contestantNumber,
  }
}

export const FundRequest = mongoose.model('FundRequest', fundRequestSchema)