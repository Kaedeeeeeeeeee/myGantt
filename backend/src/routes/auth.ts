import { Router } from 'express';
import { googleAuth, refreshToken, logout, getCurrentUser } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/google', googleAuth as any);
router.post('/refresh', refreshToken as any);
router.post('/logout', logout as any);

// Protected routes
router.get('/me', authenticate, getCurrentUser as any);

export default router;

