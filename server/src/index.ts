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
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB');
      app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
    });
} else {
  // On Vercel, we need to ensure the DB connection is established for each function call
  // or use a global connection pattern. Most Mongoose/Vercel guides recommend this:
  mongoose.connect(MONGODB_URI);
}

