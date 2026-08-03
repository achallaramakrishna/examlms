import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { TopicHierarchy } from './TopicHierarchy';
import { Question } from './Question';
import { ExamType } from './Exam';

@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** e.g. "Physics", "Chemistry", "Biology" */
  @Column({ unique: true })
  name!: string;

  /** e.g. "PHY", "CHEM", "BIO" */
  @Column({ unique: true })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  /** Which exam tracks this subject applies to — e.g. Physics spans all three, Botany is NEET/KCET-only. */
  @Column({ name: 'exam_types', type: 'simple-array', default: '' })
  examTypes!: ExamType[];

  @OneToMany(() => TopicHierarchy, (topic) => topic.subject)
  topics?: TopicHierarchy[];

  @OneToMany(() => Question, (question) => question.subject)
  questions?: Question[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
