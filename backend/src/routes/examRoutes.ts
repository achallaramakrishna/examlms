import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import * as examController from '../controllers/examController';

const router = Router();

router.get('/', requireAuth, examController.listExams);
router.get('/:examId', requireAuth, examController.getExam);
router.post('/', requireAuth, requireRole('admin'), examController.createExam);
router.get('/:examId/questions', requireAuth, examController.listExamQuestions);

export default router;
