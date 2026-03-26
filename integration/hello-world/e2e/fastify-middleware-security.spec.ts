import {
  Controller,
  Get,
  Injectable,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';

/**
 * Security regression tests for @nestjs/platform-fastify middleware bypass
 * vulnerabilities. Each describe block is tied to a specific CVE so a future
 * regression is immediately traceable.
 *
 * CVE-2025-69211  – URL-encoding bypass (TOCTOU): %xx-encoded path segments
 *                   were not decoded before middleware route matching.
 *                   Fixed in @nestjs/platform-fastify@11.1.11
 *
 * CVE-2026-2293   – Path-normalisation bypass: Fastify router options
 *                   (ignoreTrailingSlash, ignoreDuplicateSlashes,
 *                   useSemicolonDelimiter) normalise the URL before dispatch,
 *                   but Nest's middleware regex ran against req.originalUrl,
 *                   creating a fail-open mismatch.
 *                   Fixed in @nestjs/platform-fastify@11.1.14
 *
 * CVE-2026-33011  – HEAD request bypass: Fastify silently aliases HEAD to the
 *                   corresponding GET handler before Nest middleware executes,
 *                   causing middleware to be skipped entirely.
 *                   Fixed in @nestjs/platform-fastify@11.1.16
 */

// ---------------------------------------------------------------------------
// Shared primitives reused across all three describe blocks
// ---------------------------------------------------------------------------

const SECRET_VALUE = 'top-secret';
const AUTH_HEADER = 'x-auth';
const AUTH_TOKEN = 'valid-token';

/** Minimal auth middleware: passes when x-auth header matches, 401 otherwise. */
@Injectable()
class AuthMiddleware {
  use(req: any, res: any, next: () => void) {
    if (req.headers[AUTH_HEADER] === AUTH_TOKEN) {
      return next();
    }
    res.statusCode = 401;
    res.end('Unauthorized');
  }
}

/** Controller with a single GET /secret route protected by AuthMiddleware. */
@Controller()
class SecretController {
  @Get('secret')
  getSecret() {
    return { secret: SECRET_VALUE };
  }
}

// ---------------------------------------------------------------------------
// CVE-2025-69211 – URL-encoding bypass
// ---------------------------------------------------------------------------

@Module({ controllers: [SecretController] })
class AppModuleDefault implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: 'secret', method: RequestMethod.ALL });
  }
}

describe('Fastify middleware security – CVE-2025-69211 (URL-encoding bypass)', () => {
  let app: NestFastifyApplication;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModuleDefault],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  after(async () => {
    await app.close();
  });

  // Baseline: middleware must engage on the canonical path
  it('blocks unauthenticated GET /secret (baseline)', async () => {
    const { statusCode } = await app.inject({
      method: 'GET',
      url: '/secret',
    });
    expect(statusCode).to.equal(401);
  });

  it('allows authenticated GET /secret (baseline)', async () => {
    const { statusCode, payload } = await app.inject({
      method: 'GET',
      url: '/secret',
      headers: { [AUTH_HEADER]: AUTH_TOKEN },
    });
    expect(statusCode).to.equal(200);
    expect(JSON.parse(payload)).to.deep.equal({ secret: SECRET_VALUE });
  });

  // Regression: %73 decodes to 's' → Fastify routes to /secret but
  // pre-patch Nest's middleware regex did NOT match /%73ecret.
  it('blocks GET /%73ecret without auth (%73 → s)', async () => {
    const { statusCode } = await app.inject({
      method: 'GET',
      url: '/%73ecret',
    });
    expect(statusCode).to.equal(401);
  });

  it('allows GET /%73ecret with valid auth (%73 → s)', async () => {
    const { statusCode } = await app.inject({
      method: 'GET',
      url: '/%73ecret',
      headers: { [AUTH_HEADER]: AUTH_TOKEN },
    });
    expect(statusCode).to.equal(200);
  });

  // Double-encode: %2573 → %73 → s
  it('blocks GET /%2573ecret without auth (double-encoded)', async () => {
    const { statusCode } = await app.inject({
      method: 'GET',
      url: '/%2573ecret',
    });
    // Fastify decodes only one level; %2573 stays %73 at the router —
    // the route will 404. Either 401 or 404 is acceptable here as long
    // as it is NOT 200 (which would mean the handler ran without auth).
    expect(statusCode).to.not.equal(200);
  });

  // Uppercase hex: %53 = 'S', but caseSensitive routing (default) means
  // Fastify won't route /Secret → /secret. Verify no unintended 200.
  it('does not expose handler for GET /%53ecret (uppercase hex, case-sensitive)', async () => {
    const { statusCode } = await app.inject({
      method: 'GET',
      url: '/%53ecret',
    });
    expect(statusCode).to.not.equal(200);
  });
});

// ---------------------------------------------------------------------------
// CVE-2026-2293 – Path-normalisation bypass (router options)
// ---------------------------------------------------------------------------

@Module({ controllers: [SecretController] })
class AppModuleRouterOptions implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: 'secret', method: RequestMethod.ALL });
  }
}

