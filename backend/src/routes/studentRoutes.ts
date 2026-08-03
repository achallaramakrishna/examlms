import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as studentController from '../controllers/studentController';

const router = Router();

router.get('/profile', requireAuth, studentController.getProfile);
router.patch('/profile', requireAuth, studentController.updateProfile);
router.post('/mock-tests', requireAuth, studentController.startMockTest);
router.post('/mock-tests/:mockTestId/submit', requireAuth, studentController.submitMockTest);

export default router;
