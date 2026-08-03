import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { ExamType } from './Exam';

@Entity('student_profiles')
export class StudentProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, (user) => user.studentProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', unique: true })
  userId!: string;

  @Column({ name: 'target_exam_type', type: 'varchar', nullable: true })
  targetExamType?: ExamType;

  @Column({ name: 'target_exam_date', type: 'date', nullable: true })
  targetExamDate?: string;

  @Column({ name: 'study_hours_per_day', type: 'int', nullable: true })
  studyHoursPerDay?: number;

  /** Subjects/topics the study planner has identified as strong */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  strengths!: string[];

  /** Subjects/topics the study planner has identified as weak */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  weaknesses!: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
