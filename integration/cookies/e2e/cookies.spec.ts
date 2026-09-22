import type { INestApplication, NestApplicationOptions } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { createRequire } from 'module';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

const require = createRequire(import.meta.url);
// Reference signer of cookie-parser/express-session. Used to forge cookies
// "signed by an existing Express app" and to emulate cookie-parser below.
const cookieSignature = require('cookie-signature');

const SIMULATE_PARSER_HEADER = 'x-simulate-cookie-parser';

/**
 * Emulates a cookie middleware (cookie-parser / @fastify/cookie) that ran
 * before Nest: populates `req.cookies` and, with a secret, `req.signedCookies`
 * (with `false` for invalid signatures, as cookie-parser does).
 */
function emulateCookieParser(req: any, secret: string) {
  if (!req.headers[SIMULATE_PARSER_HEADER]) {
    return;
  }
  req.cookies = { theme: 'from-middleware' };
  const raw = /(?:^|;\s*)uid=([^;]*)/.exec(req.headers.cookie ?? '')?.[1];
  req.signedCookies = {};
  if (raw !== undefined) {
    const value = decodeURIComponent(raw);
    req.signedCookies.uid = value.startsWith('s:')
      ? cookieSignature.unsign(value.slice(2), secret)
      : false;
  }
}

type AdapterFactory = () => ExpressAdapter | FastifyAdapter;

const adapters: [string, AdapterFactory][] = [
  ['express', () => new ExpressAdapter()],
  ['fastify', () => new FastifyAdapter()],
];

async function createApp(
  createAdapter: AdapterFactory,
  options: NestApplicationOptions,
  parserSecret = 'parser-secret',
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const adapter = createAdapter();
  const app = moduleRef.createNestApplication(adapter, {
    logger: false,
    ...options,
  });
  if (adapter instanceof FastifyAdapter) {
    adapter
      .getInstance()
      .addHook('onRequest', (req: any, _reply: any, done: () => void) => {
        emulateCookieParser(req, parserSecret);
        done();
      });
  } else {
    app.use((req: any, _res: any, next: () => void) => {
      emulateCookieParser(req, parserSecret);
      next();
    });
  }
  await app.init();
  if (adapter instanceof FastifyAdapter) {
    await adapter.getInstance().ready();
  }
  return app;
}

function signedWith(secret: string, value: string) {
  return encodeURIComponent(`s:${cookieSignature.sign(value, secret)}`);
}

function setCookieHeaders(res: request.Response): string[] {
  const header = res.headers['set-cookie'] as unknown as string[] | string;
  return Array.isArray(header) ? header : header ? [header] : [];
}

