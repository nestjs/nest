// The order API's tables, for Drizzle and drizzle-kit. The webhooks' and the outbox's tables
// aren't here: their stores create them in schemas of their own (nest_webhooks, nest_outbox).
import { integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import type { OrderItem, OrderStatus } from '../orders/order.js';

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** In cents. */
  price: integer('price').notNull(),
});

/** The cat shelters and resellers that buy in bulk over the store's API, and receive its webhooks. */
export const partners = pgTable('partners', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  /** SHA-256 of the partner's API key, hex. */
  apiKeyHash: text('api_key_hash').notNull().unique(),
});

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  partnerId: text('partner_id')
    .notNull()
    .references(() => partners.id),
  items: jsonb('items').$type<OrderItem[]>().notNull(),
  /** In cents. */
  total: integer('total').notNull(),
  status: text('status').$type<OrderStatus>().notNull(),
  paymentId: text('payment_id'),
  trackingNumber: text('tracking_number'),
});
