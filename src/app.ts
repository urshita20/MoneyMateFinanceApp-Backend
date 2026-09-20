import './env.js';
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
import expenseRoutes from './routes/expense.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Global Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Welcome & Root Directory Endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 MoneyMate Finance App Backend API is running successfully!',
    status: 'online',
    health: '/health',
    endpoints: {
      auth: '/api/auth',
      transactions: '/api/transactions',
      budgets: '/api/budgets',
      goals: '/api/goals',
      bills: '/api/bills',
      expenses: '/api/expenses',
      notifications: '/api/notifications',
      analytics: '/api/analytics/summary',
      ai: '/api/ai/insights',
      investments: '/api/investments',
      knowledge: '/api/knowledge/articles',
      junior: '/api/junior/quests',
    },
  });
});

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
app.use('/api/expenses', expenseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/investments', investmentRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/junior', juniorRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
