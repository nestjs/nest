import { DataSource, type DataSourceOptions } from 'typeorm';
import { Orders1790154512059 } from './migrations/1790154512059-Orders.js';
import { Outbox1790154527507 } from './migrations/1790154527507-Outbox.js';
import { SeedProducts1790156662634 } from './migrations/1790156662634-SeedProducts.js';
import { OrderEntity } from './order.entity.js';
import {
  OutboxDeadLetterEntity,
  OutboxInboxEntity,
  OutboxMessageEntity,
} from './outbox.entities.js';
import { ProductEntity } from './product.entity.js';

/** What the application's TypeOrmModule and the TypeORM CLI share. */
export const dataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    ProductEntity,
    OrderEntity,
    OutboxMessageEntity,
    OutboxDeadLetterEntity,
    OutboxInboxEntity,
  ],
  migrations: [
    Orders1790154512059,
    Outbox1790154527507,
    SeedProducts1790156662634,
  ],
} satisfies DataSourceOptions;

// The TypeORM CLI's data source: `migration:generate` compares the entities with this database.
export default new DataSource(dataSourceOptions);
