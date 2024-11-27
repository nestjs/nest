import { INestApplication } from '@nestjs/common';
import { ContextIdFactory } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { DurableContextIdStrategy } from '../src/durable/durable-context-id.strategy';
import { DurableModule } from '../src/durable/durable.module';

describe('Durable providers', () => {
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

  describe('when service is durable', () => {
    const performHttpCall = (
      tenantId: number,
      end: (err?: any) => void,
      endpoint = '/durable',
      opts: {
        forceError: boolean;
      } = { forceError: false },
    ) =>
      request(server)
        .get(endpoint)
        .set({ ['x-tenant-id']: String(tenantId) })
        .set({ ['x-force-error']: opts.forceError ? 'true' : 'false' })
        .end((err, res) => {
          if (err) return end(err);
          end(res);
        });

    it(`should share durable providers per tenant`, async () => {
      let result: request.Response;
      result = await new Promise<request.Response>(resolve =>
        performHttpCall(1, resolve),
      );
      expect(result.text).equal('Hello world! Counter: 1');

      result = await new Promise<request.Response>(resolve =>
        performHttpCall(1, resolve),
      );
      expect(result.text).equal('Hello world! Counter: 2');

      result = await new Promise<request.Response>(resolve =>
        performHttpCall(1, resolve),
      );
      expect(result.text).equal('Hello world! Counter: 3');
    });

    it(`should create per-tenant DI sub-tree`, async () => {
      let result: request.Response;
      result = await new Promise<request.Response>(resolve =>
        performHttpCall(4, resolve),
      );
      expect(result.text).equal('Hello world! Counter: 1');

      result = await new Promise<request.Response>(resolve =>
        performHttpCall(5, resolve),
      );
      expect(result.text).equal('Hello world! Counter: 1');

      result = await new Promise<request.Response>(resolve =>
        performHttpCall(6, resolve),
      );
      expect(result.text).equal('Hello world! Counter: 1');
    });

    it(`should register a custom per-tenant request payload`, async () => {
      let result: request.Response;
      result = await new Promise<request.Response>(resolve =>
        performHttpCall(1, resolve, '/durable/echo'),
      );
      expect(result.body).deep.equal({ tenantId: '1' });

      result = await new Promise<request.Response>(resolve =>
        performHttpCall(3, resolve, '/durable/echo'),
      );
      expect(result.body).deep.equal({ tenantId: '3' });
    });

    it(`should return the same tenantId both from durable request scoped service and non-durable request scoped service`, async () => {
      let result: request.Response;
      result = await new Promise<request.Response>(resolve =>
        performHttpCall(1, resolve, '/durable/request-context'),
      );
      expect(result.body).deep.equal({
        durableService: '1',
        nonDurableService: '1',
      });

      result = await new Promise<request.Response>(resolve =>
        performHttpCall(2, resolve, '/durable/request-context'),
      );
      expect(result.body).deep.equal({
        durableService: '2',
        nonDurableService: '2',
      });
    });

    it(`should not cache durable providers that throw errors`, async () => {
      let result: request.Response;

      result = await new Promise<request.Response>(resolve =>
        performHttpCall(10, resolve, '/durable/echo', { forceError: true }),
      );

      expect(result.statusCode).equal(412);

      // The second request should be successful
      result = await new Promise<request.Response>(resolve =>
        performHttpCall(10, resolve, '/durable/echo'),
      );

      expect(result.body).deep.equal({ tenantId: '10' });
    });
  });

  after(async () => {
    ContextIdFactory['strategy'] = undefined;
    await app.close();
  });
});
