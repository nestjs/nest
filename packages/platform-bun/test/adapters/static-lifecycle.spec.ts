import { Body, Controller, Get, Module, Post, Res } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BunAdapter, type BunResponse } from '../../index.js';
import { bootstrap, isBun, sleep, type TestApp } from './helpers.js';

@Controller()
class RootController {
  @Get()
  root() {
    return { root: true };
  }
  @Post('echo')
  echo(@Body() body: unknown) {
    return { echo: body };
  }
  @Get('cookie')
  cookie(@Res() res: BunResponse) {
    res.cookie('a', '1', { httpOnly: true, sameSite: 'lax' });
    res.cookie('b', 'two words', { maxAge: 60_000 });
    res.status(200).json({ ok: true });
  }
  @Get('slow')
  async slow() {
    await sleep(150);
    return { slow: true };
  }
}
@Module({ controllers: [RootController] })
class RootModule {}

describe.runIf(isBun)('static assets', () => {
  let t: TestApp;
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'nestbun-static-'));
    await writeFile(join(dir, 'index.html'), '<h1>home</h1>');
    await writeFile(join(dir, 'app.js'), 'console.log(1)');
    await mkdir(join(dir, 'docs'));
    await writeFile(join(dir, 'docs', 'index.html'), 'docs home');
    await writeFile(join(dir, '.secret'), 'nope');
    t = await bootstrap(RootModule, {
      configure: (app, adapter) => {
        adapter.useStaticAssets(dir, { prefix: '/public', maxAge: 60_000 });
      },
    });
  });
  afterAll(() => t.close());

  it('should serve files with content type, caching and ETag', async () => {
    const r = await t.fetch('/public/app.js');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('javascript');
    expect(r.headers.get('cache-control')).toBe('public, max-age=60');
    expect(r.headers.get('etag')).toMatch(/^W\//);
    expect(await r.text()).toBe('console.log(1)');

    const etag = r.headers.get('etag')!;
    const cached = await t.fetch('/public/app.js', {
      headers: { 'if-none-match': etag },
    });
    expect(cached.status).toBe(304);
  });

  it('should serve directory indexes and redirect bare directories', async () => {
    expect(await (await t.fetch('/public/')).text()).toBe('<h1>home</h1>');
    const redirect = await t.fetch('/public/docs', { redirect: 'manual' });
    expect(redirect.status).toBe(301);
    expect(redirect.headers.get('location')).toBe('/public/docs/');
    expect(await (await t.fetch('/public/docs/')).text()).toBe('docs home');
  });

  it('should fall through to Nest for misses and block traversal and dotfiles', async () => {
    expect((await t.fetch('/public/nope.txt')).status).toBe(404);
    expect((await t.fetch('/public/..%2F..%2Fetc%2Fpasswd')).status).toBe(404);
    expect((await t.fetch('/public/.secret')).status).toBe(404);
    expect((await t.json('/')).body).toEqual({ root: true });
  });
});

describe('lifecycle & cookies', () => {
  it.runIf(isBun)(
    'should listen on a random port, report its URL and close',
    async () => {
      const t = await bootstrap(RootModule);
      expect(t.url).toMatch(/^http:\/\/(127\.0\.0\.1|\[::1\]|localhost):\d+$/);
      expect((await t.json('/')).body).toEqual({ root: true });
      await t.close();
      await expect(fetch(t.url + '/')).rejects.toThrow();
    },
  );

  it('should set multiple cookies as separate headers', async () => {
    const t = await bootstrap(RootModule);
    try {
      const r = await t.fetch('/cookie');
      const cookies = r.headers.getSetCookie();
      expect(cookies).toHaveLength(2);
      expect(cookies[0]).toBe('a=1; Path=/; HttpOnly; SameSite=Lax');
      expect(cookies[1]).toMatch(
        /^b=two%20words; Max-Age=60; Path=\/; Expires=/,
      );
    } finally {
      await t.close();
    }
  });

  it('should run in-process with adapter.fetch() and no socket', async () => {
    const adapter = new BunAdapter();
    const moduleRef = await Test.createTestingModule({
      imports: [RootModule],
    }).compile();
    const app = moduleRef.createNestApplication(adapter, { logger: false });
    await app.init();
    try {
      const res = await adapter.fetch(new Request('http://localhost/'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ root: true });
      // In-process requests have no Content-Length header; the body must still be parsed.
      const posted = await adapter.fetch(
        new Request('http://localhost/echo', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ a: 1 }),
        }),
      );
      expect(posted.status).toBe(201);
      expect(await posted.json()).toEqual({ echo: { a: 1 } });
      const missing = await adapter.fetch(
        new Request('http://localhost/x', { method: 'DELETE' }),
      );
      expect(missing.status).toBe(404);
    } finally {
      await app.close();
    }
  });

  it.runIf(isBun)(
    'should drop in-flight requests on close with forceCloseConnections',
    async () => {
      const t = await bootstrap(RootModule, {
        app: { forceCloseConnections: true },
      });
      // Capture the outcome immediately so the rejection is never unhandled.
      const outcome = t.fetch('/slow').then(
        () => 'resolved',
        (err: Error) => err,
      );
      await sleep(20);
      await t.close();
      expect(await outcome).toBeInstanceOf(Error);
    },
  );

  it.runIf(isBun)(
    'should reject listening twice on the same port',
    async () => {
      const a = await bootstrap(RootModule);
      const port = new URL(a.url).port;
      const adapter = new BunAdapter();
      const moduleRef = await Test.createTestingModule({
        imports: [RootModule],
      }).compile();
      const app = moduleRef.createNestApplication(adapter, { logger: false });
      try {
        await expect(app.listen(Number(port))).rejects.toThrow();
      } finally {
        await app.close().catch(() => {});
        await a.close();
      }
    },
  );
});
