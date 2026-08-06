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

function publicUrl(track: string, slug: string, filename: string): string {
  return `${env.publicAssetBaseUrl}/ncert-revision-images/${safeSeg(track)}/${safeSeg(slug)}/${filename}`;
}

/** GET — figure src overrides for a revision pack (students + admins). */
export async function getFigureOverrides(req: Request, res: Response, next: NextFunction) {
  try {
    const track = safeSeg(String(req.params.track));
    const slug = safeSeg(String(req.params.slug));
    if (!track || !slug) throw new ApiError(400, 'track and slug are required');
    const figures = readOverrides(track, slug);
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

    const src = publicUrl(track, slug, req.file.filename);
    const overrides = readOverrides(track, slug);
    // Remove older files for this figureId with a different extension
    const dir = path.join(NCERT_REVISION_IMAGES_DIR, track, slug);
    if (fs.existsSync(dir)) {
      for (const name of fs.readdirSync(dir)) {
        if (name.startsWith(`${figureId}.`) && name !== req.file.filename) {
          try {
            fs.unlinkSync(path.join(dir, name));
          } catch {
            /* ignore */
          }
        }
      }
    }
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
    const existing = overrides[figureId];
    if (existing?.src) {
      const filename = path.basename(existing.src);
      const filePath = path.join(NCERT_REVISION_IMAGES_DIR, track, slug, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          /* ignore */
        }
      }
    }
    delete overrides[figureId];
    writeOverrides(track, slug, overrides);
    res.json({ figureId, figures: overrides });
  } catch (err) {
    next(err);
  }
}
