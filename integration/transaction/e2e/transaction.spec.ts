/**
 * Proves `@Transactional()` provides real atomicity against a genuine
 * TypeORM `DataSource` (using the pure-JS `sqljs` driver, so no external
 * database process is required to run this suite).
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { OrderService } from '../src/order.service.js';

describe('@Transactional() (TypeORM adapter)', () => {
  let app: INestApplication;
  let service: OrderService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    service = app.get(OrderService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('commits both inserts when the whole method succeeds', async () => {
    await service.createOrderPair('sku-a', 'sku-b');

    const rows = await service.findAll();
    expect(rows.map(r => r.sku).sort()).toEqual(['sku-a', 'sku-b']);
  });

  it('rolls back the first insert when the second violates a unique constraint', async () => {
    // Pre-seed a row, committed outside any transaction, that the second
    // insert below will collide with.
    await service.createOrderPair('seed-1', 'seed-2');

    await expect(
      service.createOrderPair('should-not-persist', 'seed-1'),
    ).rejects.toThrow();

    const rows = await service.findAll();
    const skus = rows.map(r => r.sku).sort();

    // The real proof of atomicity: the *first* insert of the failed call
    // actually reached the database and was actually undone — this isn't a
    // spy assertion, it's a fresh SELECT against the same DataSource.
    expect(skus).not.toContain('should-not-persist');
    expect(skus).toEqual(['seed-1', 'seed-2']);
  });

  it('leaves the database usable for a later, unrelated transaction', async () => {
    await expect(service.createOrderPair('dup', 'dup')).rejects.toThrow();

    await service.createOrderPair('after-failure-a', 'after-failure-b');

    const rows = await service.findAll();
    expect(rows.map(r => r.sku).sort()).toEqual([
      'after-failure-a',
      'after-failure-b',
    ]);
  });
});
