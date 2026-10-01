// The order API's tables, for Drizzle and drizzle-kit. The outbox's tables aren't here: its
// store creates them in a schema of its own (nest_outbox).
import { integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
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
