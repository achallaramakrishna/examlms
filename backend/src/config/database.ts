import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './env';
import { User } from '../models/User';
import { Subject } from '../models/Subject';
import { TopicHierarchy } from '../models/TopicHierarchy';
import { Exam } from '../models/Exam';
import { Question } from '../models/Question';
import { VectorEmbedding } from '../models/VectorEmbedding';
import { StudentProfile } from '../models/StudentProfile';
import { MockTest } from '../models/MockTest';
import { StudentAnswer } from '../models/StudentAnswer';
import { StudentReview } from '../models/StudentReview';
import { StudentDoubt } from '../models/StudentDoubt';
import { StudyPlan } from '../models/StudyPlan';
import { PerformanceMetrics } from '../models/PerformanceMetrics';
import { AuditLog } from '../models/AuditLog';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.databaseUrl,
  synchronize: false,
  logging: env.nodeEnv === 'development',
  entities: [
    User,
    Subject,
    TopicHierarchy,
    Exam,
    Question,
    VectorEmbedding,
    StudentProfile,
    MockTest,
    StudentAnswer,
    StudentReview,
    StudentDoubt,
    StudyPlan,
    PerformanceMetrics,
    AuditLog,
  ],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  subscribers: [],
  extra: {
    max: env.dbPoolMax,
    idleTimeoutMillis: env.dbPoolIdleTimeoutMs,
  },
});

export async function connectDatabase(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
}
