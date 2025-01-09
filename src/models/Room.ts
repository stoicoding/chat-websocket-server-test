import mongoose, { Document, Schema } from 'mongoose';

export interface IRoom extends Document {
  roomId: string;
  name: string;
  participants: string[];
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema({
  roomId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  participants: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp on save
RoomSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for faster querying
RoomSchema.index({ roomId: 1 });
RoomSchema.index({ participants: 1 });

export default mongoose.model<IRoom>('Room', RoomSchema);
