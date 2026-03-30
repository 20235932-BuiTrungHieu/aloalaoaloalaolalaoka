import { Router } from 'express';
import * as TransactionController from '../controller/TransactionController';

const router = Router();

// GET /api/transactions - Lấy danh sách lịch sử giao dịch
router.get('/', TransactionController.getTransactions);

export default router;

