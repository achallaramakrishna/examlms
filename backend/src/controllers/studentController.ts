import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { StudentProfile } from '../models/StudentProfile';
import { MockTest } from '../models/MockTest';
import { Question } from '../models/Question';
import { StudentAnswer } from '../models/StudentAnswer';
import { PerformanceMetrics } from '../models/PerformanceMetrics';
import { ApiError } from '../middleware/errorHandler';

// NEET marking scheme: +4 for a correct answer, -1 for a wrong one, 0 for
// an unattempted question.
const MARKS_CORRECT = 4;
const MARKS_WRONG = -1;

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await AppDataSource.getRepository(StudentProfile).findOneBy({ userId: req.user!.id });
    if (!profile) throw new ApiError(404, 'Student profile not found');
    res.json({ profile });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profileRepo = AppDataSource.getRepository(StudentProfile);
    const profile = await profileRepo.findOneBy({ userId: req.user!.id });
    if (!profile) throw new ApiError(404, 'Student profile not found');

    Object.assign(profile, req.body);
    await profileRepo.save(profile);

    res.json({ profile });
  } catch (err) {
    next(err);
  }
}

export async function startMockTest(req: Request, res: Response, next: NextFunction) {
  try {
    const { examId } = req.body as { examId: string };
    const profile = await AppDataSource.getRepository(StudentProfile).findOneBy({ userId: req.user!.id });
    if (!profile) throw new ApiError(404, 'Student profile not found');

    const questionCount = await AppDataSource.getRepository(Question).countBy({ examId, isDeleted: false });

    const mockTest = await AppDataSource.getRepository(MockTest).save(
      AppDataSource.getRepository(MockTest).create({
        studentId: profile.id,
        examId,
        startedAt: new Date(),
        maxScore: questionCount * MARKS_CORRECT,
        status: 'in_progress',
      })
    );

    res.status(201).json({ mockTest });
  } catch (err) {
    next(err);
  }
}

/** answers: { [questionId]: selectedOptionLabel } */
export async function submitMockTest(req: Request, res: Response, next: NextFunction) {
  try {
    const { mockTestId } = req.params;
    const { answers } = req.body as { answers: Record<string, string> };

    const mockTestRepo = AppDataSource.getRepository(MockTest);
    const mockTest = await mockTestRepo.findOneBy({ id: mockTestId });
    if (!mockTest) throw new ApiError(404, 'Mock test not found');

    const questions = await AppDataSource.getRepository(Question).find({
      where: { examId: mockTest.examId, isDeleted: false },
    });

    let correct = 0;
    let marks = 0;
    const bySubject = new Map<string, { correct: number; attempted: number }>();
    const answerRepo = AppDataSource.getRepository(StudentAnswer);

    for (const q of questions) {
      const selectedOption = answers[q.id];
      if (selectedOption === undefined) continue;

      const isCorrect = selectedOption === q.correctOption;
      if (isCorrect) {
        correct += 1;
        marks += MARKS_CORRECT;
      } else {
        marks += MARKS_WRONG;
      }

      const stats = bySubject.get(q.subjectId) ?? { correct: 0, attempted: 0 };
      stats.attempted += 1;
      if (isCorrect) stats.correct += 1;
      bySubject.set(q.subjectId, stats);

      await answerRepo.save(
        answerRepo.create({
          mockTestId: mockTest.id,
          questionId: q.id,
          selectedOption,
          isCorrect,
        })
      );
    }

    mockTest.totalScore = marks;
    mockTest.completedAt = new Date();
    mockTest.status = 'completed';
    await mockTestRepo.save(mockTest);

    const metricsRepo = AppDataSource.getRepository(PerformanceMetrics);
    for (const [subjectId, stats] of bySubject) {
      await metricsRepo.save(
        metricsRepo.create({
          studentId: mockTest.studentId,
          mockTestId: mockTest.id,
          subjectId,
          accuracyPercent: (stats.correct / stats.attempted) * 100,
          questionsAttempted: stats.attempted,
          questionsCorrect: stats.correct,
        })
      );
    }

    res.json({ mockTest, score: marks, maxScore: mockTest.maxScore, correctCount: correct, totalQuestions: questions.length });
  } catch (err) {
    next(err);
  }
}
