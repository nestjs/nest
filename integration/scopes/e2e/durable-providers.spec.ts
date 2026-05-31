import { INestApplication } from '@nestjs/common';
import { ContextIdFactory } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { DurableContextIdStrategy } from '../src/durable/durable-context-id.strategy';
import { DurableModule } from '../src/durable/durable.module';

describe('Durable providers', () => {
  const OVERLAP_REQUEST_COUNT = 1000;
  let server: any;
  let app: INestApplication;
  let baseUrl: string;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [DurableModule],
    }).compile();

    app = moduleRef.createNestApplication();
    server = app.getHttpServer();
    await app.listen(0);
    baseUrl = await app.getUrl();

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

    const performHttpCallAsync = (
      tenantId: number,
      endpoint = '/durable',
      opts: {
        forceError: boolean;
      } = { forceError: false },
    ) =>
      request(baseUrl)
        .get(endpoint)
        .set({ ['x-tenant-id']: String(tenantId) })
        .set({ ['x-force-error']: opts.forceError ? 'true' : 'false' });

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

    it(`should preserve request context across overlapping requests from different tenants`, async function () {
      this.timeout(20000);
      const tenantIds = Array.from(
        { length: OVERLAP_REQUEST_COUNT },
        (_, index) => index + 21,
      );

      const responses = await Promise.all(
        tenantIds.map(tenantId =>
          performHttpCallAsync(tenantId, '/durable/request-context'),
        ),
      );

      expect(responses.map(response => response.statusCode)).to.deep.equal(
        tenantIds.map(() => 200),
      );
      expect(responses.map(response => response.body)).to.deep.equal(
        tenantIds.map(tenantId => ({
          durableService: String(tenantId),
          nonDurableService: String(tenantId),
        })),
      );
    });

    it(`should reuse the durable subtree across overlapping requests for the same tenant`, async function () {
      this.timeout(20000);
      const tenantId = 31;

      const responses = await Promise.all(
        Array.from({ length: OVERLAP_REQUEST_COUNT }, () =>
          performHttpCallAsync(tenantId),
        ),
      );

      const counters = responses
        .map(response => Number(response.text.match(/Counter: (\d+)/)?.[1]))
        .sort((left, right) => left - right);

      expect(responses.map(response => response.statusCode)).to.deep.equal(
        Array.from({ length: OVERLAP_REQUEST_COUNT }, () => 200),
      );
      expect(counters).to.deep.equal(
        Array.from({ length: OVERLAP_REQUEST_COUNT }, (_, index) => index + 1),
      );
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
