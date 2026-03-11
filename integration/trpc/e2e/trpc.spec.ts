import { expect } from 'chai';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { GlobalGuard } from '../src/users/users.router';

interface RunningApp {
  app: INestApplication;
  baseUrl: string;
}

async function requestTrpc(
  baseUrl: string,
  path: string,
  method: 'GET' | 'POST',
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const payload = body != null ? JSON.stringify(body) : undefined;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: payload,
  });
  const parsedBody = await response.json();
  return { statusCode: response.status, body: parsedBody };
}

async function createExpressApp(): Promise<RunningApp> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalGuards(app.get(GlobalGuard));

  await app.init();
  await app.listen(0);
  const port = app.getHttpServer().address().port;

  return {
    app,
    baseUrl: `http://localhost:${port}`,
  };
}

async function createFastifyApp(): Promise<RunningApp> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  app.useGlobalGuards(app.get(GlobalGuard));

  await app.init();
  await app.listen(0, '127.0.0.1');
  const address = app.getHttpServer().address();
  if (!address || typeof address === 'string') {
    throw new Error('Fastify server did not bind to a TCP port');
  }

  return {
    app,
    baseUrl: `http://localhost:${address.port}`,
  };
}

function runSharedAdapterSuite(
  label: string,
  createApp: () => Promise<RunningApp>,
) {
  describe(`tRPC Integration (${label})`, () => {
    let running: RunningApp;

    beforeEach(async () => {
      running = await createApp();
    });

    afterEach(async () => {
      await running.app.close();
    });

    it('should respond to tRPC query via GET', async () => {
      const response = await requestTrpc(
        running.baseUrl,
        '/trpc/users.list',
        'GET',
      );

      expect(response.statusCode).to.equal(200);
      expect(response.body.result.data).to.be.an('array');
    });

    it('should respond to tRPC mutation via POST', async () => {
      const response = await requestTrpc(
        running.baseUrl,
        '/trpc/users.create',
        'POST',
        {
          name: 'Charlie',
          email: 'charlie@example.com',
        },
      );

      expect(response.statusCode, JSON.stringify(response.body)).to.equal(200);
      expect(response.body.result.data).to.have.property('name', 'Charlie');
    });

    it('should map guard-denied procedures to FORBIDDEN/403', async () => {
      const response = await requestTrpc(
        running.baseUrl,
        '/trpc/users.blocked',
        'POST',
        {},
      );

      expect(response.statusCode).to.equal(403);
      expect(response.body.error.data.code).to.equal('FORBIDDEN');
    });

    it('should map HttpException to BAD_REQUEST/400', async () => {
      const response = await requestTrpc(
        running.baseUrl,
        '/trpc/users.explode',
        'POST',
        {},
      );

      expect(response.statusCode).to.equal(400);
      expect(response.body.error.data.code).to.equal('BAD_REQUEST');
      expect(String(response.body.error.message)).to.include(
        'invalid user payload',
      );
    });

    it('should apply global guards independently from route guards', async () => {
      const denied = await requestTrpc(
        running.baseUrl,
        '/trpc/users.globalProtected',
        'POST',
        {},
      );
      expect(denied.statusCode).to.equal(403);
      expect(denied.body.error.data.code).to.equal('FORBIDDEN');

      const allowed = await requestTrpc(
        running.baseUrl,
        '/trpc/users.globalProtected',
        'POST',
        {},
        { 'x-global-auth': '1' },
      );
      expect(allowed.statusCode).to.equal(200);
      expect(allowed.body.result.data).to.deep.equal({ ok: true });
    });

    it('should preserve request-scoped provider values per request context', async () => {
      const first = await requestTrpc(
        running.baseUrl,
        '/trpc/users.requestScoped',
        'GET',
        undefined,
        { 'x-request-id': 'req-A' },
      );
      const second = await requestTrpc(
        running.baseUrl,
        '/trpc/users.requestScoped',
        'GET',
        undefined,
        { 'x-request-id': 'req-B' },
      );

      expect(first.statusCode).to.equal(200);
      expect(second.statusCode).to.equal(200);
      expect(first.body.result.data).to.equal('req-A');
      expect(second.body.result.data).to.equal('req-B');
    });
  });
}

runSharedAdapterSuite('Express', createExpressApp);
runSharedAdapterSuite('Fastify', createFastifyApp);
