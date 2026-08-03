import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as aiController from '../controllers/aiController';

const router = Router();

router.post('/doubt', requireAuth, aiController.askDoubt);
router.get('/search', requireAuth, aiController.semanticSearch);

export default router;
