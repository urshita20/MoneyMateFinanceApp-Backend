import { Router } from 'express';
import { register, login, getMe, switchProfileMode } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.post('/profile-mode', authenticateToken, switchProfileMode);

export default router;
