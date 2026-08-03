import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { StudentProfile } from './StudentProfile';
import { Exam } from './Exam';
import { StudentAnswer } from './StudentAnswer';

export type MockTestStatus = 'in_progress' | 'completed' | 'abandoned';

@Entity('mock_tests')
export class MockTest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => StudentProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: StudentProfile;

  @Column({ name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => Exam)
  @JoinColumn({ name: 'exam_id' })
  exam!: Exam;

  @Column({ name: 'exam_id' })
  examId!: string;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Column({ name: 'total_score', type: 'numeric', nullable: true })
  totalScore?: number;

  @Column({ name: 'max_score', type: 'numeric' })
  maxScore!: number;

  @Column({ type: 'varchar', default: 'in_progress' })
  status!: MockTestStatus;

  @OneToMany(() => StudentAnswer, (answer) => answer.mockTest)
  answers?: StudentAnswer[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
