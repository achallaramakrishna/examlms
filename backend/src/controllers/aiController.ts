import { Response, NextFunction, Request } from 'express';
import { AppDataSource } from '../config/database';
import { StudentProfile } from '../models/StudentProfile';
import { StudentDoubt } from '../models/StudentDoubt';
import { resolveDoubt } from '../services/aiagents/doubtResolverAgent';
import { searchSimilarQuestions } from '../services/vectordb/search';

export async function askDoubt(req: Request, res: Response, next: NextFunction) {
  try {
    const { question, examId, subjectId, questionId } = req.body as {
      question: string;
      examId?: string;
      subjectId?: string;
      questionId?: string;
    };

    const result = await resolveDoubt({ question, examId, subjectId });

    const profile = await AppDataSource.getRepository(StudentProfile).findOneBy({ userId: req.user!.id });
    if (profile) {
      const doubtRepo = AppDataSource.getRepository(StudentDoubt);
      await doubtRepo.save(
        doubtRepo.create({
          studentId: profile.id,
          questionId,
          doubtText: question,
          answerText: result.answer,
          relatedQuestionIds: result.relatedQuestionIds,
        })
      );
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function semanticSearch(req: Request, res: Response, next: NextFunction) {
  try {
    const { query, examId, subjectId, limit } = req.query as {
      query: string;
      examId?: string;
      subjectId?: string;
      limit?: string;
    };

    const results = await searchSimilarQuestions(query, limit ? parseInt(limit, 10) : 5, {
      examId,
      subjectId,
    });

    res.json({ results });
  } catch (err) {
    next(err);
  }
}
