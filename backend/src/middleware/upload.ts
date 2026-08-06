import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

const QUESTION_IMAGES_DIR = path.join(__dirname, '../../public/question-images');
fs.mkdirSync(QUESTION_IMAGES_DIR, { recursive: true });

export const NCERT_REVISION_IMAGES_DIR = path.join(
  __dirname,
  '../../public/ncert-revision-images'
);
fs.mkdirSync(NCERT_REVISION_IMAGES_DIR, { recursive: true });

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const imageFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    cb(new Error('Only PNG, JPEG, or WEBP images are allowed'));
    return;
  }
  cb(null, true);
};

const questionStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, QUESTION_IMAGES_DIR),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
});

export const uploadQuestionImage = multer({
  storage: questionStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter,
}).single('image');

/** Saves Learn/NCERT figure images under ncert-revision-images/{track}/{slug}/ */
const learnFigureStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const track = String(req.params.track || 'physics-xi').replace(/[^a-z0-9-]/gi, '');
    const slug = String(req.params.slug || 'chapter').replace(/[^a-z0-9-]/gi, '');
    const dir = path.join(NCERT_REVISION_IMAGES_DIR, track, slug);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const figureId = String(req.params.figureId || 'figure').replace(/[^a-z0-9-_]/gi, '');
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${figureId}${ext}`);
  },
});

export const uploadLearnFigureImage = multer({
  storage: learnFigureStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter,
}).single('image');
