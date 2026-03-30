import { Request, Response } from 'express';
import { ISePayTransaction, Transaction } from '../models/Transaction';


export const receiveWebhook = async (req: Request, res: Response) => {
    const data = req.body;

    // Kiểm tra SePay Payload
    if (!data.id) {
        return res.status(400).json({ success: false, message: 'Invalid payload: Missing ID' });
    }

    const transactionData: Partial<ISePayTransaction> = {
        gateway: data.gateway,
        transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
        accountNumber: data.accountNumber,
        subAccount: data.subAccount,
        // Chống lỗi NaN bằng cách dùng toán tử || 0
        amountIn: data.transferType === 'in' ? (Number(data.transferAmount) || 0) : 0,
        amountOut: data.transferType === 'out' ? (Number(data.transferAmount) || 0) : 0,
        // Kiểm tra cả 'accumulated' và 'accumulatedBalance'
        accumulated: Number(data.accumulatedBalance || data.accumulated) || 0,
        code: data.code,
        transactionContent: data.content,
        referenceNumber: data.id ? data.id.toString() : Date.now().toString(),
        body: JSON.stringify(data)
    };
    try {
        // Upsert để đảm bảo idempotency (chống trùng lặp khi SePay gửi lại)
        await Transaction.findOneAndUpdate(
            { referenceNumber: transactionData.referenceNumber },
            transactionData,
            { upsert: true, new: true }
        );

        console.log(`[Webhook] Transaction ${data.id} processed successfully.`);
        return res.status(200).send("OK");
    } catch (error: any) {
        console.error('[Webhook Error]:', error);
        return res.status(500).send("Internal Server Error");
    }
};

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const transactions = await Transaction.find().sort({ transactionDate: -1 });
        return res.status(200).json(transactions);
    } catch (error: any) {
        console.error('[GetTransactions Error]:', error);
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};
