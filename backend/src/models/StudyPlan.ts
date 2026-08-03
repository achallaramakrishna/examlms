import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StudentProfile } from './StudentProfile';
import { Exam } from './Exam';

export interface StudyPlanContent {
  weeklyFocus: { week: number; topics: string[]; goal: string }[];
  dailyHours: number;
  notes: string;
}

/** A persisted, AI-generated study plan. Regenerating creates a new row and deactivates the old one. */
@Entity('study_plans')
export class StudyPlan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => StudentProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: StudentProfile;

  @Column({ name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => Exam, { nullable: true })
  @JoinColumn({ name: 'target_exam_id' })
  targetExam?: Exam;

  @Column({ name: 'target_exam_id', nullable: true })
  targetExamId?: string;

  @Column({ type: 'jsonb' })
  plan!: StudyPlanContent;

  @CreateDateColumn({ name: 'generated_at' })
  generatedAt!: Date;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;
}
