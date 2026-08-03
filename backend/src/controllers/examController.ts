import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Exam } from '../models/Exam';
import { Question } from '../models/Question';
import { ApiError } from '../middleware/errorHandler';

export async function listExams(req: Request, res: Response, next: NextFunction) {
  try {
    const { examType } = req.query as { examType?: string };
    const where: Record<string, unknown> = { isDeleted: false };
    if (examType) where.examType = examType;
    const exams = await AppDataSource.getRepository(Exam).findBy(where);
    res.json({ exams });
  } catch (err) {
    next(err);
  }
}

export async function getExam(req: Request, res: Response, next: NextFunction) {
  try {
    const exam = await AppDataSource.getRepository(Exam).findOneBy({
      id: req.params.examId,
      isDeleted: false,
    });
    if (!exam) throw new ApiError(404, 'Exam not found');
    res.json({ exam });
  } catch (err) {
    next(err);
  }
}

export async function createExam(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, examType, description, totalQuestions, durationMinutes } = req.body;
    const examRepo = AppDataSource.getRepository(Exam);
    const exam = await examRepo.save(
      examRepo.create({ name, examType, description, totalQuestions, durationMinutes })
    );
    res.status(201).json({ exam });
  } catch (err) {
    next(err);
  }
}

export async function listExamQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const questions = await AppDataSource.getRepository(Question).find({
      where: { examId: req.params.examId, isDeleted: false },
      relations: ['subject', 'topic'],
    });

    // Never send the answer key to the client while a test is in progress —
    // correctOption/explanation are only safe to reveal after submission.
    const safeQuestions = questions.map(({ correctOption, explanation, ...safe }) => safe);

    res.json({ questions: safeQuestions });
  } catch (err) {
    next(err);
  }
}
