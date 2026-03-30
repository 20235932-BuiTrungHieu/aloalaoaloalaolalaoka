import axios from 'axios';

// Mock Data matching SePay payload
const MOCK_TRANSACTIONS = [
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
  },
  {
    id: 1003,
    gateway: "Techcombank",
    transactionDate: "2024-03-29 18:20:00",
    accountNumber: "888888888",
    content: "Nap tien vao vi",
    transferType: "in",
    transferAmount: 5000000,
    accumulated: 156450000,
    referenceCode: "TCB.112233"
  },
  {
    id: 1004,
    gateway: "VietinBank",
    transactionDate: "2024-03-29 14:00:37",
    accountNumber: "55556666",
    content: "Tien an trua",
    transferType: "out",
    transferAmount: 85000,
    accumulated: 156365000,
    referenceCode: "VTB.445566"
  }
];

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const transactionService = {
  getTransactions: async () => {
    try {
      // Uncomment this when your backend is ready
      // const response = await axios.get(`${API_BASE_URL}/transactions`);
      // return response.data;
      
      // Returning Mock Data for now
      return new Promise((resolve) => {
        setTimeout(() => resolve(MOCK_TRANSACTIONS), 500);
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }
};
