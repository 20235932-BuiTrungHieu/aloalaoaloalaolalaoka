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

// Routes
app.use('/api/webhook', webhookRoutes);
app.use('/api/transactions', transactionRoutes);

// Health Check
app.get('/', (req: Request, res: Response) => {
  res.send('SePay MERN Server Running');
});

// Export app for Vercel
export default app;

// Database Connection & Server Start
// Vercel will handle the connection differently, but for local dev we still need this
if (process.env.NODE_ENV !== 'production') {
  mongoose.connect(MONGODB_URI).then(() => {
    console.log('Connected to MongoDB local');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  });
} else {
  // Middleware đảm bảo kết nối DB cho mỗi request trên Serverless
  app.use(async (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
      try {
        await mongoose.connect(MONGODB_URI);
      } catch (err) {
        console.error('Database connection error:', err);
      }
    }
    next();
  });
}