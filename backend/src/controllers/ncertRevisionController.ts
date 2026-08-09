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
  'ch08-mechanical-properties-of-solids': ['Properties of Solids and Liquids', 'Mechanical Properties of Solids'],
  'ch09-mechanical-properties-of-fluids': ['Properties of Solids and Liquids', 'Mechanical Properties of Fluids'],
  'ch10-thermal-properties-of-matter': ['Thermodynamics', 'Thermal Properties of Matter', 'Kinetic Theory of Gases'],
  'ch11-thermodynamics': ['Thermodynamics'],
  'ch12-kinetic-theory': ['Kinetic Theory of Gases', 'Kinetic Theory'],
  'ch13-oscillations': ['Oscillations and Waves', 'Oscillations'],
  'ch14-waves': ['Oscillations and Waves', 'Waves'],
  'ch01-solutions': ['Solutions', 'Solid State and Solutions'],
  'ch02-electrochemistry': ['Electrochemistry'],
  'ch03-chemical-kinetics': ['Chemical Kinetics'],
  'ch04-d-and-f-block-elements': ['d and f Block Elements', 'The d- and f-Block Elements'],
  'ch05-coordination-compounds': ['Coordination Compounds'],
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

type CoachMode = 'recall' | 'formula' | 'concept' | 'reaction' | 'process';

/** Mirror of frontend resolveCoachMode — keep in sync for Learn aggregation. */
function resolveCoachModeFromAid(aid: Record<string, unknown>): CoachMode {
  const meta = (aid.meta || {}) as Record<string, unknown>;
  const explicit = String(meta.coachMode || '').toLowerCase();
  if (
    explicit === 'recall' ||
    explicit === 'formula' ||
    explicit === 'concept' ||
    explicit === 'reaction' ||
    explicit === 'process'
  ) {
    return explicit;
  }

  const qtype = String(meta.questionType || '').toLowerCase();
  const subject = String(meta.subject || '').toLowerCase();
  const ladder = Array.isArray(aid.formulaLadder)
    ? (aid.formulaLadder as { latex?: string | null }[])
    : [];
  const hasLatex = ladder.some((r) => typeof r.latex === 'string' && r.latex.trim().length > 0);

  if (qtype === 'numerical_mcq') return hasLatex ? 'formula' : 'concept';
  if (qtype === 'reaction') return 'reaction';
  if (qtype === 'process') return 'process';

  if (subject === 'biology') {
    const bio = (aid.subjectExtras as { biology?: { processOrder?: unknown[] } } | undefined)?.biology;
    if (Array.isArray(bio?.processOrder) && bio.processOrder.length > 0) return 'process';
    return 'recall';
  }

  if (subject === 'chemistry') {
    const chem = (aid.subjectExtras as { chemistry?: { mechanismRungs?: unknown[] } } | undefined)
      ?.chemistry;
    if (Array.isArray(chem?.mechanismRungs) && chem.mechanismRungs.length > 0) return 'reaction';
    if (hasLatex) return 'formula';
    if (qtype === 'conceptual' || qtype === 'assertion_reason' || qtype === 'match') {
      return 'recall';
    }
    return 'concept';
  }

  if (
    qtype === 'conceptual' ||
    qtype === 'assertion_reason' ||
    qtype === 'match' ||
    qtype === 'diagram'
  ) {
    return hasLatex ? 'concept' : 'recall';
  }
  if (hasLatex) return 'formula';
  return 'concept';
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
      const coachMode = resolveCoachModeFromAid(aid);
      // Fact-recall MCQs must not pollute Learn formula / method ladders
      if (coachMode === 'recall') continue;

      const examPattern =
        String(meta.examPattern || '').trim() ||
        String((aid as { find?: string }).find || '').trim() ||
        'General method';
      const key = normalizePatternKey(examPattern);
      const ladder = Array.isArray(aid.formulaLadder)
        ? (aid.formulaLadder as PatternAgg['formulaLadder'])
        : [];
      // Skip empty generic ladders
      if (ladder.length === 0) continue;
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
      note: 'Formula / method patterns grow from Practice aids with coachMode formula|concept|reaction|process (recall fact-MCQs are excluded).',
    });
  } catch (err) {
    next(err);
  }
}
