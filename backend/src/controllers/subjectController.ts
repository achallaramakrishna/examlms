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
    const filtered = examType ? subjects.filter((s) => s.examTypes.includes(examType as ExamType)) : subjects;
    res.json({ subjects: filtered });
  } catch (err) {
    next(err);
  }
}

export async function listTopicsForSubject(req: Request, res: Response, next: NextFunction) {
  try {
    const topics = await AppDataSource.getRepository(TopicHierarchy).find({
      where: { subjectId: req.params.subjectId },
      order: { orderIndex: 'ASC', name: 'ASC' },
    });

    const counts = await AppDataSource.getRepository(Question)
      .createQueryBuilder('q')
      .select('q.topic_id', 'topicId')
      .addSelect('COUNT(*)', 'count')
      .where('q.subject_id = :subjectId', { subjectId: req.params.subjectId })
      .andWhere('q.is_deleted = false')
      .andWhere('q.topic_id IS NOT NULL')
      .groupBy('q.topic_id')
      .getRawMany<{ topicId: string; count: string }>();

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
    const topic = await AppDataSource.getRepository(TopicHierarchy).findOneBy({ id: topicId, subjectId });
    if (!topic) throw new ApiError(404, 'Chapter not found');

    const questions = await AppDataSource.getRepository(Question).find({
      where: { topicId, subjectId, isDeleted: false },
      order: { createdAt: 'ASC' },
    });

    const safeQuestions = questions.map(({ correctOption, explanation, learningAid, ...safe }) => {
      // Before the student answers, only send non-spoiling coach fields.
      let preview: Record<string, unknown> | null = null;
      if (learningAid && typeof learningAid === 'object') {
        const aid = learningAid as Record<string, unknown>;
        preview = {
          meta: aid.meta,
          stemHighlights: aid.stemHighlights,
          readQuestionAudio: aid.readQuestionAudio,
          conceptTags: aid.conceptTags,
          given: aid.given,
          find: aid.find,
        };
      }
      return { ...safe, learningAid: preview };
    });

    res.json({ topic, questions: safeQuestions });
  } catch (err) {
    next(err);
  }
}
