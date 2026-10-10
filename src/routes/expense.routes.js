import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { createSharedExpense, getMySharedExpenses, settleSharedExpense, } from '../controllers/expense.controller.js';
const router = Router();
router.use(authenticateToken);
router.post('/', createSharedExpense);
router.get('/my', getMySharedExpenses);
router.patch('/:id/settle', settleSharedExpense);
export default router;
