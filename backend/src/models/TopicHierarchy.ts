import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Subject } from './Subject';

/**
 * Self-referential chapter -> topic -> sub-topic tree.
 * level 0 = chapter, 1 = topic, 2 = sub-topic, and so on.
 */
@Entity('topic_hierarchy')
export class TopicHierarchy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Subject, (subject) => subject.topics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_id' })
  subject!: Subject;

  @Column({ name: 'subject_id' })
  subjectId!: string;

  @ManyToOne(() => TopicHierarchy, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent?: TopicHierarchy;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string;

  @Column()
  name!: string;

  @Column({ type: 'int', default: 0 })
  level!: number;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
