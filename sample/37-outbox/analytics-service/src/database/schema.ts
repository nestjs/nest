import {
  bigint,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const orderEvents = pgTable(
  'order_events',
  {
    /** Arrival order. */
    seq: bigint('seq', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    orderId: text('order_id').notNull(),
    event: text('event').$type<'placed' | 'cancelled'>().notNull(),
    /** The change to revenue, in cents: the order's total when placed, minus it when cancelled. */
    amount: integer('amount').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  table => [index('order_events_order_id').on(table.orderId)],
);

// The inbox, read and written by DrizzleInboxStore: the message ids this service has processed.
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
