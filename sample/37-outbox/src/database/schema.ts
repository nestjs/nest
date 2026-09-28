import type { OutboxAttempt, OutboxDeadLetterReason } from '@nestjs/outbox';
import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type { OrderItem } from '../orders/order.js';

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** In cents. */
  price: integer('price').notNull(),
  inStock: integer('in_stock').notNull(),
  reserved: integer('reserved').notNull().default(0),
});

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  items: jsonb('items').$type<OrderItem[]>().notNull(),
  /** In cents. */
  total: integer('total').notNull(),
  status: text('status').$type<'placed' | 'cancelled'>().notNull(),
});

// The outbox's tables, read and written by DrizzleOutboxStore.

export const outboxMessages = pgTable(
  'outbox_messages',
  {
    /** Order within a key: numbered at insert, in commit order (DrizzleOutboxStore.add() locks the key). */
    seq: bigint('seq', { mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    id: text('id').notNull().unique(),
    topic: text('topic').notNull(),
    // A null payload is stored as NULL.
    payload: jsonb('payload').$type<unknown>(),
    headers: jsonb('headers').$type<Record<string, string>>().notNull(),
    key: text('key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    history: jsonb('history').$type<OutboxAttempt[]>().notNull().default([]),
    leaseOwner: text('lease_owner'),
    leaseUntil: timestamp('lease_until', { withTimezone: true }),
  },
  // A key's older messages, for the claim's per-key check.
  table => [index('outbox_messages_key_seq').on(table.key, table.seq)],
);

export const outboxDeadLetters = pgTable(
  'outbox_dead_letters',
  {
    id: text('id').primaryKey(),
    /** The message's place in its key, so a requeue puts it back there. */
    seq: bigint('seq', { mode: 'number' }).notNull(),
    topic: text('topic').notNull(),
    payload: jsonb('payload').$type<unknown>(),
    headers: jsonb('headers').$type<Record<string, string>>().notNull(),
    key: text('key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull(),
    lastError: text('last_error'),
    history: jsonb('history').$type<OutboxAttempt[]>().notNull(),
    reason: text('reason').$type<OutboxDeadLetterReason>().notNull(),
    failedAt: timestamp('failed_at', { withTimezone: true }).notNull(),
  },
  table => [
    index('outbox_dead_letters_topic_failed_at').on(
      table.topic,
      table.failedAt,
    ),
  ],
);

export const outboxInbox = pgTable(
  'outbox_inbox',
  {
    consumer: text('consumer').notNull(),
    messageId: text('message_id').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull(),
  },
  table => [
    // One record per consumer and message: the unique key two deliveries meet at.
    primaryKey({ columns: [table.consumer, table.messageId] }),
    index('outbox_inbox_processed_at').on(table.processedAt),
  ],
);