describe('Fastify middleware security – CVE-2026-2293 (path-normalisation bypass)', () => {
  let app: NestFastifyApplication;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModuleRouterOptions],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({
        routerOptions: {
          ignoreTrailingSlash: true,
          ignoreDuplicateSlashes: true,
        },
      } as any),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  after(async () => {
    await app.close();
  });

  // Baseline
  it('blocks unauthenticated GET /secret (baseline)', async () => {
    const { statusCode } = await app.inject({
      method: 'GET',
      url: '/secret',
    });
    expect(statusCode).to.equal(401);
  });

  it('allows authenticated GET /secret (baseline)', async () => {
    const { statusCode } = await app.inject({
      method: 'GET',
      url: '/secret',
      headers: { [AUTH_HEADER]: AUTH_TOKEN },
    });
    expect(statusCode).to.equal(200);
  });

  // ignoreTrailingSlash: Fastify routes /secret/ → /secret handler.
  // Pre-patch: middleware regex matched 'secret' but not 'secret/', so
  // the middleware was skipped.
  it('blocks GET /secret/ without auth (ignoreTrailingSlash)', async () => {
    const { statusCode } = await app.inject({
      method: 'GET',
      url: '/secret/',
    });
    expect(statusCode).to.equal(401);
  });

  it('allows GET /secret/ with valid auth (ignoreTrailingSlash)', async () => {
    const { statusCode } = await app.inject({
      method: 'GET',
      url: '/secret/',
      headers: { [AUTH_HEADER]: AUTH_TOKEN },
    });
    expect(statusCode).to.equal(200);
  });

  // ignoreDuplicateSlashes: Fastify routes //secret → /secret handler.
  it('blocks GET //secret without auth (ignoreDuplicateSlashes)', async () => {
    const { statusCode } = await app.inject({
      method: 'GET',
      url: '//secret',
    });
    expect(statusCode).to.equal(401);
  });

  it('allows GET //secret with valid auth (ignoreDuplicateSlashes)', async () => {
    const { statusCode } = await app.inject({
      method: 'GET',
      url: '//secret',
      headers: { [AUTH_HEADER]: AUTH_TOKEN },
    });
    expect(statusCode).to.equal(200);
  });

  // Combination: trailing slash + duplicate slash
  it('blocks GET //secret/ without auth (combined normalisation)', async () => {
    const { statusCode } = await app.inject({
      method: 'GET',
      url: '//secret/',
    });
    expect(statusCode).to.equal(401);
  });
});

// ---------------------------------------------------------------------------
// CVE-2026-2293 addendum – useSemicolonDelimiter
// ---------------------------------------------------------------------------

@Module({ controllers: [SecretController] })
class AppModuleSemicolon implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: 'secret', method: RequestMethod.ALL });
  }
}

describe('Fastify middleware security – CVE-2026-2293 (useSemicolonDelimiter bypass)', () => {
  let app: NestFastifyApplication;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModuleSemicolon],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({
        routerOptions: { useSemicolonDelimiter: true },
      } as any),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  after(async () => {
    await app.close();
  });

  // useSemicolonDelimiter: Fastify treats /secret;foo=bar as /secret.
  it('blocks GET /secret;foo=bar without auth (useSemicolonDelimiter)', async () => {
    const { statusCode } = await app.inject({
      method: 'GET',
      url: '/secret;foo=bar',
    });
    expect(statusCode).to.equal(401);
  });

  it('allows GET /secret;foo=bar with valid auth (useSemicolonDelimiter)', async () => {
    const { statusCode } = await app.inject({
      method: 'GET',
      url: '/secret;foo=bar',
      headers: { [AUTH_HEADER]: AUTH_TOKEN },
    });
    expect(statusCode).to.equal(200);
  });
});

// ---------------------------------------------------------------------------
// CVE-2026-33011 – HEAD request bypass
// ---------------------------------------------------------------------------

@Controller()
class PublicController {
  @Get('public')
  getPublic() {
    return { ok: true };
  }
}

// Middleware is registered for GET only — the fix must ensure HEAD requests
// also pass through the middleware (HEAD→GET alias), without over-applying
// to routes that have no middleware guard at all.
@Module({ controllers: [SecretController, PublicController] })
class AppModuleHead implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: 'secret', method: RequestMethod.GET });
  }
}

describe('Fastify middleware security – CVE-2026-33011 (HEAD request bypass)', () => {
  let app: NestFastifyApplication;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModuleHead],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  after(async () => {
    await app.close();
  });

  // Baseline GET still guarded
  it('blocks unauthenticated GET /secret (baseline)', async () => {
    const { statusCode } = await app.inject({
      method: 'GET',
      url: '/secret',
    });
    expect(statusCode).to.equal(401);
  });

  // Pre-patch: Fastify aliased HEAD → GET internally, before Nest
  // middleware ran. The handler executed and the response body was
  // stripped (as per HTTP spec). Middleware was never called.
  it('blocks unauthenticated HEAD /secret (regression: CVE-2026-33011)', async () => {
    const { statusCode } = await app.inject({
      method: 'HEAD',
      url: '/secret',
    });
    expect(statusCode).to.equal(401);
  });

  it('allows authenticated HEAD /secret', async () => {
    const { statusCode } = await app.inject({
      method: 'HEAD',
      url: '/secret',
      headers: { [AUTH_HEADER]: AUTH_TOKEN },
    });
    // HEAD must return 200 with no body
    expect(statusCode).to.equal(200);
  });

  it('HEAD /secret response has no body (HTTP spec)', async () => {
    const { payload } = await app.inject({
      method: 'HEAD',
      url: '/secret',
      headers: { [AUTH_HEADER]: AUTH_TOKEN },
    });
    expect(payload).to.equal('');
  });

  // Ensure the fix did not break HEAD on a public (unprotected) route
  it('allows unauthenticated HEAD /public (no middleware on this route)', async () => {
    // Validates that the HEAD fix is scoped to middleware-gated routes only
    // and doesn't globally block HEAD requests on unprotected routes.
    const { statusCode } = await app.inject({
      method: 'HEAD',
      url: '/public',
    });
    expect(statusCode).to.equal(200);
  });
});
