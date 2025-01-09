import mongoose, { Document, Schema } from 'mongoose';

export interface IDevice extends Document {
  userId: string;
  deviceToken: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema({
  userId: { type: String, required: true },
  deviceToken: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

DeviceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IDevice>('Device', DeviceSchema);
