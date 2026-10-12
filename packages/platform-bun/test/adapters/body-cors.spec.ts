import { Body, Controller, Module, Post, RawBody, Req } from '@nestjs/common';
import type { BunRequest } from '../../index.js';
import { bootstrap, jsonInit, type TestApp } from './helpers.js';

@Controller('echo')
class EchoController {
  @Post()
  echo(@Body() body: unknown, @RawBody() raw?: Buffer) {
    return {
      body: body ?? null,
      raw: raw ? raw.toString() : null,
      type: typeof body,
    };
  }
  @Post('req')
  viaReq(@Req() req: BunRequest) {
    return { body: req.body ?? null };
  }
}
@Module({ controllers: [EchoController] })
class EchoModule {}

describe('body parsing', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootstrap(EchoModule, { app: { rawBody: true } });
  });
  afterAll(() => t.close());

  it('should parse JSON and expose rawBody', async () => {
    const r = await t.json('/echo', jsonInit('POST', { a: [1, 2] }));
    expect(r.body).toEqual({
      body: { a: [1, 2] },
      raw: '{"a":[1,2]}',
      type: 'object',
    });
  });

  it('should reject invalid JSON with a 400', async () => {
    const r = await t.json('/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad',
    });
    expect(r.status).toBe(400);
    expect(r.body.statusCode).toBe(400);
    expect(r.body.error).toBe('Bad Request');
  });

  it('should reject top-level primitives in strict mode', async () => {
    const r = await t.json('/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '"str"',
    });
    expect(r.status).toBe(400);
  });

  it('should parse urlencoded forms', async () => {
    const r = await t.json('/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'name=Ada+Lovelace&tag=a&tag=b',
    });
    expect(r.body.body).toEqual({ name: 'Ada Lovelace', tag: ['a', 'b'] });
  });

  it('should leave body undefined without a payload or with an unknown type', async () => {
    expect((await t.json('/echo', { method: 'POST' })).body.body).toBeNull();
    const r = await t.json('/echo/req', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'hi',
    });
    expect(r.body.body).toBeNull();
  });

  it('should accept +json media types', async () => {
    const r = await t.json('/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/vnd.api+json' },
      body: '{"x":1}',
    });
    expect(r.body.body).toEqual({ x: 1 });
  });

  it('should enforce the body limit with a 413', async () => {
    const small = await bootstrap(EchoModule, { adapter: { bodyLimit: 16 } });
    try {
      const r = await small.json(
        '/echo',
        jsonInit('POST', { pad: 'x'.repeat(100) }),
      );
      expect(r.status).toBe(413);
    } finally {
      await small.close();
    }
  });

  it('should register extra parsers with bodyParser: false and useBodyParser("text")', async () => {
    const txt = await bootstrap(EchoModule, {
      app: { bodyParser: false },
      configure: app => app.useBodyParser('text'),
    });
    try {
      const r = await txt.json('/echo', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'plain text',
      });
      expect(r.body).toEqual({ body: 'plain text', raw: null, type: 'string' });
      const j = await txt.json('/echo', jsonInit('POST', { a: 1 }));
      expect(j.body.body).toBeNull();
    } finally {
      await txt.close();
    }
  });
});

@Controller('cors')
class CorsController {
  @Post()
  post() {
    return { ok: true };
  }
}
@Module({ controllers: [CorsController] })
class CorsModule {}

describe('cors', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootstrap(CorsModule, {
      configure: app =>
        app.enableCors({
          origin: 'https://app.example',
          credentials: true,
          allowedHeaders: ['x-a'],
          exposedHeaders: ['x-b'],
        }),
    });
  });
  afterAll(() => t.close());

  it('should answer preflight requests', async () => {
    const r = await t.fetch('/cors', {
      method: 'OPTIONS',
      headers: {
        origin: 'https://app.example',
        'access-control-request-method': 'POST',
      },
    });
    expect(r.status).toBe(204);
    expect(r.headers.get('access-control-allow-origin')).toBe(
      'https://app.example',
    );
    expect(r.headers.get('access-control-allow-credentials')).toBe('true');
    expect(r.headers.get('access-control-allow-headers')).toBe('x-a');
  });

  it('should add CORS headers to actual responses', async () => {
    const r = await t.fetch('/cors', {
      method: 'POST',
      headers: { origin: 'https://app.example' },
    });
    expect(r.status).toBe(201);
    expect(r.headers.get('access-control-allow-origin')).toBe(
      'https://app.example',
    );
    expect(r.headers.get('access-control-expose-headers')).toBe('x-b');
    expect(r.headers.get('vary')).toContain('Origin');
  });
});
