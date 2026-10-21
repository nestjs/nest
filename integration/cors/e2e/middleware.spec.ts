import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
  UnauthorizedException,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { expect } from 'chai';
import * as request from 'supertest';

const middlewareCalls: string[] = [];

@Controller()
class AppController {
  @Get()
  getRoot() {
    return 'ok';
  }

  @Get('ended')
  getEnded() {
    return 'unreachable';
  }
}

@Module({ controllers: [AppController] })
class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => {
        middlewareCalls.push(req.method);
        if ((req.originalUrl ?? req.url).startsWith('/ended')) {
          res.statusCode = 418;
          res.end();
          return;
        }
        if (!req.headers.authorization) {
          throw new UnauthorizedException();
        }
        next();
      })
      .forRoutes(AppController);
  }
}

const adapters = [
  ['Express', () => new ExpressAdapter()],
  ['Fastify', () => new FastifyAdapter()],
] as const;

for (const [adapterName, createAdapter] of adapters) {
  describe(`CORS and middleware (${adapterName})`, () => {
    const setups: [string, () => Promise<INestApplication>][] = [
      [
        'enableCors()',
        async () => {
          const app = await NestFactory.create(AppModule, createAdapter(), {
            logger: false,
          });
          app.enableCors({ origin: '*' });
          return app;
        },
      ],
      [
        'the cors option',
        () =>
          NestFactory.create(AppModule, createAdapter(), {
            logger: false,
            cors: { origin: '*' },
          }),
      ],
      [
        'enableCors() with an options delegate',
        async () => {
          const app = await NestFactory.create(AppModule, createAdapter(), {
            logger: false,
          });
          app.enableCors((_req, cb) => cb(null, { origin: '*' }));
          return app;
        },
      ],
    ];

    if (adapterName === 'Fastify') {
      // As `register()` would, the function is called for the options
      setups.push([
        'enableCors() with an options factory',
        async () => {
          const app = await NestFactory.create(AppModule, createAdapter(), {
            logger: false,
          });
          app.enableCors((() => ({ origin: '*' })) as any);
          return app;
        },
      ]);
    }

    for (const [setupName, createApp] of setups) {
      describe(`with ${setupName}`, () => {
        let app: INestApplication;

        before(async () => {
          app = await createApp();
          await app.listen(0, '127.0.0.1');
        });

        beforeEach(() => {
          middlewareCalls.length = 0;
        });

        after(async () => {
          await app.close();
        });

        it('should add the CORS headers to the error response of a middleware', async () => {
          await request(app.getHttpServer())
            .get('/')
            .set('Origin', 'https://example.com')
            .expect(401)
            .expect('access-control-allow-origin', '*');
        });

        it('should add the CORS headers to a response a middleware ends', async () => {
          await request(app.getHttpServer())
            .get('/ended')
            .set('Origin', 'https://example.com')
            .expect(418)
            .expect('access-control-allow-origin', '*');
        });

        it('should answer a preflight request before the middleware', async () => {
          await request(app.getHttpServer())
            .options('/')
            .set('Origin', 'https://example.com')
            .set('Access-Control-Request-Method', 'GET')
            .set('Access-Control-Request-Headers', 'authorization')
            .expect(204)
            .expect('access-control-allow-origin', '*')
            .expect('access-control-allow-headers', 'authorization');
          expect(middlewareCalls).to.deep.equal([]);
        });

        it('should add the CORS headers to a response the handler sends', async () => {
          await request(app.getHttpServer())
            .get('/')
            .set('Origin', 'https://example.com')
            .set('Authorization', 'Bearer token')
            .expect(200, 'ok')
            .expect('access-control-allow-origin', '*');
        });
      });
    }
  });
}

describe('CORS and middleware (Fastify, another hook)', () => {
  let app: INestApplication;

  before(async () => {
    app = await NestFactory.create(AppModule, new FastifyAdapter(), {
      logger: false,
    });
    app.enableCors({ origin: '*', hook: 'preHandler' });
    await app.listen(0, '127.0.0.1');
  });

  after(async () => {
    await app.close();
  });

  it('should still add the CORS headers in that hook', async () => {
    await request(app.getHttpServer())
      .get('/')
      .set('Origin', 'https://example.com')
      .set('Authorization', 'Bearer token')
      .expect(200, 'ok')
      .expect('access-control-allow-origin', '*');
  });
});
