import { Router } from 'express';
import * as TransactionController from '../controller/TransactionController';

const router = Router();

// SePay Webhook Endpoint
// SePay sẽ gửi POST request đến đây mỗi khi có giao dịch mới
router.post('/sepay', TransactionController.receiveWebhook);

export default router;

