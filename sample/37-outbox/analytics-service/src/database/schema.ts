// The analytics service's own tables, for Drizzle and drizzle-kit. Its inbox isn't here: the
// outbox's store keeps it in a schema of its own (nest_outbox).
import {
  bigint,
  index,
  integer,
  pgTable,
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
