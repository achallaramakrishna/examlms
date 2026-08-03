import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as performanceController from '../controllers/performanceController';

const router = Router();

router.get('/metrics', requireAuth, performanceController.getMetrics);
router.get('/recommendation', requireAuth, performanceController.getRecommendation);
router.get('/study-plan', requireAuth, performanceController.getPlan);

export default router;
