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

    // Attach primary subject so clients can browse: exam type → subject → exam.
    const examIds = exams.map((e) => e.id);
    const subjectByExam = new Map<string, { id: string; name: string }>();
    if (examIds.length > 0) {
      const rows: { examId: string; subjectId: string; subjectName: string; cnt: string }[] =
        await AppDataSource.getRepository(Question)
          .createQueryBuilder('q')
          .innerJoin('q.subject', 's')
          .select('q.exam_id', 'examId')
          .addSelect('s.id', 'subjectId')
          .addSelect('s.name', 'subjectName')
          .addSelect('COUNT(*)', 'cnt')
          .where('q.exam_id IN (:...examIds)', { examIds })
          .andWhere('q.is_deleted = false')
          .groupBy('q.exam_id')
          .addGroupBy('s.id')
          .addGroupBy('s.name')
          .orderBy('cnt', 'DESC')
          .getRawMany();

      for (const row of rows) {
        if (!subjectByExam.has(row.examId)) {
          subjectByExam.set(row.examId, { id: row.subjectId, name: row.subjectName });
        }
      }
    }

    res.json({
      exams: exams.map((exam) => ({
        ...exam,
        subject: subjectByExam.get(exam.id) ?? inferSubjectFromName(exam.name),
      })),
    });
  } catch (err) {
    next(err);
  }
}

/** Fallback when an exam has no questions yet — parse "NEET Physics — Chapter". */
function inferSubjectFromName(name: string): { id: string; name: string } | null {
  const match = name.match(/\b(Physics|Chemistry|Biology|Mathematics|Botany|Zoology)\b/i);
  if (!match) return null;
  const raw = match[1];
  const subjectName = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  return { id: '', name: subjectName };
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
