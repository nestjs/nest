import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  INestApplication,
  RequestMethod,
} from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as http from 'http';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

const HOST = 'app.example';

const adapters = [
  ['Express', () => new ExpressAdapter()],
  ['Fastify', () => new FastifyAdapter()],
] as const;

@Catch(ForbiddenException)
class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: ForbiddenException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const body = {
      type: 'about:blank',
      title: 'Forbidden',
      status: 403,
      detail: exception.message,
    };
    // Express and Fastify responses both expose `status()`; only the method
    // that sends a JSON body differs.
    const reply = response.status(403);
    'json' in reply
      ? reply.type('application/problem+json').json(body)
      : reply.type('application/problem+json').send(body);
  }
}

describe.each(adapters)('CSRF protection (%s)', (_name, createAdapter) => {
  let app: INestApplication;

  const init = async (
    configure: (app: INestApplication) => void | Promise<void>,
  ) => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication(createAdapter());
    await configure(app);
    // Listening on the loopback address supertest connects to, rather than
    // letting supertest listen on all interfaces, keeps a process that holds
    // the same port on 127.0.0.1 from answering instead.
    await app.listen(0, '127.0.0.1');
    return app;
  };

  afterEach(async () => {
    await app?.close();
  });

  describe('with default options', () => {
    beforeEach(() => init(app => app.enableCsrfProtection()));

    it('rejects a cross-site POST with 403 before the route runs', () => {
      return request(app.getHttpServer())
        .post('/items')
        .set('Host', HOST)
        .set('Sec-Fetch-Site', 'cross-site')
        .set('Origin', 'https://evil.example')
        .send({ name: 'x' })
        .expect(403)
        .expect({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Cross-origin request detected from Sec-Fetch-Site header',
        });
    });

    it('rejects a same-site (sibling subdomain) PUT', () => {
      return request(app.getHttpServer())
        .put('/items')
        .set('Host', HOST)
        .set('Sec-Fetch-Site', 'same-site')
        .expect(403);
    });

    it('allows a same-origin POST', () => {
      return request(app.getHttpServer())
        .post('/items')
        .set('Host', HOST)
        .set('Sec-Fetch-Site', 'same-origin')
        .set('Origin', `https://${HOST}`)
        .send({ name: 'x' })
        .expect(201)
        .expect({ created: true, body: { name: 'x' } });
    });

    it('allows a POST without Sec-Fetch-Site and Origin (non-browser)', () => {
      return request(app.getHttpServer())
        .post('/items')
        .set('Host', HOST)
        .expect(201);
    });

    it('allows a POST whose Origin matches Host (no Sec-Fetch-Site)', () => {
      return request(app.getHttpServer())
        .post('/items')
        .set('Host', HOST)
        .set('Origin', `https://${HOST}`)
        .expect(201);
    });

    it('rejects a POST whose Origin does not match Host (no Sec-Fetch-Site)', () => {
      return request(app.getHttpServer())
        .post('/items')
        .set('Host', HOST)
        .set('Origin', 'https://evil.example')
        .expect(403)
        .expect(res =>
          expect(res.body.message).toMatch(/Origin does not match Host/),
        );
    });

    it('always allows GET', () => {
      return request(app.getHttpServer())
        .get('/items')
        .set('Host', HOST)
        .set('Sec-Fetch-Site', 'cross-site')
        .set('Origin', 'https://evil.example')
        .expect(200);
    });

    it('runs before guards', () => {
      return request(app.getHttpServer())
        .post('/guarded')
        .set('Host', HOST)
        .set('Sec-Fetch-Site', 'cross-site')
        .expect(403);
    });

    it('runs before body parsing', () => {
      return request(app.getHttpServer())
        .post('/items')
        .set('Host', HOST)
        .set('Sec-Fetch-Site', 'cross-site')
        .set('Content-Type', 'application/json')
        .send('{not json')
        .expect(403);
    });

    it('protects unmatched routes as well', () => {
      return request(app.getHttpServer())
        .post('/does-not-exist')
        .set('Host', HOST)
        .set('Sec-Fetch-Site', 'cross-site')
        .expect(403);
    });
  });

  describe('with trusted origins and exclusions', () => {
    beforeEach(() =>
      init(app => {
        app.setGlobalPrefix('api');
        app.enableCsrfProtection({
          trustedOrigins: ['https://admin.example'],
          exclude: [
            { path: 'webhooks/*path', method: RequestMethod.POST },
            { path: 'hooks/github', method: RequestMethod.POST },
          ],
        });
      }),
    );

    it('allows a cross-site POST from a trusted origin', () => {
      return request(app.getHttpServer())
        .post('/api/items')
        .set('Host', HOST)
        .set('Sec-Fetch-Site', 'cross-site')
        .set('Origin', 'https://admin.example')
        .expect(201);
    });

    it('allows an Origin mismatch from a trusted origin', () => {
      return request(app.getHttpServer())
        .post('/api/items')
        .set('Host', HOST)
        .set('Origin', 'https://admin.example')
        .expect(201);
    });

    it('still rejects other origins', () => {
      return request(app.getHttpServer())
        .post('/api/items')
        .set('Host', HOST)
        .set('Sec-Fetch-Site', 'cross-site')
        .set('Origin', 'https://evil.example')
        .expect(403);
    });

    it('allows an excluded route (declared without the global prefix)', () => {
      return request(app.getHttpServer())
        .post('/api/webhooks/stripe')
        .set('Host', HOST)
        .set('Sec-Fetch-Site', 'cross-site')
        .set('Origin', 'https://api.stripe.example')
        .expect(201)
        .expect({ received: true });
    });

    it('only excludes the exact route', async () => {
      const post = (path: string) =>
        request(app.getHttpServer())
          .post(path)
          .set('Host', HOST)
          .set('Sec-Fetch-Site', 'cross-site')
          .set('Origin', 'https://github.example');

      await post('/api/hooks/github').expect(201, { handler: 'github' });
      // Fastify routes these to "github/:event" (with an empty "event") and
      // ":provider"; Express routes them to "github". Either way, they are
      // not the excluded path.
      await post('/api/hooks/github/').expect(403);
      await post('/api/hooks/GITHUB').expect(403);
      await post('/api/hooks/github/push').expect(403);
      await post('/api/hooks/gitlab').expect(403);
      // Declared without the global prefix, the exclusion does not match the
      // unprefixed path.
      await post('/hooks/github').expect(403);
      await post('/api/hooks/github?x=1').expect(201);
    });

    it('does not exclude non-canonical paths', async () => {
      // A raw request, as supertest resolves dot segments before sending.
      const post = (path: string) =>
        new Promise<number>((resolve, reject) => {
          const { port } = app.getHttpServer().address();
          http
            .request(
              {
                host: '127.0.0.1',
                port,
                path,
                method: 'POST',
                headers: { host: HOST, 'sec-fetch-site': 'cross-site' },
              },
              res => resolve(res.resume().statusCode!),
            )
            .on('error', reject)
            .end();
        });

      expect(await post('/api/webhooks/stripe')).toBe(201);
      expect(await post('/api/webhooks/stripe/../../items')).toBe(403);
      expect(await post('/api/webhooks/%2e%2e/%2e%2e/items')).toBe(403);
      expect(await post('/api//hooks/github')).toBe(403);
      expect(await post('/api/hooks/github;x')).toBe(403);
    });
  });

  describe('with a global exception filter', () => {
    beforeEach(() =>
      init(app => {
        app.useGlobalFilters(new ProblemDetailsFilter());
        app.enableCsrfProtection();
      }),
    );

    it('lets exception filters shape the 403 response', () => {
      return request(app.getHttpServer())
        .post('/items')
        .set('Host', HOST)
        .set('Sec-Fetch-Site', 'cross-site')
        .expect(403)
        .expect('Content-Type', /application\/problem\+json/)
        .expect(res =>
          expect(res.body).toEqual({
            type: 'about:blank',
            title: 'Forbidden',
            status: 403,
            detail: 'Cross-origin request detected from Sec-Fetch-Site header',
          }),
        );
    });
  });

  it('throws when enabled after init', async () => {
    await init(() => undefined);
    expect(() => app.enableCsrfProtection()).toThrow(
      /must be called before app\.init\(\)/,
    );
  });
});
