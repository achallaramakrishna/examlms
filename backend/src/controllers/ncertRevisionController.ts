import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { ApiError } from '../middleware/errorHandler';
import { NCERT_REVISION_IMAGES_DIR } from '../middleware/upload';

const OVERRIDES_ROOT = path.join(__dirname, '../../data/ncert-revision/overrides');

type FigureOverrides = Record<string, { src: string; updatedAt: string }>;

function safeSeg(value: string): string {
  return value.replace(/[^a-z0-9-_]/gi, '');
}

function overridesPath(track: string, slug: string): string {
  return path.join(OVERRIDES_ROOT, safeSeg(track), `${safeSeg(slug)}.json`);
}

function readOverrides(track: string, slug: string): FigureOverrides {
  const file = overridesPath(track, slug);
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as FigureOverrides;
  } catch {
    return {};
  }
}

function writeOverrides(track: string, slug: string, data: FigureOverrides): void {
  const file = overridesPath(track, slug);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function publicUrl(track: string, slug: string, filename: string, version: string): string {
  return `${env.publicAssetBaseUrl}/ncert-revision-images/${safeSeg(track)}/${safeSeg(slug)}/${filename}?v=${encodeURIComponent(version)}`;
}

/** GET — figure src overrides for a revision pack (students + admins). */
export async function getFigureOverrides(req: Request, res: Response, next: NextFunction) {
  try {
    const track = safeSeg(String(req.params.track));
    const slug = safeSeg(String(req.params.slug));
    if (!track || !slug) throw new ApiError(400, 'track and slug are required');
    const figures = readOverrides(track, slug);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ track, slug, figures });
  } catch (err) {
    next(err);
  }
}

/** POST multipart — admin uploads/replaces a Learn figure image. */
export async function uploadFigure(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new ApiError(400, 'No image file uploaded');
    const track = safeSeg(String(req.params.track));
    const slug = safeSeg(String(req.params.slug));
    const figureId = safeSeg(String(req.params.figureId));
    if (!track || !slug || !figureId) throw new ApiError(400, 'track, slug, and figureId are required');

    const version = String(Date.now());
    const dir = path.join(NCERT_REVISION_IMAGES_DIR, track, slug);
    fs.mkdirSync(dir, { recursive: true });

    // Always use a versioned filename so browsers never keep a stale crop.
    const ext = path.extname(req.file.filename).toLowerCase() || path.extname(req.file.originalname).toLowerCase() || '.png';
    const versionedName = `${figureId}-${version}${ext}`;
    const versionedPath = path.join(dir, versionedName);
    // Multer already wrote req.file.path — rename into versioned name.
    if (req.file.path !== versionedPath) {
      fs.renameSync(req.file.path, versionedPath);
    }

    // Remove any previous files for this figure id
    for (const name of fs.readdirSync(dir)) {
      if (name === versionedName) continue;
      if (name === figureId || name.startsWith(`${figureId}.`) || name.startsWith(`${figureId}-`)) {
        try {
          fs.unlinkSync(path.join(dir, name));
        } catch {
          /* ignore */
        }
      }
    }

    const src = publicUrl(track, slug, versionedName, version);
    const overrides = readOverrides(track, slug);
    overrides[figureId] = { src, updatedAt: new Date().toISOString() };
    writeOverrides(track, slug, overrides);

    res.status(201).json({ figureId, src, figures: overrides });
  } catch (err) {
    next(err);
  }
}

/** DELETE — admin clears a Learn figure image override. */
export async function deleteFigure(req: Request, res: Response, next: NextFunction) {
  try {
    const track = safeSeg(String(req.params.track));
    const slug = safeSeg(String(req.params.slug));
    const figureId = safeSeg(String(req.params.figureId));
    if (!track || !slug || !figureId) throw new ApiError(400, 'track, slug, and figureId are required');

    const overrides = readOverrides(track, slug);
    const dir = path.join(NCERT_REVISION_IMAGES_DIR, track, slug);
    if (fs.existsSync(dir)) {
      for (const name of fs.readdirSync(dir)) {
        if (name === figureId || name.startsWith(`${figureId}.`) || name.startsWith(`${figureId}-`)) {
          try {
            fs.unlinkSync(path.join(dir, name));
          } catch {
            /* ignore */
          }
        }
      }
    }
    delete overrides[figureId];
    writeOverrides(track, slug, overrides);
    // Disable caching of this JSON response
    res.setHeader('Cache-Control', 'no-store');
    res.json({ figureId, removed: true, figures: overrides });
  } catch (err) {
    next(err);
  }
}
