import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { getNotifications, markAllNotificationsRead, } from '../controllers/notification.controller.js';
const router = Router();
router.use(authenticateToken);
router.get('/', getNotifications);
router.patch('/read-all', markAllNotificationsRead);
export default router;
