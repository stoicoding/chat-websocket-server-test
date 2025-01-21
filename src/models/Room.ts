import mongoose, { Document, Schema } from 'mongoose';

export interface IRoom extends Document {
  roomId: string;
  name: string;
  participants: string[];
  lastMessageAt: Date;
  messageCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema({
  roomId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  participants: [{ type: String }],
  lastMessageAt: { type: Date, default: Date.now },
  messageCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Update room stats when a new message is added
RoomSchema.methods.incrementMessageCount = async function() {
  this.lastMessageAt = new Date();
  this.messageCount += 1;
  return this.save();
};

// Compound index for active rooms with recent messages
RoomSchema.index({ isActive: 1, lastMessageAt: -1 });

// Index for participant room lookup
RoomSchema.index({ participants: 1, isActive: 1 });

// Index for room stats
RoomSchema.index({ messageCount: -1, lastMessageAt: -1 });

export default mongoose.model<IRoom>('Room', RoomSchema);
