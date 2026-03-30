import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import webhookRoutes from './routes/webhookRoutes';
import transactionRoutes from './routes/transactionRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sepay-test';

// Middleware
app.use(cors());
app.use(express.json());


// Health Check
app.get('/', (req: Request, res: Response) => {
  res.send('SePay MERN Server Running');
});

// Export app for Vercel
export default app;

if (process.env.NODE_ENV === 'production') {
  app.use(async (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
      try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB Atlas');
      } catch (err) {
        return res.status(500).send("Database connection error");
      }
    }
    next();
  });
}

// 2. Sau đó mới đến các Routes
app.use('/api/webhook', webhookRoutes);
app.use('/api/transactions', transactionRoutes);


