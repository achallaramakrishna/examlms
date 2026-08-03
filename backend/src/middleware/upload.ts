import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

const QUESTION_IMAGES_DIR = path.join(__dirname, '../../public/question-images');
fs.mkdirSync(QUESTION_IMAGES_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, QUESTION_IMAGES_DIR),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
});

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export const uploadQuestionImage = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      cb(new Error('Only PNG, JPEG, or WEBP images are allowed'));
      return;
    }
    cb(null, true);
  },
}).single('image');
