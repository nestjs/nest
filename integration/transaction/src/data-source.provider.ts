import {
  Inject,
  Injectable,
  OnApplicationShutdown,
  Provider,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Order } from './order.entity.js';

/**
 * This integration test wires TypeORM directly (rather than through
 * `@nestjs/typeorm`) because `@nestjs/typeorm` is published as CJS and its
 * internal `require('@nestjs/core')` resolves a separate module instance
 * from the one this vitest-based integration suite imports as ESM — the
 * same "dual-package hazard" already documented in
 * `vitest.config.integration.mts` for `integration/typeorm` and
 * `integration/mongoose`. Using `typeorm` directly avoids that entirely
 * while still exercising a real `DataSource`/`QueryRunner` (via the pure-JS
 * `sqljs` driver, so no external database process is required).
 */
export const DATA_SOURCE = Symbol('DATA_SOURCE');

export const dataSourceProvider: Provider = {
  provide: DATA_SOURCE,
  useFactory: async () => {
    const dataSource = new DataSource({
      type: 'sqljs',
      autoSave: false,
      synchronize: true,
      entities: [Order],
    });
    await dataSource.initialize();
    return dataSource;
  },
};

@Injectable()
export class DataSourceShutdown implements OnApplicationShutdown {
  constructor(@Inject(DATA_SOURCE) private readonly dataSource: DataSource) {}

  async onApplicationShutdown(): Promise<void> {
    await this.dataSource.destroy();
  }
}
