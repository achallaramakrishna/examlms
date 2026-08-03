import { Router } from 'express';
import authRoutes from './authRoutes';
import examRoutes from './examRoutes';
import questionRoutes from './questionRoutes';
import subjectRoutes from './subjectRoutes';
import studentRoutes from './studentRoutes';
import performanceRoutes from './performanceRoutes';
import aiRoutes from './aiRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/exams', examRoutes);
router.use('/questions', questionRoutes);
router.use('/subjects', subjectRoutes);
router.use('/students', studentRoutes);
router.use('/performance', performanceRoutes);
router.use('/ai', aiRoutes);

export default router;
