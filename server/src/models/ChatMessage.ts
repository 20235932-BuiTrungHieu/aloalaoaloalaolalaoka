import { Schema, model } from 'mongoose';

export interface IChatMessage {
  roomId: string;
  sender: 'guest' | 'agent';
  senderName: string;
  text: string;
  timestamp: Date;
}

const chatMessageSchema = new Schema<IChatMessage>({
  roomId: { type: String, required: true, index: true },
  sender: { type: String, enum: ['guest', 'agent'], required: true },
  senderName: { type: String, default: '' },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Compound index for efficient room + time queries
chatMessageSchema.index({ roomId: 1, timestamp: 1 });

export const ChatMessage = model<IChatMessage>('ChatMessage', chatMessageSchema);
