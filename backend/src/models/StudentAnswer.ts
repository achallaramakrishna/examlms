import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MockTest } from './MockTest';
import { Question } from './Question';

/** One row per question attempted within a mock test. */
@Entity('student_answers')
export class StudentAnswer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => MockTest, (mockTest) => mockTest.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mock_test_id' })
  mockTest!: MockTest;

  @Column({ name: 'mock_test_id' })
  mockTestId!: string;

  @ManyToOne(() => Question)
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ name: 'question_id' })
  questionId!: string;

  /** null = skipped */
  @Column({ name: 'selected_option', nullable: true })
  selectedOption?: string;

  @Column({ name: 'is_correct', nullable: true })
  isCorrect?: boolean;

  @Column({ name: 'time_taken_sec', type: 'int', nullable: true })
  timeTakenSec?: number;

  @CreateDateColumn({ name: 'answered_at' })
  answeredAt!: Date;
}
