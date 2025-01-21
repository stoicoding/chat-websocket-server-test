import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  messageType: 'text' | 'system';  
}

const MessageSchema = new Schema({
  roomId: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  messageType: { type: String, enum: ['text', 'system'], default: 'text' }
}, {
  timestamps: true
});
// Compound index for efficient room message queries with timestamp
// This index is used when we want to fetch the latest messages in a room
// It allows us to quickly find the latest messages in a room, and
// then fetch the messages in the correct order
MessageSchema.index({ roomId: 1, timestamp: -1 }, { name: 'roomId_1_timestamp_-1' });

// Index for user message history queries
// This index is used when we want to fetch the message history of a user
// It allows us to quickly find all the messages sent by a user
MessageSchema.index({ senderId: 1, timestamp: -1 }, { name: 'senderId_1_timestamp_-1' });

// Create a compound index that includes messageType for filtering system messages
// This index is used when we want to fetch all the messages in a room
// that are not system messages
// It allows us to quickly find all non-system messages in a room, and
// then fetch the messages in the correct order
MessageSchema.index({ roomId: 1, messageType: 1, timestamp: -1 }, { name: 'roomId_1_messageType_1_timestamp_-1' });

export default mongoose.model<IMessage>('Message', MessageSchema);
