import { Router } from 'express';
import { register, login, logout, getPartner, connectPartner } from '../controllers/auth';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authMiddleware, logout);
router.get('/partner', authMiddleware, getPartner);
router.post('/partner', authMiddleware, connectPartner);

export default router;