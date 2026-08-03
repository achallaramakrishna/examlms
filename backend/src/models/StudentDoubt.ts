import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StudentProfile } from './StudentProfile';
import { Question } from './Question';

/** Persisted history of doubts a student has asked the AI assistant. */
@Entity('student_doubts')
export class StudentDoubt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => StudentProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student!: StudentProfile;

  @Column({ name: 'student_id' })
  studentId!: string;

  @ManyToOne(() => Question, { nullable: true })
  @JoinColumn({ name: 'question_id' })
  question?: Question;

  @Column({ name: 'question_id', nullable: true })
  questionId?: string;

  @Column({ name: 'doubt_text', type: 'text' })
  doubtText!: string;

  @Column({ name: 'answer_text', type: 'text', nullable: true })
  answerText?: string;

  /** Question ids the RAG retriever surfaced as context for the answer */
  @Column({ name: 'related_question_ids', type: 'jsonb', default: () => "'[]'" })
  relatedQuestionIds!: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
