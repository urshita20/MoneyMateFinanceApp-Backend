import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import {
  createSharedExpense,
  getMySharedExpenses,
  settleSharedExpense,
} from '../controllers/expense.controller.js';

const router = Router();

router.use(authenticateToken as any);

router.post('/', createSharedExpense as any);
router.get('/my', getMySharedExpenses as any);
router.patch('/:id/settle', settleSharedExpense as any);

export default router;
