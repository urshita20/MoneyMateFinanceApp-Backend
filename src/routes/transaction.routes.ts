import { Router } from 'express';
import {
  getTransactions,
  createTransaction,
  batchCreateTransactions,
  deleteTransaction,
  ocrScanReceipt,
} from '../controllers/transaction.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', authenticateToken, getTransactions);
router.post('/', authenticateToken, createTransaction);
router.post('/batch', authenticateToken, batchCreateTransactions);
router.delete('/:id', authenticateToken, deleteTransaction);
router.post('/ocr-scan', authenticateToken, ocrScanReceipt);

export default router;
