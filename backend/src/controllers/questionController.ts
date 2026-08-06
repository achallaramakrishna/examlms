import { Request, Response, NextFunction } from 'express';
import { DeepPartial, ILike } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Question } from '../models/Question';
import { ApiError } from '../middleware/errorHandler';
import { indexQuestion } from '../services/vectordb/indexing';
import { env } from '../config/env';

const LIST_PAGE_SIZE = 20;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Admin question browser: filterable/searchable, includes the answer key
 * (admin-only route). Ordered oldest-first, same as listTopicQuestions
 * (Practice mode) — so "question 1" means the same thing in both places,
 * matching the order they were originally ingested in.
 */
export async function listQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const { examId, subjectId, topicId, search } = req.query as Record<string, string | undefined>;
    const limit = Math.min(parseInt((req.query.limit as string) ?? '', 10) || LIST_PAGE_SIZE, 100);
    const offset = parseInt((req.query.offset as string) ?? '', 10) || 0;

    const where: Record<string, unknown> = { isDeleted: false };
    if (examId) where.examId = examId;
    if (subjectId) where.subjectId = subjectId;
    if (topicId) where.topicId = topicId;
    if (search) {
      // A pasted question ID should jump straight to that question, not be treated as text.
      if (UUID_PATTERN.test(search.trim())) {
        where.id = search.trim();
      } else {
        where.questionText = ILike(`%${search}%`);
      }
    }

    const [questions, total] = await AppDataSource.getRepository(Question).findAndCount({
      where,
      relations: ['subject', 'topic'],
      order: { createdAt: 'ASC' },
      take: limit,
      skip: offset,
    });

    res.json({ questions, total, limit, offset });
  } catch (err) {
    next(err);
  }
}

/** Full update for admin editing — re-embeds if the question text changed. */
export async function updateQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const questionRepo = AppDataSource.getRepository(Question);
    const question = await questionRepo.findOneBy({ id: req.params.questionId, isDeleted: false });
    if (!question) throw new ApiError(404, 'Question not found');

    const textChanged = req.body.questionText !== undefined && req.body.questionText !== question.questionText;
    Object.assign(question, req.body as DeepPartial<Question>);
    await questionRepo.save(question);

    if (textChanged) await indexQuestion(question);

    res.json({ question });
  } catch (err) {
    next(err);
  }
}

export async function getQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const question = await AppDataSource.getRepository(Question).findOneBy({
      id: req.params.questionId,
      isDeleted: false,
    });
    if (!question) throw new ApiError(404, 'Question not found');
    res.json({ question });
  } catch (err) {
    next(err);
  }
}

/** Creates a single question and indexes it in the vector store synchronously. */
export async function createQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const questionRepo = AppDataSource.getRepository(Question);
    const newQuestion = questionRepo.create(req.body as DeepPartial<Question>);
    const question = await questionRepo.save(newQuestion);

    await indexQuestion(question);

    res.status(201).json({ question });
  } catch (err) {
    next(err);
  }
}

interface BulkQuestionInput {
  examId?: string;
  subjectId?: string;
  topicId?: string;
  questionText: string;
  questionImageUrl?: string;
  options: { label: string; text: string; imageUrl?: string }[];
  correctOption: string;
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  source?: string;
  previousYear?: number;
}

/**
 * Bulk-creates questions synchronously from a JSON array (same shape the
 * scanning pipeline's review files use — see vectordb/scripts/shared.ts's
 * RawQuestionInput). Each item may omit examId/subjectId/topicId to inherit
 * the defaults passed alongside the array, so a whole chapter can be
 * uploaded without repeating the same IDs on every question. Per-item
 * failures are reported individually rather than aborting the whole batch.
 */
export async function bulkCreateQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const { defaultExamId, defaultSubjectId, defaultTopicId, questions } = req.body as {
      defaultExamId?: string;
      defaultSubjectId?: string;
      defaultTopicId?: string;
      questions: BulkQuestionInput[];
    };

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new ApiError(400, 'questions must be a non-empty array');
    }

    const questionRepo = AppDataSource.getRepository(Question);
    const created: string[] = [];
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];
      try {
        const examId = item.examId ?? defaultExamId;
        const subjectId = item.subjectId ?? defaultSubjectId;
        const topicId = item.topicId ?? defaultTopicId;
        if (!examId || !subjectId) throw new Error('missing examId/subjectId (and no default provided)');
        if (!item.questionText || !item.options?.length || !item.correctOption) {
          throw new Error('missing questionText, options, or correctOption');
        }

        const question = questionRepo.create({
          examId,
          subjectId,
          topicId,
          questionText: item.questionText,
          questionImageUrl: item.questionImageUrl,
          options: item.options,
          correctOption: item.correctOption,
          explanation: item.explanation,
          difficulty: item.difficulty ?? 'medium',
          source: item.source,
          previousYear: item.previousYear,
        } as DeepPartial<Question>);
        const saved = await questionRepo.save(question);
        await indexQuestion(saved);
        created.push(saved.id);
      } catch (err) {
        errors.push({ index: i, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    res.status(201).json({ createdCount: created.length, createdIds: created, errors });
  } catch (err) {
    next(err);
  }
}

/** Saves an uploaded image to the public question-images folder and returns its URL. */
export async function uploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw new ApiError(400, 'No image file uploaded');
    const url = `${env.publicAssetBaseUrl}/question-images/${req.file.filename}`;
    res.status(201).json({ url });
  } catch (err) {
    next(err);
  }
}

/**
 * Checks one answer for chapter-practice mode: the client only ever has
 * question text/options (never the answer key), so this is the only place
 * that reveals correctOption/explanation — one question at a time, after
 * the student has already committed to an answer.
 */
export async function checkAnswer(req: Request, res: Response, next: NextFunction) {
  try {
    const { selectedOption } = req.body as { selectedOption: string };
    const question = await AppDataSource.getRepository(Question).findOneBy({
      id: req.params.questionId,
      isDeleted: false,
    });
    if (!question) throw new ApiError(404, 'Question not found');

    res.json({
      isCorrect: selectedOption === question.correctOption,
      correctOption: question.correctOption,
      explanation: question.explanation ?? null,
      learningAid: question.learningAid ?? null,
    });
  } catch (err) {
    next(err);
  }
}
