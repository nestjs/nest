import { INestApplication } from '@nestjs/common';
import { ContextIdFactory } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DurableContextIdStrategy } from '../src/durable/durable-context-id.strategy.js';
import { DurableModule } from '../src/durable/durable.module.js';

describe('Durable providers in a forwardRef cycle spanning modules (issue #17562 follow-up)', () => {
  let server: any;
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DurableModule],
    }).compile();

    app = moduleRef.createNestApplication();
    server = app.getHttpServer();
    await app.init();

    ContextIdFactory.apply(new DurableContextIdStrategy());
  });

  afterAll(async () => {
    await app.close();
  });

  const call = (tenantId: number) =>
    request(server)
      .get('/durable/cross-module-forward-ref')
      .set({ 'x-tenant-id': String(tenantId) });

  it('should construct every provider of the cycle for every tenant', async () => {
    for (const tenantId of [43, 44]) {
      const response = await call(tenantId);
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        constructorCalled: true,
        tenantId: String(tenantId),
        elephant: `trumpet from ${tenantId}, lion says roar from ${tenantId}`,
      });
    }

    // durable sub-tree caches the instances; repeat requests must keep working
    const repeated = await call(44);
    expect(repeated.status).toEqual(200);
    expect(repeated.body.constructorCalled).toEqual(true);
  });
});
