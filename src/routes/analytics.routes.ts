import { Router } from 'express';
import {
  getDashboardSummary,
  getSpendingByCategory,
  getMonthlyTrends,
  getWeeklyTrends,
  getTimeMachineAnalysis,
} from '../controllers/analytics.controller.js';
import { chatWithAI, getAIInsights, getAIDashboard } from '../controllers/ai.controller.js';
import { getInvestments, getLoans } from '../controllers/investment.controller.js';
import { getKnowledgeArticles, getJuniorQuests, completeJuniorQuest } from '../controllers/knowledge.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

export const analyticsRouter = Router();
analyticsRouter.get('/summary', authenticateToken, getDashboardSummary);
analyticsRouter.get('/spending-by-category', authenticateToken, getSpendingByCategory);
analyticsRouter.get('/monthly-trends', authenticateToken, getMonthlyTrends);
analyticsRouter.get('/weekly-trends', authenticateToken, getWeeklyTrends);
analyticsRouter.get('/time-machine', authenticateToken, getTimeMachineAnalysis);

export const aiRouter = Router();
aiRouter.post('/chat', authenticateToken, chatWithAI);
aiRouter.get('/insights', authenticateToken, getAIInsights);
aiRouter.get('/dashboard', authenticateToken, getAIDashboard);

export const investmentRouter = Router();
investmentRouter.get('/', authenticateToken, getInvestments);
investmentRouter.get('/loans', authenticateToken, getLoans);

export const knowledgeRouter = Router();
knowledgeRouter.get('/articles', getKnowledgeArticles);

export const juniorRouter = Router();
juniorRouter.get('/quests', authenticateToken, getJuniorQuests);
juniorRouter.patch('/quests/:id/complete', authenticateToken, completeJuniorQuest);
