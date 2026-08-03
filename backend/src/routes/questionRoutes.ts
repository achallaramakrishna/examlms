import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { uploadQuestionImage } from '../middleware/upload';
import * as questionController from '../controllers/questionController';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), questionController.listQuestions);
router.post('/upload-image', requireAuth, requireRole('admin'), uploadQuestionImage, questionController.uploadImage);
router.post('/bulk', requireAuth, requireRole('admin'), questionController.bulkCreateQuestions);
router.get('/:questionId', requireAuth, questionController.getQuestion);
router.put('/:questionId', requireAuth, requireRole('admin'), questionController.updateQuestion);
router.post('/', requireAuth, requireRole('admin'), questionController.createQuestion);
router.post('/:questionId/check', requireAuth, questionController.checkAnswer);

export default router;
