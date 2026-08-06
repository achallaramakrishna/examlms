import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppDataSource } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { NCERT_REVISION_IMAGES_DIR } from '../middleware/upload';
import { Question } from '../models/Question';
import { TopicHierarchy } from '../models/TopicHierarchy';

const OVERRIDES_ROOT = path.join(__dirname, '../../data/ncert-revision/overrides');

/** Learn chapter slug → Practice topic names (a chapter may map to aliases). */
const SLUG_TO_TOPICS: Record<string, string[]> = {
  'ch01-units-and-measurement': ['Physics and Measurement', 'Units and Measurements', 'Units and Measurement'],
  'ch02-motion-in-a-straight-line': ['Motion in a Straight Line', 'Kinematics'],
  'ch03-motion-in-a-plane': ['Motion in a Plane', 'Kinematics'],
  'ch04-laws-of-motion': ['Laws of Motion'],
  'ch05-work-energy-and-power': ['Work, Energy and Power'],
  'ch06-system-of-particles': ['System of Particles and Rotational Motion', 'Rotational Motion'],
  'ch07-gravitation': ['Gravitation'],
};

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

function normalizePatternKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
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

/**
 * Aggregates unique solve patterns from Practice questions' learning_aid JSON
 * for this Learn chapter. Grows automatically as admins upload questions with
 * different solution methods / formula ladders.
 */
export async function getPracticePatterns(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = safeSeg(String(req.params.slug));
    if (!slug) throw new ApiError(400, 'slug is required');

    const topicNames = SLUG_TO_TOPICS[slug] || [];
    if (topicNames.length === 0) {
      res.json({ slug, topics: [], patterns: [], questionCountWithAid: 0 });
      return;
    }

    const topicRepo = AppDataSource.getRepository(TopicHierarchy);
    const topics = await topicRepo
      .createQueryBuilder('t')
      .where('t.name IN (:...names)', { names: topicNames })
      .getMany();

    if (topics.length === 0) {
      res.json({ slug, topics: topicNames, patterns: [], questionCountWithAid: 0 });
      return;
    }

    const topicIds = topics.map((t) => t.id);
    const questions = await AppDataSource.getRepository(Question)
      .createQueryBuilder('q')
      .where('q.topic_id IN (:...topicIds)', { topicIds })
      .andWhere('q.is_deleted = false')
      .andWhere('q.learning_aid IS NOT NULL')
      .orderBy('q.created_at', 'ASC')
      .getMany();

    type PatternAgg = {
      key: string;
      examPattern: string;
      questionCount: number;
      conceptTags: string[];
      formulaLadder: { rung: number; title: string; detail: string; latex?: string | null }[];
      solutionSteps: string[];
      commonMistake?: string;
      examTransferTip?: string;
      sampleQuestions: { id: string; stem: string; difficulty?: string }[];
      readQuestionAudio?: string;
      solutionAudio?: string;
    };

    const byKey = new Map<string, PatternAgg>();

    for (const q of questions) {
      const aid = (q.learningAid || {}) as Record<string, unknown>;
      const meta = (aid.meta || {}) as Record<string, unknown>;
      const examPattern =
        String(meta.examPattern || '').trim() ||
        String((aid as { find?: string }).find || '').trim() ||
        'General method';
      const key = normalizePatternKey(examPattern);
      const ladder = Array.isArray(aid.formulaLadder)
        ? (aid.formulaLadder as PatternAgg['formulaLadder'])
        : [];
      const steps = Array.isArray(aid.solutionSteps) ? (aid.solutionSteps as string[]) : [];
      const tags = Array.isArray(aid.conceptTags) ? (aid.conceptTags as string[]) : [];

      let agg = byKey.get(key);
      if (!agg) {
        agg = {
          key,
          examPattern,
          questionCount: 0,
          conceptTags: [],
          formulaLadder: ladder,
          solutionSteps: steps,
          commonMistake: typeof aid.commonMistake === 'string' ? aid.commonMistake : undefined,
          examTransferTip: typeof aid.examTransferTip === 'string' ? aid.examTransferTip : undefined,
          sampleQuestions: [],
          readQuestionAudio:
            typeof aid.readQuestionAudio === 'string' ? aid.readQuestionAudio : undefined,
          solutionAudio: typeof aid.solutionAudio === 'string' ? aid.solutionAudio : undefined,
        };
        byKey.set(key, agg);
      }

      agg.questionCount += 1;
      // Prefer richer ladder if a newer question brings more rungs
      if (ladder.length > agg.formulaLadder.length) agg.formulaLadder = ladder;
      if (steps.length > agg.solutionSteps.length) agg.solutionSteps = steps;
      for (const tag of tags) {
        if (!agg.conceptTags.includes(tag)) agg.conceptTags.push(tag);
      }
      if (agg.sampleQuestions.length < 3) {
        agg.sampleQuestions.push({
          id: q.id,
          stem: q.questionText.slice(0, 180),
          difficulty: q.difficulty,
        });
      }
    }

    const patterns = [...byKey.values()].sort((a, b) => b.questionCount - a.questionCount);

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      slug,
      topics: topics.map((t) => t.name),
      questionCountWithAid: questions.length,
      patternCount: patterns.length,
      patterns,
      note: 'Patterns grow as Practice questions with learning_aid (different solve methods) are uploaded.',
    });
  } catch (err) {
    next(err);
  }
}
