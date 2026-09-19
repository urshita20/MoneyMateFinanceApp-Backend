import { Router } from 'express';
import { getBudgets, createBudget, updateBudget, deleteBudget } from '../controllers/budget.controller.js';
import { getGoals, createGoal, updateGoalProgress, deleteGoal } from '../controllers/goal.controller.js';
import { getBills, createBill, markBillPaid, deleteBill } from '../controllers/bill.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

export const budgetRouter = Router();
budgetRouter.get('/', authenticateToken, getBudgets);
budgetRouter.post('/', authenticateToken, createBudget);
budgetRouter.put('/:id', authenticateToken, updateBudget);
budgetRouter.delete('/:id', authenticateToken, deleteBudget);

export const goalRouter = Router();
goalRouter.get('/', authenticateToken, getGoals);
goalRouter.post('/', authenticateToken, createGoal);
goalRouter.patch('/:id/deposit', authenticateToken, updateGoalProgress);
goalRouter.delete('/:id', authenticateToken, deleteGoal);

export const billRouter = Router();
billRouter.get('/', authenticateToken, getBills);
billRouter.post('/', authenticateToken, createBill);
billRouter.patch('/:id/pay', authenticateToken, markBillPaid);
billRouter.delete('/:id', authenticateToken, deleteBill);
