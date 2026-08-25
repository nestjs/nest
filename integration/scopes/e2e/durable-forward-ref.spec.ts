import { INestApplication } from '@nestjs/common';
import { ContextIdFactory } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { DurableContextIdStrategy } from '../src/durable/durable-context-id.strategy';
import { DurableModule } from '../src/durable/durable.module';

describe('Durable providers with forwardRef ctor dependency (issue #17562)', () => {
  let server: any;
  let app: INestApplication;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DurableModule],
    }).compile();

    app = moduleRef.createNestApplication();
    server = app.getHttpServer();
    await app.init();

    ContextIdFactory.apply(new DurableContextIdStrategy());
  });

  after(async () => {
    await app.close();
  });

  const call = (tenantId: number) =>
    request(server)
      .get('/durable/forward-ref')
      .set({ 'x-tenant-id': String(tenantId) });

  it('should construct the durable service for every tenant', async () => {
    const first = await call(41);
    expect(first.body).to.deep.equal({
      constructorCalled: true,
      tenantId: '41',
      dog: 'woof from 41',
    });

    const second = await call(42);
    expect(second.body).to.deep.equal({
      constructorCalled: true,
      tenantId: '42',
      dog: 'woof from 42',
    });

    // durable sub-tree caches the instance; a second request must also work
    const secondAgain = await call(42);
    expect(secondAgain.body).to.deep.equal({
      constructorCalled: true,
      tenantId: '42',
      dog: 'woof from 42',
    });
  });
});
