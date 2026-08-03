import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';

export type AuditAction = 'create' | 'update' | 'delete' | 'login';

/**
 * Generic audit trail. Populated two ways:
 *  - app-level, via services/audit.ts (logAudit()) for actions like 'login'
 *    that have no natural DB trigger
 *  - DB triggers on select tables (mock_tests, student_answers — see
 *    migrations/1700000001000-InitialSchema.ts) for UPDATE/DELETE, which
 *    catch changes regardless of which code path made them
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({ type: 'varchar' })
  action!: AuditAction | string;

  @Column({ name: 'entity_type' })
  entityType!: string;

  @Column({ name: 'entity_id', nullable: true })
  entityId?: string;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue?: Record<string, unknown>;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue?: Record<string, unknown>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
