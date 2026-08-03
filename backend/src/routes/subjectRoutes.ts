import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as subjectController from '../controllers/subjectController';

const router = Router();

router.get('/', requireAuth, subjectController.listSubjects);
router.get('/:subjectId/topics', requireAuth, subjectController.listTopicsForSubject);
router.get('/:subjectId/topics/:topicId/questions', requireAuth, subjectController.listTopicQuestions);

export default router;
