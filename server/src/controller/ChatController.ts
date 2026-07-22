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

// GET /api/chat/rooms/:roomId/messages/new?after=<timestamp>
// Lấy tin nhắn mới sau một thời điểm (cho polling)
export const getNewMessages = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const after = req.query.after as string;

    const query: any = { roomId };
    if (after) {
      query.timestamp = { $gt: new Date(after) };
    }

    const messages = await ChatMessage.find(query)
      .sort({ timestamp: 1 })
      .limit(50);
    return res.status(200).json(messages);
  } catch (error: any) {
    console.error('[Chat] getNewMessages error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/chat/rooms/:roomId/messages — Gửi tin nhắn
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { text, sender, senderName } = req.body;

    if (!text || !sender) {
      return res.status(400).json({ error: 'Missing text or sender' });
    }

    // Lưu tin nhắn
    const message = await ChatMessage.create({
      roomId,
      sender,
      senderName: senderName || (sender === 'agent' ? 'Hỗ trợ viên' : 'Khách hàng'),
      text,
      timestamp: new Date(),
    });

    // Cập nhật room
    const updateData: any = {
      lastMessage: text,
      lastMessageAt: new Date(),
    };
    if (sender === 'guest') {
      updateData.$inc = { unreadByAgent: 1 };
    }

    await ChatRoom.findOneAndUpdate({ roomId }, updateData);

    return res.status(201).json(message);
  } catch (error: any) {
    console.error('[Chat] sendMessage error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// POST /api/chat/rooms — Tạo hoặc lấy room (Guest join)
export const joinRoom = async (req: Request, res: Response) => {
  try {
    const { roomId, guestName } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: 'Missing roomId' });
    }

    let room = await ChatRoom.findOne({ roomId });
    if (!room) {
      room = await ChatRoom.create({
        roomId,
        guestName: guestName || `Khách #${roomId.slice(0, 6)}`,
        status: 'active',
        lastMessage: '',
        lastMessageAt: new Date(),
        unreadByAgent: 0,
      });
    }

    // Lấy lịch sử tin nhắn
    const messages = await ChatMessage.find({ roomId })
      .sort({ timestamp: 1 })
      .limit(200);

    return res.status(200).json({ room, messages });
  } catch (error: any) {
    console.error('[Chat] joinRoom error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PUT /api/chat/rooms/:roomId/read — Đánh dấu đã đọc (cho Agent)
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    await ChatRoom.findOneAndUpdate({ roomId }, { unreadByAgent: 0 });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[Chat] markAsRead error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

// GET /api/chat/rooms/updates?after=<timestamp>
// Polling endpoint cho Agent — lấy rooms có cập nhật mới
export const getRoomUpdates = async (req: Request, res: Response) => {
  try {
    const after = req.query.after as string;
    const query: any = { status: 'active' };
    if (after) {
      query.lastMessageAt = { $gte: new Date(after) };
    }

    const rooms = await ChatRoom.find(query).sort({ lastMessageAt: -1 });
    return res.status(200).json(rooms);
  } catch (error: any) {
    console.error('[Chat] getRoomUpdates error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
