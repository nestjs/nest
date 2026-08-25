import { INestApplication } from '@nestjs/common';
import { ContextIdFactory } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DurableContextIdStrategy } from '../src/durable/durable-context-id.strategy.js';
import { DurableModule } from '../src/durable/durable.module.js';

describe('Durable providers with forwardRef ctor dependency (issue #17562)', () => {
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
      .get('/durable/forward-ref')
      .set({ 'x-tenant-id': String(tenantId) });

  it('should construct the durable service for every tenant', async () => {
    const first = await call(41);
    expect(first.body).toEqual({
      constructorCalled: true,
      tenantId: '41',
      dog: 'woof from 41',
    });

    const second = await call(42);
    expect(second.body).toEqual({
      constructorCalled: true,
      tenantId: '42',
      dog: 'woof from 42',
    });

    // durable sub-tree caches the instance; a second request must also work
    const secondAgain = await call(42);
    expect(secondAgain.body).toEqual({
      constructorCalled: true,
      tenantId: '42',
      dog: 'woof from 42',
    });
  });
});
