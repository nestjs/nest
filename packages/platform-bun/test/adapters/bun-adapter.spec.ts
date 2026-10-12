import {
  Controller,
  Get,
  Header,
  Injectable,
  type MiddlewareConsumer,
  Module,
  type NestMiddleware,
  type NestModule,
  Version,
  VersioningType,
} from '@nestjs/common';
import type { BunRequest, BunResponse, NextFunction } from '../../index.js';
import { bootstrap, isBun, type TestApp } from './helpers.js';

@Injectable()
class CountingMiddleware implements NestMiddleware {
  use(req: BunRequest, res: BunResponse, next: NextFunction) {
    const count = Number(res.getHeader('x-mw-count') ?? 0) + 1;
    res.setHeader('x-mw-count', String(count));
    next();
  }
}

@Controller()
class AppController {
  @Get()
  root() {
    return { root: true };
  }

  @Get('items')
  items() {
    return { items: [] };
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('problem')
  @Header('Content-Type', 'application/problem+json')
  problem() {
    return { statusCode: 400, message: 'bad' };
  }
}

@Module({ controllers: [AppController] })
class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CountingMiddleware).forRoutes('*');
  }
}

@Controller('cats')
class CatsController {
  @Get()
  @Version('1')
  v1() {
    return { version: 1 };
  }

  @Get()
  @Version('2')
  v2() {
    return { version: 2 };
  }
}

@Module({ controllers: [CatsController] })
class CatsModule {}

describe('BunAdapter', () => {
  describe('global prefix with wildcard middleware', () => {
    let t: TestApp;
    beforeAll(async () => {
      t = await bootstrap(AppModule, {
        inProcess: true,
        configure: app => app.setGlobalPrefix('api', { exclude: ['health'] }),
      });
    });
    afterAll(() => t.close());

    it('should run the middleware exactly once on the bare prefix', async () => {
      const res = await t.fetch('/api');
      expect(res.status).toBe(200);
      expect(res.headers.get('x-mw-count')).toBe('1');
    });

    it('should run the middleware exactly once below the prefix', async () => {
      const res = await t.fetch('/api/items');
      expect(res.status).toBe(200);
      expect(res.headers.get('x-mw-count')).toBe('1');
    });

    it('should serve excluded routes outside the prefix', async () => {
      const res = await t.json('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('should route a method miss on an excluded route to the exception layer', async () => {
      const res = await t.json('/health', { method: 'POST' });
      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toContain('application/json');
      expect(res.body).toMatchObject({ statusCode: 404 });
    });

    it('should keep "+json" content types for error-shaped bodies', async () => {
      const res = await t.fetch('/api/problem');
      expect(res.headers.get('content-type')).toContain(
        'application/problem+json',
      );
    });
  });

  describe('media type versioning', () => {
    let t: TestApp;
    beforeAll(async () => {
      t = await bootstrap(CatsModule, {
        inProcess: true,
        configure: app =>
          app.enableVersioning({ type: VersioningType.MEDIA_TYPE, key: 'v=' }),
      });
    });
    afterAll(() => t.close());

    it('should read the version from any media range of the Accept header', async () => {
      const res = await t.json('/cats', {
        headers: { accept: 'text/html, application/json;q=0.9;v=2' },
      });
      expect(res.body).toEqual({ version: 2 });
    });

    it('should fall through to 404 when no version matches', async () => {
      const res = await t.json('/cats', {
        headers: { accept: 'application/json;v=3' },
      });
      expect(res.status).toBe(404);
    });
  });

  describe.runIf(isBun)('view locals', () => {
    it('should merge app locals, response locals and render data', async () => {
      const t = await bootstrap(AppModule, { inProcess: true });
      try {
        const adapter = t.adapter;
        let received: object | undefined;
        adapter.setViewEngine({
          render: (_file, data) => {
            received = data;
            return 'ok';
          },
        });
        adapter.setBaseViewsDir(__dirname);
        adapter.setLocal('site', 'nest');
        const res = { locals: { user: 'ada' }, type: () => res, send: vi.fn() };
        await adapter.render(res as any, 'helpers.ts', { page: 1 });
        expect(received).toEqual({ site: 'nest', user: 'ada', page: 1 });
        expect(res.send).toHaveBeenCalledWith('ok');
      } finally {
        await t.close();
      }
    });
  });
});
