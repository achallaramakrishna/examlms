import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exam } from './Exam';
import { Subject } from './Subject';
import { TopicHierarchy } from './TopicHierarchy';

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  label: string;
  text: string;
  imageUrl?: string;
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Exam, (exam) => exam.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam!: Exam;

  @Column({ name: 'exam_id' })
  examId!: string;

  @ManyToOne(() => Subject, (subject) => subject.questions)
  @JoinColumn({ name: 'subject_id' })
  subject!: Subject;

  @Column({ name: 'subject_id' })
  subjectId!: string;

  @ManyToOne(() => TopicHierarchy, { nullable: true })
  @JoinColumn({ name: 'topic_id' })
  topic?: TopicHierarchy;

  @Column({ name: 'topic_id', nullable: true })
  topicId?: string;

  @Column({ name: 'question_text', type: 'text' })
  questionText!: string;

  @Column({ name: 'question_image_url', nullable: true })
  questionImageUrl?: string;

  @Column({ type: 'jsonb' })
  options!: QuestionOption[];

  @Column({ name: 'correct_option' })
  correctOption!: string;

  @Column({ type: 'text', nullable: true })
  explanation?: string;

  @Column({ type: 'varchar', default: 'medium' })
  difficulty!: QuestionDifficulty;

  /** e.g. "2023 Paper 1" — where this question was sourced from */
  @Column({ nullable: true })
  source?: string;

  /** e.g. 2023 — the year this question appeared, for past-year filtering */
  @Column({ name: 'previous_year', type: 'int', nullable: true })
  previousYear?: number;

  @Column({ name: 'is_deleted', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
