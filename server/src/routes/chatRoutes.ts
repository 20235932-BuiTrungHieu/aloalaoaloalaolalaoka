import { Router } from 'express';
import * as ChatController from '../controller/ChatController';

const router = Router();

// POST /api/chat/rooms — Tạo/join room (Guest)
router.post('/rooms', ChatController.joinRoom);

// GET /api/chat/rooms — Danh sách phòng chat (Agent)
router.get('/rooms', ChatController.getRooms);

// GET /api/chat/rooms/updates?after=<timestamp> — Polling room updates (Agent)
router.get('/rooms/updates', ChatController.getRoomUpdates);

// GET /api/chat/rooms/:roomId/messages — Lịch sử tin nhắn
router.get('/rooms/:roomId/messages', ChatController.getMessages);

// GET /api/chat/rooms/:roomId/messages/new?after=<timestamp> — Tin nhắn mới (Polling)
router.get('/rooms/:roomId/messages/new', ChatController.getNewMessages);

// POST /api/chat/rooms/:roomId/messages — Gửi tin nhắn
router.post('/rooms/:roomId/messages', ChatController.sendMessage);

// PUT /api/chat/rooms/:roomId/read — Đánh dấu đã đọc
router.put('/rooms/:roomId/read', ChatController.markAsRead);

export default router;
