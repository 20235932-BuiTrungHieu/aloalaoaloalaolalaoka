import { Request, Response } from 'express';
import { ChatRoom } from '../models/ChatRoom';
import { ChatMessage } from '../models/ChatMessage';

// GET /api/chat/rooms — Lấy danh sách phòng chat (cho Agent)
export const getRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await ChatRoom.find({ status: 'active' })
      .sort({ lastMessageAt: -1 });
    return res.status(200).json(rooms);
  } catch (error: any) {
    console.error('[Chat] getRooms error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/chat/rooms/:roomId/messages — Lấy lịch sử tin nhắn
export const getMessages = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const messages = await ChatMessage.find({ roomId })
      .sort({ timestamp: 1 })
      .limit(200);
    return res.status(200).json(messages);
  } catch (error: any) {
    console.error('[Chat] getMessages error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
