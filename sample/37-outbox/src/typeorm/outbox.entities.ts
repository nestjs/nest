import type { OutboxAttempt, OutboxDeadLetterReason } from '@nestjs/outbox';
import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

// The outbox's tables, read and written by TypeOrmOutboxStore. Every column states its
// type, so the entities load the same with or without emitted decorator metadata (the
// TypeORM CLI runs them through tsx, which emits none).

/** What a `jsonb` column holds (shallow: TypeORM's deep partial types can't take a recursive one). */
export type Json = object | string | number | boolean | null;

@Entity('outbox_messages')
// A key's older messages, for the claim's per-key check.
@Index('outbox_messages_key_seq', ['key', 'seq'])
export class OutboxMessageEntity {
  /** Order within a key: numbered at insert, in commit order (TypeOrmOutboxStore.add() locks the key). */
  @PrimaryGeneratedColumn('identity', {
    type: 'bigint',
    generatedIdentity: 'BY DEFAULT',
  })
  seq: string;

  @Column({ type: 'text', unique: true })
  id: string;

  @Column({ type: 'text' })
  topic: string;

  // A null payload is stored as NULL.
  @Column({ type: 'jsonb', nullable: true })
  payload: Json;

  @Column({ type: 'jsonb' })
  headers: Record<string, string>;

  @Column({ type: 'text', nullable: true })
  key: string | null;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'available_at' })
  availableAt: Date;

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  history: OutboxAttempt[];

  @Column({ type: 'text', name: 'lease_owner', nullable: true })
  leaseOwner: string | null;

  @Column({ type: 'timestamptz', name: 'lease_until', nullable: true })
  leaseUntil: Date | null;
}

@Entity('outbox_dead_letters')
@Index('outbox_dead_letters_topic_failed_at', ['topic', 'failedAt'])
export class OutboxDeadLetterEntity {
  @PrimaryColumn({ type: 'text' })
  id: string;

  /** The message's place in its key, so a requeue puts it back there. */
  @Column({ type: 'bigint' })
  seq: string;

  @Column({ type: 'text' })
  topic: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Json;

  @Column({ type: 'jsonb' })
  headers: Record<string, string>;

  @Column({ type: 'text', nullable: true })
  key: string | null;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'integer' })
  attempts: number;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError: string | null;

  @Column({ type: 'jsonb' })
  history: OutboxAttempt[];

  @Column({ type: 'text' })
  reason: OutboxDeadLetterReason;

  @Column({ type: 'timestamptz', name: 'failed_at' })
  failedAt: Date;
}

@Entity('outbox_inbox')
@Index('outbox_inbox_processed_at', ['processedAt'])
export class OutboxInboxEntity {
  // One record per consumer and message: the unique key two deliveries meet at.
  @PrimaryColumn({ type: 'text' })
  consumer: string;

  @PrimaryColumn({ type: 'text', name: 'message_id' })
  messageId: string;

  @Column({ type: 'timestamptz', name: 'processed_at' })
  processedAt: Date;
}
