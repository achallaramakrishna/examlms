import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StudentProfile } from './StudentProfile';
import { MockTest } from './MockTest';
import { Subject } from './Subject';
import { TopicHierarchy } from './TopicHierarchy';

@Entity('performance_metrics')
export class PerformanceMetrics {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => StudentProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: StudentProfile;

  @Column({ name: 'student_id' })
  studentId!: string;

  /** Null when this row is an aggregate/overall metric, not tied to one test */
  @ManyToOne(() => MockTest, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mock_test_id' })
  mockTest?: MockTest;

  @Column({ name: 'mock_test_id', nullable: true })
  mockTestId?: string;

  @ManyToOne(() => Subject, { nullable: true })
  @JoinColumn({ name: 'subject_id' })
  subject?: Subject;

  @Column({ name: 'subject_id', nullable: true })
  subjectId?: string;

  @ManyToOne(() => TopicHierarchy, { nullable: true })
  @JoinColumn({ name: 'topic_id' })
  topic?: TopicHierarchy;

  @Column({ name: 'topic_id', nullable: true })
  topicId?: string;

  @Column({ name: 'accuracy_percent', type: 'numeric' })
  accuracyPercent!: number;

  @Column({ name: 'avg_time_per_question_sec', type: 'numeric', nullable: true })
  avgTimePerQuestionSec?: number;

  @Column({ name: 'questions_attempted', type: 'int' })
  questionsAttempted!: number;

  @Column({ name: 'questions_correct', type: 'int' })
  questionsCorrect!: number;

  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt!: Date;
}
