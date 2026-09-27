import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { OrderItem } from '../orders/order.js';

@Entity('orders')
export class OrderEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'text', name: 'user_id' })
  userId!: string;

  @Column({ type: 'jsonb' })
  items!: OrderItem[];

  /** In cents. */
  @Column({ type: 'integer' })
  total!: number;

  @Column({ type: 'text' })
  status!: 'placed' | 'cancelled';
}
