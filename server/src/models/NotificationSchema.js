import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  notifications: [
    {
      title: { type: String, required: true },
      body: { type: String, required: true },
      recipients: [String],
    },
  ],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

export const NotificationSchemaModel = mongoose.model('NotificationSchema', NotificationSchema);
