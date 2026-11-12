import {
  All,
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  Type,
} from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

const MIDDLEWARE_VALUE = 'middleware';

@Controller('proxy/*')
class LegacyWildcardController {
  @All()
  forward() {
    return 'proxy';
  }
}

@Controller('files/{*path}')
class WildcardController {
  @Get()
  find() {
    return 'files';
  }
}

@Controller('items/{:id}')
class OptionalParamController {
  @Get()
  find() {
    return 'items';
  }
}

const legacyWildcardCase = [
  LegacyWildcardController,
  '/proxy',
  ['/proxy/', '/proxy/a', '/proxy/a/b/'],
] as const;
const otherCases = [
  [WildcardController, '/files', ['/files/', '/files/a', '/files/a/b']],
  [OptionalParamController, '/items', ['/items/', '/items/1']],
] as const;

for (const [name, createAdapter, cases] of [
  ['Express', () => undefined, [legacyWildcardCase, ...otherCases]],
  // The router of Fastify reads the other two paths in its own way
  ['Fastify', () => new FastifyAdapter(), [legacyWildcardCase]],
] as const) {
  describe(`Middleware - controller path ending in an optional segment (${name})`, () => {
    let app: INestApplication;

    const createApp = async (controller: Type<any>, prefix?: string) => {
      @Module({ controllers: [controller] })
      class TestModule {
        configure(consumer: MiddlewareConsumer) {
          consumer
            .apply((req, res, next) => res.end(MIDDLEWARE_VALUE))
            .forRoutes(controller);
        }
      }

      const testingModule = await Test.createTestingModule({
        imports: [TestModule],
      }).compile();
      const adapter = createAdapter() as FastifyAdapter | undefined;
      app = adapter
        ? testingModule.createNestApplication(adapter)
        : testingModule.createNestApplication();
      if (prefix) {
        app.setGlobalPrefix(prefix);
      }
      await app.listen(0, '127.0.0.1');
    };

    afterEach(async () => {
      await app.close();
    });

    for (const [controller, base, urls] of cases) {
      it(`should run on every path of the "${base}" controller, the empty one included`, async () => {
        await createApp(controller);
        for (const url of urls) {
          await request(app.getHttpServer())
            .get(url)
            .expect(200, MIDDLEWARE_VALUE);
        }
        await request(app.getHttpServer())
          .post(`${base}/`)
          .expect(controller === LegacyWildcardController ? 200 : 404);
      });
    }

    it('should run on the empty wildcard under a global prefix', async () => {
      await createApp(LegacyWildcardController, 'api');
      await request(app.getHttpServer())
        .get('/api/proxy/')
        .expect(200, MIDDLEWARE_VALUE);
    });
  });
}
