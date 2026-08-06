import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { uploadLearnFigureImage } from '../middleware/upload';
import * as ncertRevisionController from '../controllers/ncertRevisionController';

const router = Router();

router.get('/:track/:slug/figures', requireAuth, ncertRevisionController.getFigureOverrides);
router.post(
  '/:track/:slug/figures/:figureId',
  requireAuth,
  requireRole('admin'),
  uploadLearnFigureImage,
  ncertRevisionController.uploadFigure
);
router.delete(
  '/:track/:slug/figures/:figureId',
  requireAuth,
  requireRole('admin'),
  ncertRevisionController.deleteFigure
);

export default router;
