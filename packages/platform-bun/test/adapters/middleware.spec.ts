import {
  Controller,
  Get,
  Injectable,
  Module,
  RequestMethod,
  UnauthorizedException,
  Version,
  VERSION_NEUTRAL,
  VersioningType,
  type MiddlewareConsumer,
  type NestMiddleware,
  type NestModule,
} from '@nestjs/common';
import type { BunRequest, BunResponse, NextFunction } from '../../index.js';
import { bootstrap, type TestApp } from './helpers.js';

@Injectable()
class TagMiddleware implements NestMiddleware {
  use(req: BunRequest, res: BunResponse, next: NextFunction) {
    res.setHeader('x-tag', 'class');
    (req as any).tagged = true;
    next();
  }
}

@Controller('mw')
class MwController {
  @Get('tagged')
  tagged() {
    return { ok: true };
  }
  @Get('excluded')
  excluded() {
    return { ok: true };
  }
  @Get('secret')
  secret() {
    return { ok: true };
  }
  @Get('post-only')
  postOnly() {
    return { ok: true };
  }
}

@Module({ controllers: [MwController] })
class MwModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TagMiddleware)
      .exclude('mw/excluded')
      .forRoutes(MwController);
    consumer
      .apply((req: BunRequest, _res: BunResponse, next: NextFunction) => {
        if (req.headers['authorization'] !== 'yes') {
          return next(new UnauthorizedException('nope'));
        }
        next();
      })
      .forRoutes('mw/secret');
    consumer
      .apply((_req: BunRequest, res: BunResponse, next: NextFunction) => {
        res.setHeader('x-post-only', '1');
        next();
      })
      .forRoutes({ path: 'mw/post-only', method: RequestMethod.POST });
  }
}

describe('middleware', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootstrap(MwModule, {
      configure: app => {
        app.use((req: BunRequest, res: BunResponse, next: NextFunction) => {
          res.setHeader('x-global', 'yes');
          if (req.path === '/mw/throw-in-global') {
            throw new Error('global boom');
          }
          next();
        });
      },
    });
  });
  afterAll(() => t.close());

  it('should run global app.use() middleware', async () => {
    const r = await t.fetch('/mw/tagged');
    expect(r.headers.get('x-global')).toBe('yes');
  });

  it('should apply class middleware with forRoutes/exclude', async () => {
    expect((await t.fetch('/mw/tagged')).headers.get('x-tag')).toBe('class');
    expect((await t.fetch('/mw/excluded')).headers.get('x-tag')).toBeNull();
  });

  it('should hand next(err) to the exception filters', async () => {
    const denied = await t.json('/mw/secret');
    expect(denied.status).toBe(401);
    expect(denied.body.message).toBe('nope');
    expect(
      (await t.json('/mw/secret', { headers: { authorization: 'yes' } }))
        .status,
    ).toBe(200);
  });

  it('should run method-scoped middleware for that method only', async () => {
    expect(
      (await t.fetch('/mw/post-only')).headers.get('x-post-only'),
    ).toBeNull();
    expect(
      (await t.fetch('/mw/post-only', { method: 'POST' })).headers.get(
        'x-post-only',
      ),
    ).toBe('1');
  });

  it('should turn errors thrown in framework middleware into a 500 JSON response', async () => {
    const r = await t.json('/mw/throw-in-global');
    expect(r.status).toBe(500);
    expect(r.body).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
  });
});

@Controller('items')
class PrefixedController {
  @Get()
  list() {
    return ['a'];
  }
}

@Controller('health')
class HealthController {
  @Get()
  ok() {
    return 'ok';
  }
}

@Module({ controllers: [PrefixedController, HealthController] })
class PrefixModule {}

describe('global prefix', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await bootstrap(PrefixModule, {
      configure: app => app.setGlobalPrefix('api', { exclude: ['health'] }),
    });
  });
  afterAll(() => t.close());

  it('should prefix routes and honor exclude', async () => {
    expect((await t.json('/api/items')).body).toEqual(['a']);
    expect((await t.fetch('/items')).status).toBe(404);
    expect(await (await t.fetch('/health')).text()).toBe('ok');
    const missing = await t.json('/api/missing');
    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe('Cannot GET /api/missing');
  });
});

@Controller({ path: 'v', version: '1' })
class V1Controller {
  @Get()
  get() {
    return { v: 1 };
  }
}
@Controller({ path: 'v', version: ['2', VERSION_NEUTRAL] })
class V2Controller {
  @Get()
  get() {
    return { v: 2 };
  }
  @Get('only3')
  @Version('3')
  only3() {
    return { v: 3 };
  }
}
@Module({ controllers: [V1Controller, V2Controller] })
class VersionModule {}

describe('versioning', () => {
  it('should support HEADER versioning', async () => {
    const t = await bootstrap(VersionModule, {
      configure: app =>
        app.enableVersioning({
          type: VersioningType.HEADER,
          header: 'X-Api-Version',
        }),
    });
    try {
      expect(
        (await t.json('/v', { headers: { 'x-api-version': '1' } })).body,
      ).toEqual({ v: 1 });
      expect(
        (await t.json('/v', { headers: { 'x-api-version': '2' } })).body,
      ).toEqual({ v: 2 });
      expect((await t.json('/v')).body).toEqual({ v: 2 });
      expect(
        (await t.json('/v/only3', { headers: { 'x-api-version': '3' } })).body,
      ).toEqual({
        v: 3,
      });
      expect((await t.json('/v/only3')).status).toBe(404);
    } finally {
      await t.close();
    }
  });

  it('should support URI versioning', async () => {
    const t = await bootstrap(VersionModule, {
      configure: app => app.enableVersioning({ type: VersioningType.URI }),
    });
    try {
      expect((await t.json('/v1/v')).body).toEqual({ v: 1 });
      expect((await t.json('/v2/v')).body).toEqual({ v: 2 });
      expect((await t.json('/v')).body).toEqual({ v: 2 });
    } finally {
      await t.close();
    }
  });

  it('should support MEDIA_TYPE versioning', async () => {
    const t = await bootstrap(VersionModule, {
      configure: app =>
        app.enableVersioning({ type: VersioningType.MEDIA_TYPE, key: 'v=' }),
    });
    try {
      expect(
        (await t.json('/v', { headers: { accept: 'application/json;v=1' } }))
          .body,
      ).toEqual({
        v: 1,
      });
      expect(
        (await t.json('/v', { headers: { accept: 'application/json;v=2' } }))
          .body,
      ).toEqual({
        v: 2,
      });
    } finally {
      await t.close();
    }
  });
});
