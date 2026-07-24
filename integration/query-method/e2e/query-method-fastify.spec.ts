/**
 * E2E tests for the HTTP QUERY method (RFC 10008) — Fastify adapter.
 *
 * Fastify's `app.inject()` accepts any method string, so no special client needed.
 * The Fastify adapter registers QUERY with `addHttpMethod('QUERY', { hasBody: true })`
 * (added in nestjs/nest#17162).
 */
import { HttpStatus } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { QueryMethodModule } from '../src/query-method.module';

describe('QueryMethod (Fastify)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [QueryMethodModule],
    }).compile();

    app = module.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should route QUERY /items to the handler', async () => {
    const response = await app.inject({
      method: 'QUERY' as any,
      url: '/items',
      payload: { name: 'nestjs', page: 1 },
    });

    expect(response.statusCode).to.equal(HttpStatus.OK);
    const json = response.json();
    expect(json.filters).to.deep.equal({ name: 'nestjs', page: 1 });
  });

  it('should route QUERY /items/search to the @QueryMethod("search") handler', async () => {
    const response = await app.inject({
      method: 'QUERY' as any,
      url: '/items/search',
      payload: { name: 'test' },
    });

    expect(response.statusCode).to.equal(HttpStatus.OK);
    const json = response.json();
    expect(json.endpoint).to.equal('search');
    expect(json.filters).to.deep.equal({ name: 'test' });
  });

  it('should return 404 for GET /items (wrong method)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/items',
    });
    expect(response.statusCode).to.equal(HttpStatus.NOT_FOUND);
  });
});
