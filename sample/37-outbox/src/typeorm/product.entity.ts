import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('products')
export class ProductEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  /** In cents. */
  @Column({ type: 'integer' })
  price!: number;

  @Column({ type: 'integer', name: 'in_stock' })
  inStock!: number;

  @Column({ type: 'integer', default: 0 })
  reserved!: number;
}
