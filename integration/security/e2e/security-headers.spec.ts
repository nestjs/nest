import { INestApplication } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

const adapters = [
  ['Express', () => new ExpressAdapter()],
  ['Fastify', () => new FastifyAdapter()],
] as const;

const DEFAULT_CSP =
  "default-src 'self';base-uri 'self';font-src 'self' https: data:;" +
  "form-action 'self';frame-ancestors 'self';img-src 'self' data:;" +
  "object-src 'none';script-src 'self';script-src-attr 'none';" +
  "style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests";

const DEFAULT_HEADERS: Record<string, string> = {
  'content-security-policy': DEFAULT_CSP,
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'origin-agent-cluster': '?1',
  'referrer-policy': 'no-referrer',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'x-dns-prefetch-control': 'off',
  'x-download-options': 'noopen',
  'x-frame-options': 'SAMEORIGIN',
  'x-permitted-cross-domain-policies': 'none',
  'x-xss-protection': '0',
};

const expectDefaultHeaders = (headers: Record<string, unknown>) => {
  for (const [name, value] of Object.entries(DEFAULT_HEADERS)) {
    expect(headers[name], name).toBe(value);
  }
  expect(headers['x-powered-by']).toBeUndefined();
  expect(headers['cross-origin-embedder-policy']).toBeUndefined();
};

describe.each(adapters)('Security headers (%s)', (_name, createAdapter) => {
  let app: INestApplication;

  const init = async (configure: (app: INestApplication) => void) => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication(createAdapter());
    configure(app);
    // Listening on the loopback address supertest connects to, rather than
    // letting supertest listen on all interfaces, keeps a process that holds
    // the same port on 127.0.0.1 from answering instead.
    await app.listen(0, '127.0.0.1');
  };

  afterEach(async () => {
    await app?.close();
  });

  describe('with default options', () => {
    beforeEach(() => init(app => app.useSecurityHeaders()));

    it('sets the helmet-equivalent defaults and removes X-Powered-By', async () => {
      const res = await request(app.getHttpServer()).get('/items').expect(200);
      expectDefaultHeaders(res.headers);
    });

    it('sets each header exactly once', async () => {
      const res = await request(app.getHttpServer()).get('/items').expect(200);
      const names = [];
      for (let i = 0; i < res.res.rawHeaders.length; i += 2) {
        names.push(res.res.rawHeaders[i].toLowerCase());
      }
      for (const name of Object.keys(DEFAULT_HEADERS)) {
        expect(
          names.filter(n => n === name),
          name,
        ).toHaveLength(1);
      }
    });

    it('sets them on 404 responses', async () => {
      const res = await request(app.getHttpServer())
        .get('/does-not-exist')
        .expect(404);
      expectDefaultHeaders(res.headers);
    });

    it('sets them on error responses', async () => {
      const res = await request(app.getHttpServer()).get('/error').expect(500);
      expectDefaultHeaders(res.headers);
    });

    it('sets them on Server-Sent Events streams', async () => {
      const res = await request(app.getHttpServer())
        .get('/events')
        .expect(200)
        .expect('Content-Type', /text\/event-stream/);
      expectDefaultHeaders(res.headers);
    });

    it('lets @Header() override a header per route', async () => {
      const res = await request(app.getHttpServer())
        .get('/embeddable')
        .expect(200);
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
      expect(res.headers['content-security-policy']).toBe(DEFAULT_CSP);
    });
  });

  describe.each([
    [
      'useSecurityHeaders() first',
      (app: INestApplication) =>
        app.useSecurityHeaders().enableCsrfProtection(),
    ],
    [
      'enableCsrfProtection() first',
      (app: INestApplication) =>
        app.enableCsrfProtection().useSecurityHeaders(),
    ],
  ])('with CSRF protection, %s', (_order, configure) => {
    beforeEach(() => init(configure));

    it('sets them on responses rejected by the CSRF protection', async () => {
      const res = await request(app.getHttpServer())
        .post('/items')
        .set('Sec-Fetch-Site', 'cross-site')
        .expect(403);
      expectDefaultHeaders(res.headers);
    });

    it('sets them on allowed requests', async () => {
      const res = await request(app.getHttpServer())
        .post('/items')
        .set('Sec-Fetch-Site', 'same-origin')
        .expect(201);
      expectDefaultHeaders(res.headers);
    });
  });

  describe('with custom options', () => {
    beforeEach(() =>
      init(app =>
        app.useSecurityHeaders({
          xFrameOptions: false,
          strictTransportSecurity: { maxAge: 600, preload: true },
          contentSecurityPolicy: {
            directives: {
              scriptSrc: ["'self'", 'https://cdn.example'],
              upgradeInsecureRequests: null,
            },
          },
        }),
      ),
    );

    it('omits disabled headers and applies the configuration', async () => {
      const res = await request(app.getHttpServer()).get('/items').expect(200);
      expect(res.headers['x-frame-options']).toBeUndefined();
      expect(res.headers['strict-transport-security']).toBe(
        'max-age=600; includeSubDomains; preload',
      );
      expect(res.headers['content-security-policy']).toBe(
        DEFAULT_CSP.replace(
          "script-src 'self';",
          "script-src 'self' https://cdn.example;",
        ).replace(';upgrade-insecure-requests', ''),
      );
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('with a report-only policy and X-Powered-By kept', () => {
    beforeEach(() =>
      init(app =>
        app.useSecurityHeaders({
          contentSecurityPolicy: { reportOnly: true },
          xPoweredBy: false,
        }),
      ),
    );

    it('sends Content-Security-Policy-Report-Only', async () => {
      const res = await request(app.getHttpServer()).get('/items').expect(200);
      expect(res.headers['content-security-policy']).toBeUndefined();
      expect(res.headers['content-security-policy-report-only']).toBe(
        DEFAULT_CSP,
      );
      if (app.getHttpAdapter().getType() === 'express') {
        expect(res.headers['x-powered-by']).toBe('Express');
      }
    });
  });

  it('keeps X-Powered-By on Express when the feature is not used', async () => {
    await init(() => undefined);
    const res = await request(app.getHttpServer()).get('/items').expect(200);
    expect(res.headers['content-security-policy']).toBeUndefined();
    if (app.getHttpAdapter().getType() === 'express') {
      expect(res.headers['x-powered-by']).toBe('Express');
    }
  });

  it('rejects an invalid policy at startup', async () => {
    await expect(
      init(app =>
        app.useSecurityHeaders({
          contentSecurityPolicy: {
            directives: { scriptSrc: "'self'; script-src *" },
          },
        }),
      ),
    ).rejects.toThrow(/Content-Security-Policy directive "script-src"/);
  });
});
