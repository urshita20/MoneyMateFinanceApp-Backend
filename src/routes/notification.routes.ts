import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import {
  getNotifications,
  markAllNotificationsRead,
} from '../controllers/notification.controller.js';

const router = Router();

router.use(authenticateToken as any);

router.get('/', getNotifications as any);
router.patch('/read-all', markAllNotificationsRead as any);

export default router;
