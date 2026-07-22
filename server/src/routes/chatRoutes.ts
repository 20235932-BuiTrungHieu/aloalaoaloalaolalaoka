import { Router } from 'express';
import * as ChatController from '../controller/ChatController';

const router = Router();

// GET /api/chat/rooms — Danh sách phòng chat
router.get('/rooms', ChatController.getRooms);

// GET /api/chat/rooms/:roomId/messages — Lịch sử tin nhắn
router.get('/rooms/:roomId/messages', ChatController.getMessages);

export default router;
