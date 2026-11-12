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
import { NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

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

describe.each([
  ['Express', () => undefined, [legacyWildcardCase, ...otherCases]],
  // The router of Fastify reads the other two paths in its own way
  ['Fastify', () => new FastifyAdapter(), [legacyWildcardCase]],
  ['node', () => new NodeAdapter(), [legacyWildcardCase, ...otherCases]],
] as const)(
  'Middleware - controller path ending in an optional segment (%s)',
  (_, createAdapter, cases) => {
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
      const adapter = createAdapter() as
        FastifyAdapter | NodeAdapter | undefined;
      app = adapter
        ? testingModule.createNestApplication(adapter)
        : testingModule.createNestApplication();
      if (prefix) {
        app.setGlobalPrefix(prefix);
      }
      await listenOnLoopback(app);
    };

    afterEach(async () => {
      await app.close();
    });

    it.each(cases.map(([controller, base, urls]) => [base, controller, urls]))(
      'should run on every path of the "%s" controller, the empty one included',
      async (base, controller, urls) => {
        await createApp(controller);
        for (const url of urls) {
          await request(app.getHttpServer())
            .get(url)
            .expect(200, MIDDLEWARE_VALUE);
        }
        await request(app.getHttpServer())
          .post(`${base}/`)
          .expect(controller === LegacyWildcardController ? 200 : 404);
      },
    );

    it('should run on the empty wildcard under a global prefix', async () => {
      await createApp(LegacyWildcardController, 'api');
      await request(app.getHttpServer())
        .get('/api/proxy/')
        .expect(200, MIDDLEWARE_VALUE);
    });
  },
);
