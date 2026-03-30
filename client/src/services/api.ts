import axios from 'axios';
import { SePayTransaction } from '../types/sepay';

const MOCK_TRANSACTIONS: SePayTransaction[] = [
  {
    id: 1001,
    gateway: "Vietcombank",
    transactionDate: "2024-03-30 09:15:22",
    accountNumber: "123456789",
    content: "Chuyen khoan mua iPhone 15",
    transferType: "out",
    transferAmount: 22500000,
    accumulated: 150200000,
    referenceCode: "MBVCB.987654321"
  },
  {
    id: 1002,
    gateway: "MB Bank",
    transactionDate: "2024-03-30 10:45:10",
    accountNumber: "999999999",
    content: "SEPAY123 thanh toan don hang #4567",
    transferType: "in",
    transferAmount: 1250000,
    accumulated: 151450000,
    referenceCode: "MB.77665544"
  }
];

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const transactionService = {
  getTransactions: async (): Promise<SePayTransaction[]> => {
    try {
      const response = await axios.get<SePayTransaction[]>(`${API_BASE_URL}/transactions`);
      return response.data;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }
};
