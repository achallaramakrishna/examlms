import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Subject } from '../models/Subject';
import { TopicHierarchy } from '../models/TopicHierarchy';
import { Question } from '../models/Question';
import { ExamType } from '../models/Exam';
import { ApiError } from '../middleware/errorHandler';

export async function listSubjects(req: Request, res: Response, next: NextFunction) {
  try {
    const { examType } = req.query as { examType?: string };
    const subjects = await AppDataSource.getRepository(Subject).find({ order: { name: 'ASC' } });
    let filtered = examType
      ? subjects.filter((s) => s.examTypes.includes(examType as ExamType))
      : subjects;

    // For practice browsing, only show subjects that actually have questions
    // for the selected exam track — avoids empty Botany/Zoology tabs.
    if (examType) {
      const rows = await AppDataSource.getRepository(Question)
        .createQueryBuilder('q')
        .innerJoin('q.exam', 'e')
        .select('DISTINCT q.subject_id', 'subjectId')
        .where('q.is_deleted = false')
        .andWhere('e.is_deleted = false')
        .andWhere('e.exam_type = :examType', { examType })
        .getRawMany<{ subjectId: string }>();
      const withContent = new Set(rows.map((r) => r.subjectId));
      filtered = filtered.filter((s) => withContent.has(s.id));
    }

    res.json({ subjects: filtered });
  } catch (err) {
    next(err);
  }
}

export async function listTopicsForSubject(req: Request, res: Response, next: NextFunction) {
  try {
    const { examType } = req.query as { examType?: string };
    const topics = await AppDataSource.getRepository(TopicHierarchy).find({
      where: { subjectId: req.params.subjectId },
      order: { orderIndex: 'ASC', name: 'ASC' },
    });

    const countsQb = AppDataSource.getRepository(Question)
      .createQueryBuilder('q')
      .select('q.topic_id', 'topicId')
      .addSelect('COUNT(*)', 'count')
      .where('q.subject_id = :subjectId', { subjectId: req.params.subjectId })
      .andWhere('q.is_deleted = false')
      .andWhere('q.topic_id IS NOT NULL');

    if (examType) {
      countsQb
        .innerJoin('q.exam', 'e')
        .andWhere('e.exam_type = :examType', { examType })
        .andWhere('e.is_deleted = false');
    }

    const counts = await countsQb.groupBy('q.topic_id').getRawMany<{ topicId: string; count: string }>();

    const countByTopic = new Map(counts.map((c) => [c.topicId, Number(c.count)]));
    const topicsWithCounts = topics.map((t) => ({ ...t, questionCount: countByTopic.get(t.id) ?? 0 }));

    res.json({ topics: topicsWithCounts });
  } catch (err) {
    next(err);
  }
}

/** Questions for a single chapter, for practice mode — never includes the answer key. */
export async function listTopicQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const { subjectId, topicId } = req.params;
    const { examType } = req.query as { examType?: string };
    const topic = await AppDataSource.getRepository(TopicHierarchy).findOneBy({ id: topicId, subjectId });
    if (!topic) throw new ApiError(404, 'Chapter not found');

    const qb = AppDataSource.getRepository(Question)
      .createQueryBuilder('q')
      .where('q.topic_id = :topicId', { topicId })
      .andWhere('q.subject_id = :subjectId', { subjectId })
      .andWhere('q.is_deleted = false')
      .orderBy('q.created_at', 'ASC');

    if (examType) {
      qb.innerJoin('q.exam', 'e')
        .andWhere('e.exam_type = :examType', { examType })
        .andWhere('e.is_deleted = false');
    }

    const questions = await qb.getMany();
    const safeQuestions = questions.map(({ correctOption, explanation, ...safe }) => safe);

    res.json({ topic, questions: safeQuestions });
  } catch (err) {
    next(err);
  }
}
