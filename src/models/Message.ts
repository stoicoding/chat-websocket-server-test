import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

const MessageSchema = new Schema({
  roomId: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Add indexes for faster querying
MessageSchema.index({ roomId: 1, timestamp: -1 });
MessageSchema.index({ senderId: 1 });

export default mongoose.model<IMessage>('Message', MessageSchema);
