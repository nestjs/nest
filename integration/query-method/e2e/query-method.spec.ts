/**
 * E2E tests for the HTTP QUERY method (RFC 10008) — Express adapter.
 *
 * supertest/superagent don't expose a .query() HTTP-method shorthand, so we
 * use Node's native http.request() which accepts any method string.
 * Node.js 22 recognises QUERY natively via llhttp 9.2 (RFC 10008).
 */
import * as http from 'http';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { QueryMethodModule } from '../src/query-method.module';

function httpRequest(
  url: string,
  method: string,
  body?: string,
): Promise<{ statusCode: number; json: any }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: Number(parsed.port),
      path: parsed.pathname,
      method,
      headers: body
        ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          }
        : {},
    };
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode!,
          json: data ? JSON.parse(data) : null,
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

describe('QueryMethod (Express)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [QueryMethodModule],
    }).compile();

    app = module.createNestApplication();
    await app.listen(0);
    const port = (app.getHttpServer().address() as { port: number }).port;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(async () => {
    await app.close();
  });

  it('should route QUERY /items to the handler', async () => {
    const { statusCode, json } = await httpRequest(
      `${baseUrl}/items`,
      'QUERY',
      JSON.stringify({ name: 'nestjs', page: 1 }),
    );

    expect(statusCode).to.equal(HttpStatus.OK);
    expect(json.filters).to.deep.equal({ name: 'nestjs', page: 1 });
  });

  it('should route QUERY /items/search to the @QueryMethod("search") handler', async () => {
    const { statusCode, json } = await httpRequest(
      `${baseUrl}/items/search`,
      'QUERY',
      JSON.stringify({ name: 'test' }),
    );

    expect(statusCode).to.equal(HttpStatus.OK);
    expect(json.endpoint).to.equal('search');
    expect(json.filters).to.deep.equal({ name: 'test' });
  });

  it('should return 404 for GET /items (wrong method)', async () => {
    const { statusCode } = await httpRequest(`${baseUrl}/items`, 'GET');
    expect(statusCode).to.equal(HttpStatus.NOT_FOUND);
  });
});
