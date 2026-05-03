import { Router } from 'express';
import { getMessages, sendMessage, syncMessages } from '../controllers/messages';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', getMessages);
router.post('/', sendMessage);
router.get('/sync', syncMessages);

export default router;