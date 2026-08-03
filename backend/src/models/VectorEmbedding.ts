import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Question } from './Question';
import { vectorTransformer } from './transformers/vectorTransformer';

/**
 * One current embedding per question. The `embedding` column's real
 * Postgres type is `vector(1536)` (pgvector), created via raw SQL in the
 * migration — TypeORM has no native vector column type, so it's declared
 * here as `text` and (de)serialized through vectorTransformer.
 */
@Entity('vector_embeddings')
export class VectorEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ name: 'question_id', unique: true })
  questionId!: string;

  @Column({ type: 'text', transformer: vectorTransformer })
  embedding!: number[];

  @Column({ name: 'model_name', default: 'text-embedding-3-small' })
  modelName!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
