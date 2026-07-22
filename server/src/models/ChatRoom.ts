import { Schema, model } from 'mongoose';

export interface IChatRoom {
  roomId: string;
  guestName: string;
  status: 'active' | 'closed';
  lastMessage: string;
  lastMessageAt: Date;
  unreadByAgent: number;
  createdAt: Date;
}

const chatRoomSchema = new Schema<IChatRoom>({
  roomId: { type: String, required: true, unique: true, index: true },
  guestName: { type: String, default: 'Khách hàng' },
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
  lastMessage: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now },
  unreadByAgent: { type: Number, default: 0 },
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }
});

export const ChatRoom = model<IChatRoom>('ChatRoom', chatRoomSchema);
