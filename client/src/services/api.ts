import axios from 'axios';
import { SePayTransaction } from '../types/sepay';

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