describe.each(adapters)('Cookies (%s)', (_name, createAdapter) => {
  describe('with a cookie secret', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(createAdapter, {
        cookies: { secret: ['new-secret', 'old-secret'] },
      });
    });

    afterAll(async () => {
      await app.close();
    });

    describe('@Cookies()', () => {
      it('should read all cookies', async () => {
        const res = await request(app.getHttpServer())
          .get('/cookies')
          .set('Cookie', 'theme=dark; lang=en%20US; theme=ignored')
          .expect(200);
        expect(res.body).toEqual({ theme: 'dark', lang: 'en US' });
      });

      it('should read an empty set of cookies', async () => {
        const res = await request(app.getHttpServer())
          .get('/cookies')
          .expect(200);
        expect(res.body).toEqual({});
      });

      it('should read a single cookie', async () => {
        await request(app.getHttpServer())
          .get('/cookies/theme')
          .set('Cookie', 'lang=en; theme=dark')
          .expect(200, { theme: 'dark' });
        await request(app.getHttpServer())
          .get('/cookies/theme')
          .expect(200, { theme: null });
      });

      it('should apply pipes', async () => {
        await request(app.getHttpServer())
          .get('/cookies/count')
          .set('Cookie', 'count=41')
          .expect(200, { count: 41 });
        await request(app.getHttpServer())
          .get('/cookies/count')
          .set('Cookie', 'count=abc')
          .expect(400);
      });

      it('should not expose prototype members', async () => {
        const res = await request(app.getHttpServer())
          .get('/cookies')
          .set('Cookie', '__proto__=x; constructor=y')
          .expect(200);
        // Stored as plain entries, not as prototype mutations.
        expect(res.text).toBe('{"__proto__":"x","constructor":"y"}');
      });

      it('should use req.cookies when a cookie middleware populated it', async () => {
        await request(app.getHttpServer())
          .get('/cookies/theme')
          .set('Cookie', 'theme=from-header')
          .set(SIMULATE_PARSER_HEADER, '1')
          .expect(200, { theme: 'from-middleware' });
      });
    });

    describe('@SignedCookies()', () => {
      it('should read a cookie signed with the current secret', async () => {
        await request(app.getHttpServer())
          .get('/signed/uid')
          .set('Cookie', `uid=${signedWith('new-secret', '42')}`)
          .expect(200, { uid: '42' });
      });

      it('should read a cookie signed with a rotated-out secret', async () => {
        await request(app.getHttpServer())
          .get('/signed/uid')
          .set('Cookie', `uid=${signedWith('old-secret', '42')}`)
          .expect(200, { uid: '42' });
      });

      it('should resolve a tampered cookie to undefined', async () => {
        const tampered = signedWith('new-secret', '42').replace('42', '43');
        await request(app.getHttpServer())
          .get('/signed/uid')
          .set('Cookie', `uid=${tampered}`)
          .expect(200, { uid: null });
      });

      it('should resolve a cookie signed with an unknown secret to undefined', async () => {
        await request(app.getHttpServer())
          .get('/signed/uid')
          .set('Cookie', `uid=${signedWith('unknown', '42')}`)
          .expect(200, { uid: null });
      });

      it('should never return an unsigned value', async () => {
        await request(app.getHttpServer())
          .get('/signed/uid')
          .set('Cookie', 'uid=42')
          .expect(200, { uid: null });
      });

      it('should read all valid signed cookies only', async () => {
        const res = await request(app.getHttpServer())
          .get('/signed')
          .set(
            'Cookie',
            [
              `uid=${signedWith('new-secret', '42')}`,
              `legacy=${signedWith('old-secret', 'yes')}`,
              `forged=${signedWith('unknown', 'no')}`,
              'plain=value',
            ].join('; '),
          )
          .expect(200);
        expect(res.body).toEqual({ uid: '42', legacy: 'yes' });
      });

      it('should verify the Cookie header even when a middleware populated req.cookies', async () => {
        await request(app.getHttpServer())
          .get('/signed/uid')
          .set('Cookie', `uid=${signedWith('new-secret', '42')}`)
          .set(SIMULATE_PARSER_HEADER, '1')
          .expect(200, { uid: '42' });
      });
    });

    describe('setCookie() / clearCookie()', () => {
      it('should set several cookies in one response', async () => {
        const res = await request(app.getHttpServer()).get('/set').expect(200);
        const cookies = setCookieHeaders(res);

        expect(cookies).toHaveLength(3);
        expect(cookies[0]).toBe('a=1; Path=/');
        expect(cookies[1]).toBe(
          'b=two%20words%3B%20x%3Dy; Path=/; Max-Age=60; HttpOnly; SameSite=Lax',
        );
        expect(cookies[2]).toMatch(/^uid=s%3A42\.[^;]+; Path=\/$/);
      });

      it('should round-trip the cookies it sets', async () => {
        const res = await request(app.getHttpServer()).get('/set').expect(200);
        const cookieHeader = setCookieHeaders(res)
          .map(cookie => cookie.split(';')[0])
          .join('; ');

        const all = await request(app.getHttpServer())
          .get('/cookies')
          .set('Cookie', cookieHeader)
          .expect(200);
        expect(all.body.a).toBe('1');
        expect(all.body.b).toBe('two words; x=y');

        await request(app.getHttpServer())
          .get('/signed/uid')
          .set('Cookie', cookieHeader)
          .expect(200, { uid: '42' });
      });

      it('should sign cookies in the format cookie-parser verifies', async () => {
        const res = await request(app.getHttpServer()).get('/set').expect(200);
        const uid = setCookieHeaders(res)[2].split(';')[0].slice('uid='.length);
        const value = decodeURIComponent(uid);
        expect(cookieSignature.unsign(value.slice(2), 'new-secret')).toBe('42');
      });

      it('should clear cookies', async () => {
        const res = await request(app.getHttpServer())
          .get('/clear')
          .expect(200);
        expect(setCookieHeaders(res)).toEqual([
          'a=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
          'b=; Path=/app; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        ]);
      });

      it.each([
        ['a name with CR/LF', { name: 'a\r\nX-Injected: 1', value: 'v' }],
        ['a name with ";"', { name: 'a;b', value: 'v' }],
        ['a path with ";"', { name: 'a', value: 'v', path: '/; Domain=evil' }],
        ['a path with CR/LF', { name: 'a', value: 'v', path: '/\r\nX: 1' }],
        [
          'an invalid domain',
          { name: 'a', value: 'v', domain: 'x.com; Secure' },
        ],
      ])('should reject %s', async (_label, query) => {
        const res = await request(app.getHttpServer())
          .get('/set-custom')
          .query(query)
          .expect(500);
        expect(setCookieHeaders(res)).toEqual([]);
        expect(res.headers['x-injected']).toBeUndefined();
      });

      it('should percent-encode CR/LF and ";" in values', async () => {
        const res = await request(app.getHttpServer())
          .get('/set-custom')
          .query({ name: 'a', value: 'v\r\nX-Injected: 1; Domain=evil' })
          .expect(200);
        expect(setCookieHeaders(res)).toEqual([
          'a=v%0D%0AX-Injected%3A%201%3B%20Domain%3Devil; Path=/',
        ]);
        expect(res.headers['x-injected']).toBeUndefined();
      });
    });
  });

  describe('without a cookie secret', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(createAdapter, {}, 'parser-secret');
    });

    afterAll(async () => {
      await app.close();
    });

    it('should still read plain cookies', async () => {
      await request(app.getHttpServer())
        .get('/cookies/theme')
        .set('Cookie', 'theme=dark')
        .expect(200, { theme: 'dark' });
    });

    it('should fail loudly when reading signed cookies', async () => {
      await request(app.getHttpServer())
        .get('/signed/uid')
        .set('Cookie', `uid=${signedWith('parser-secret', '42')}`)
        .expect(500);
    });

    it('should fail loudly when setting a signed cookie', async () => {
      const res = await request(app.getHttpServer()).get('/set').expect(500);
      expect(
        setCookieHeaders(res).filter(cookie => cookie.startsWith('uid=')),
      ).toEqual([]);
    });

    it('should fall back to req.signedCookies from a cookie middleware', async () => {
      await request(app.getHttpServer())
        .get('/signed/uid')
        .set('Cookie', `uid=${signedWith('parser-secret', '42')}`)
        .set(SIMULATE_PARSER_HEADER, '1')
        .expect(200, { uid: '42' });
      await request(app.getHttpServer())
        .get('/signed/uid')
        .set('Cookie', `uid=${signedWith('other-secret', '42')}`)
        .set(SIMULATE_PARSER_HEADER, '1')
        .expect(200, { uid: null });
    });
  });
});
