import { Response, NextFunction, Request } from 'express';
import { AppDataSource } from '../config/database';
import { StudentProfile } from '../models/StudentProfile';
import { PerformanceMetrics } from '../models/PerformanceMetrics';
import { Subject } from '../models/Subject';
import { StudyPlan } from '../models/StudyPlan';
import { User } from '../models/User';
import { ApiError } from '../middleware/errorHandler';
import { getAdvisorRecommendation } from '../services/aiagents/studentAdvisorAgent';
import { generateStudyPlan } from '../services/aiagents/studyPlannerAgent';

async function loadProfile(userId: string) {
  const profile = await AppDataSource.getRepository(StudentProfile).findOneBy({ userId });
  if (!profile) throw new ApiError(404, 'Student profile not found');
  return profile;
}

export async function getMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await loadProfile(req.user!.id);
    const metrics = await AppDataSource.getRepository(PerformanceMetrics).find({
      where: { studentId: profile.id },
      relations: ['subject', 'topic'],
      order: { recordedAt: 'DESC' },
      take: 50,
    });
    res.json({ metrics });
  } catch (err) {
    next(err);
  }
}

export async function getRecommendation(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await loadProfile(req.user!.id);
    const user = await AppDataSource.getRepository(User).findOneBy({ id: req.user!.id });

    const recentMetrics = await AppDataSource.getRepository(PerformanceMetrics).find({
      where: { studentId: profile.id },
      relations: ['subject'],
      order: { recordedAt: 'DESC' },
      take: 10,
    });

    const bySubject = new Map<string, { correct: number; attempted: number }>();
    for (const m of recentMetrics) {
      const subjectName = m.subject?.name ?? 'Unknown';
      const stats = bySubject.get(subjectName) ?? { correct: 0, attempted: 0 };
      stats.correct += m.questionsCorrect;
      stats.attempted += m.questionsAttempted;
      bySubject.set(subjectName, stats);
    }

    const recommendation = await getAdvisorRecommendation({
      studentName: user?.fullName ?? 'Student',
      targetExamName: profile.targetExamType,
      recentPerformance: Array.from(bySubject.entries()).map(([subject, s]) => ({
        subject,
        accuracyPercent: Math.round((s.correct / s.attempted) * 100),
        questionsAttempted: s.attempted,
      })),
    });

    res.json({ recommendation });
  } catch (err) {
    next(err);
  }
}

export async function getPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await loadProfile(req.user!.id);

    if (!profile.targetExamType || !profile.targetExamDate) {
      throw new ApiError(400, 'Set a target exam and exam date before generating a study plan');
    }

    const daysUntilExam = Math.max(
      1,
      Math.ceil((new Date(profile.targetExamDate).getTime() - Date.now()) / 86_400_000)
    );

    // Resolve subject ids on strengths/weaknesses to human-readable names for the prompt
    const subjects = await AppDataSource.getRepository(Subject).find();
    const subjectName = (idOrName: string) => subjects.find((s) => s.id === idOrName)?.name ?? idOrName;

    const plan = await generateStudyPlan({
      targetExamName: profile.targetExamType,
      daysUntilExam,
      studyHoursPerDay: profile.studyHoursPerDay ?? 2,
      strengths: profile.strengths.map(subjectName),
      weaknesses: profile.weaknesses.map(subjectName),
    });

    const planRepo = AppDataSource.getRepository(StudyPlan);
    await planRepo.update({ studentId: profile.id, isActive: true }, { isActive: false });
    await planRepo.save(planRepo.create({ studentId: profile.id, plan, isActive: true }));

    res.json({ plan });
  } catch (err) {
    next(err);
  }
}
