import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  DeleteDateColumn,
} from 'typeorm';
import { StudentProfile } from './StudentProfile';

export type UserRole = 'student' | 'admin';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash?: string;

  @Column({ name: 'oauth_provider', nullable: true })
  oauthProvider?: string;

  @Column({ name: 'oauth_id', nullable: true })
  oauthId?: string;

  @Column({ name: 'full_name' })
  fullName!: string;

  @Column({ type: 'varchar', default: 'student' })
  role!: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @OneToOne(() => StudentProfile, (profile) => profile.user)
  studentProfile?: StudentProfile;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
