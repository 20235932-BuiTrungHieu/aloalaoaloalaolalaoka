import { Schema, model, Document } from 'mongoose';

// Interface cho Transaction
export interface ISePayTransaction {
  gateway: string;
  transactionDate: Date;
  accountNumber?: string;
  subAccount?: string;
  amountIn: number;
  amountOut: number;
  accumulated: number;
  code?: string;
  transactionContent?: string;
  referenceNumber?: string; // Đây thường là mã tham chiếu duy nhất từ ngân hàng
  body?: string;            // Lưu toàn bộ JSON gốc để đối soát khi cần
  createdAt: Date;
}

const transactionSchema = new Schema<ISePayTransaction>({
  gateway: { type: String, required: true },
  transactionDate: { type: Date, required: true },
  accountNumber: { type: String },
  subAccount: { type: String },
  amountIn: { type: Number, default: 0 },
  amountOut: { type: Number, default: 0 },
  accumulated: { type: Number, default: 0 },
  code: { type: String, index: true }, // Đánh index để search mã đơn hàng nhanh hơn
  transactionContent: { type: String },
  referenceNumber: { type: String, unique: true, sparse: true }, // Chống trùng giao dịch
  body: { type: String }, // Lưu JSON stringify của req.body
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

export const Transaction = model<ISePayTransaction>('Transaction', transactionSchema);