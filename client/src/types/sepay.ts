export interface SePayTransaction {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  content: string;
  transferType: 'in' | 'out';
  transferAmount: number;
  accumulated: number;
  subAccount?: string | null;
  referenceCode: string;
  description?: string;
}

export interface TransactionResponse {
  success: boolean;
  data: SePayTransaction[];
}
