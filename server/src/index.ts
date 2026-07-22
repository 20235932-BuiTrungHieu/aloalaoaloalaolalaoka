import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import dns from 'dns';

import webhookRoutes from './routes/webhookRoutes';
import transactionRoutes from './routes/transactionRoutes';
import chatRoutes from './routes/chatRoutes';
import { ChatRoom } from './models/ChatRoom';
import { ChatMessage } from './models/ChatMessage';

dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sepay-test';

// Create HTTP server for both Express & Socket.IO
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get('/', (req: Request, res: Response) => {
  res.send('SePay MERN Server Running');
});

// Export app for Vercel
export default app;

if (process.env.NODE_ENV === 'production') {
  app.use(async (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
      try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB Atlas');
      } catch (err) {
        return res.status(500).send("Database connection error");
      }
    }
    next();
  });
}

// 2. Sau đó mới đến các Routes
app.use('/api/webhook', webhookRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/chat', chatRoutes);

// =============================================
// Socket.IO — Realtime Chat Logic
// =============================================
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // ----- GUEST EVENTS -----

  // Guest tham gia / tạo room
  socket.on('guest:join', async (data: { roomId: string; guestName?: string }) => {
    try {
      const { roomId, guestName } = data;
      socket.join(roomId);
      console.log(`[Socket.IO] Guest joined room: ${roomId}`);

      // Tìm hoặc tạo room
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

        // Thông báo tất cả agents có room mới
        io.emit('new_room', {
          roomId: room.roomId,
          guestName: room.guestName,
          status: room.status,
          lastMessage: room.lastMessage,
          lastMessageAt: room.lastMessageAt,
          unreadByAgent: room.unreadByAgent,
          createdAt: room.createdAt,
        });
      }

      // Gửi lịch sử tin nhắn cho guest
      const messages = await ChatMessage.find({ roomId }).sort({ timestamp: 1 }).limit(200);
      socket.emit('chat:history', messages);
    } catch (error) {
      console.error('[Socket.IO] guest:join error:', error);
    }
  });

  // Guest gửi tin nhắn
  socket.on('guest:send_message', async (data: {
    roomId: string;
    text: string;
    senderName?: string;
  }) => {
    try {
      const { roomId, text, senderName } = data;

      // Lưu tin nhắn vào DB
      const message = await ChatMessage.create({
        roomId,
        sender: 'guest',
        senderName: senderName || 'Khách hàng',
        text,
        timestamp: new Date(),
      });

      // Cập nhật room
      await ChatRoom.findOneAndUpdate(
        { roomId },
        {
          lastMessage: text,
          lastMessageAt: new Date(),
          $inc: { unreadByAgent: 1 },
        }
      );

      // Broadcast tin nhắn tới tất cả trong room (bao gồm cả agent)
      io.to(roomId).emit('chat:new_message', {
        _id: message._id,
        roomId: message.roomId,
        sender: message.sender,
        senderName: message.senderName,
        text: message.text,
        timestamp: message.timestamp,
      });

      // Cập nhật sidebar cho agent
      const updatedRoom = await ChatRoom.findOne({ roomId });
      if (updatedRoom) {
        io.emit('room_updated', {
          roomId: updatedRoom.roomId,
          guestName: updatedRoom.guestName,
          lastMessage: updatedRoom.lastMessage,
          lastMessageAt: updatedRoom.lastMessageAt,
          unreadByAgent: updatedRoom.unreadByAgent,
          status: updatedRoom.status,
        });
      }
    } catch (error) {
      console.error('[Socket.IO] guest:send_message error:', error);
    }
  });

  // Guest typing indicator
  socket.on('guest:typing', (data: { roomId: string }) => {
    socket.to(data.roomId).emit('chat:typing', { roomId: data.roomId, sender: 'guest' });
  });

  socket.on('guest:stop_typing', (data: { roomId: string }) => {
    socket.to(data.roomId).emit('chat:stop_typing', { roomId: data.roomId, sender: 'guest' });
  });

  // ----- AGENT EVENTS -----

  // Agent tham gia — subscribe to all active rooms
  socket.on('agent:join', async () => {
    try {
      console.log(`[Socket.IO] Agent connected: ${socket.id}`);

      // Lấy tất cả room active
      const rooms = await ChatRoom.find({ status: 'active' }).sort({ lastMessageAt: -1 });

      // Agent join tất cả rooms để nhận tin nhắn
      for (const room of rooms) {
        socket.join(room.roomId);
      }

      // Gửi danh sách rooms cho agent
      socket.emit('agent:rooms', rooms);
    } catch (error) {
      console.error('[Socket.IO] agent:join error:', error);
    }
  });

  // Agent chọn xem một room cụ thể
  socket.on('agent:join_room', async (data: { roomId: string }) => {
    try {
      const { roomId } = data;
      socket.join(roomId);

      // Reset unread count
      await ChatRoom.findOneAndUpdate({ roomId }, { unreadByAgent: 0 });

      // Gửi lịch sử tin nhắn
      const messages = await ChatMessage.find({ roomId }).sort({ timestamp: 1 }).limit(200);
      socket.emit('chat:history', messages);

      // Emit updated room to all agents
      const updatedRoom = await ChatRoom.findOne({ roomId });
      if (updatedRoom) {
        io.emit('room_updated', {
          roomId: updatedRoom.roomId,
          guestName: updatedRoom.guestName,
          lastMessage: updatedRoom.lastMessage,
          lastMessageAt: updatedRoom.lastMessageAt,
          unreadByAgent: 0,
          status: updatedRoom.status,
        });
      }
    } catch (error) {
      console.error('[Socket.IO] agent:join_room error:', error);
    }
  });

  // Agent gửi tin nhắn
  socket.on('agent:send_message', async (data: {
    roomId: string;
    text: string;
  }) => {
    try {
      const { roomId, text } = data;

      // Lưu tin nhắn vào DB
      const message = await ChatMessage.create({
        roomId,
        sender: 'agent',
        senderName: 'Hỗ trợ viên',
        text,
        timestamp: new Date(),
      });

      // Cập nhật room (agent gửi thì không tăng unread)
      await ChatRoom.findOneAndUpdate(
        { roomId },
        {
          lastMessage: text,
          lastMessageAt: new Date(),
        }
      );

      // Broadcast tin nhắn tới room
      io.to(roomId).emit('chat:new_message', {
        _id: message._id,
        roomId: message.roomId,
        sender: message.sender,
        senderName: message.senderName,
        text: message.text,
        timestamp: message.timestamp,
      });

      // Cập nhật sidebar
      const updatedRoom = await ChatRoom.findOne({ roomId });
      if (updatedRoom) {
        io.emit('room_updated', {
          roomId: updatedRoom.roomId,
          guestName: updatedRoom.guestName,
          lastMessage: updatedRoom.lastMessage,
          lastMessageAt: updatedRoom.lastMessageAt,
          unreadByAgent: updatedRoom.unreadByAgent,
          status: updatedRoom.status,
        });
      }
    } catch (error) {
      console.error('[Socket.IO] agent:send_message error:', error);
    }
  });

  // Agent typing indicator
  socket.on('agent:typing', (data: { roomId: string }) => {
    socket.to(data.roomId).emit('chat:typing', { roomId: data.roomId, sender: 'agent' });
  });

  socket.on('agent:stop_typing', (data: { roomId: string }) => {
    socket.to(data.roomId).emit('chat:stop_typing', { roomId: data.roomId, sender: 'agent' });
  });

  // ----- DISCONNECT -----
  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
  });
});

// =============================================
// Start Server (development only)
// =============================================
if (process.env.NODE_ENV !== 'production') {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB');
      server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Socket.IO is ready for connections`);
      });
    })
    .catch((error) => {
      console.error('Error connecting to MongoDB:', error);
    });
}
