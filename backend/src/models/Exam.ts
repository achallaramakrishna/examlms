import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Question } from './Question';

export type ExamType = 'NEET' | 'KCET' | 'JEE';

@Entity('exams')
export class Exam {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ name: 'exam_type', type: 'varchar' })
  examType!: ExamType;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'total_questions', default: 0 })
  totalQuestions!: number;

  @Column({ name: 'duration_minutes', default: 180 })
  durationMinutes!: number;

  @Column({ name: 'is_deleted', default: false })
  isDeleted!: boolean;

  @OneToMany(() => Question, (question) => question.exam)
  questions?: Question[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
