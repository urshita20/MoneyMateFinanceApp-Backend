import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import { budgetRouter, goalRouter, billRouter } from './routes/budget.routes.js';
import {
  analyticsRouter,
  aiRouter,
  investmentRouter,
  knowledgeRouter,
  juniorRouter,
} from './routes/analytics.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Global Middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'MoneyMate Backend API', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRouter);
app.use('/api/goals', goalRouter);
app.use('/api/bills', billRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/investments', investmentRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/junior', juniorRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
