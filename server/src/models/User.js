import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    contestantNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 99,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: true,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      default: null,
    },
    completedTaskNumbers: {
      type: [Number],
      default: [],
    },
    role: {
      type: String,
      enum: ['contestant', 'judge', 'tester'],
      default: 'contestant',
    },
  },
  {
    timestamps: true,
  },
)

userSchema.methods.toClient = function toClient() {
  return {
    id: this._id.toString(),
    username: this.username,
    displayName: this.displayName,
    contestantNumber: this.contestantNumber,
    contactEmail: this.contactEmail,
    completedTaskNumbers: this.completedTaskNumbers,
    mustChangePassword: this.mustChangePassword,
    role: this.role,
  }
}

export const User = mongoose.model('User', userSchema)
