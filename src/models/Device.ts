import mongoose, { Document, Schema } from 'mongoose';

export interface IDevice extends Document {
  userId: string;
  deviceToken: string;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema({
  userId: { type: String, required: true },
  deviceToken: { type: String, required: true, unique: true },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Add compound index for user devices to quickly find the most recently active devices per user
// The index is ordered by userId and lastActive (in descending order)
// This is useful for finding the most recently active devices for a user
DeviceSchema.index({ userId: 1, lastActive: -1 });

// Add TTL index for inactive devices (90 days)
DeviceSchema.index({ lastActive: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Update lastActive timestamp when device is used
DeviceSchema.methods.updateActivity = function() {
  this.lastActive = new Date();
  return this.save();
};

export default mongoose.model<IDevice>('Device', DeviceSchema);
