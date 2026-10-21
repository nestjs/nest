import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

let middlewareCalls = 0;

@Controller('health')
class HealthController {
  @Get()
  root() {
    return 'root';
  }

  @Get('deep/')
  deep() {
    return 'deep';
  }
}

@Controller('open')
class OpenController {
  @Get()
  root() {
    return 'open';
  }
}

@Module({ controllers: [HealthController, OpenController] })
class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => {
        middlewareCalls++;
        res.statusCode = 403;
        res.end('blocked');
      })
      .exclude({ path: 'open', method: RequestMethod.GET })
      .forRoutes(HealthController, OpenController);
  }
}

describe.each([[''], ['api']])(
  'Middleware with strict routing (global prefix "%s")',
  prefix => {
    let app: INestApplication;
    const base = prefix ? `/${prefix}` : '';

    beforeAll(async () => {
      const server = express();
      server.set('strict routing', true);
      app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
        logger: false,
      });
      if (prefix) {
        app.setGlobalPrefix(prefix);
      }
      await listenOnLoopback(app);
    });

    beforeEach(() => {
      middlewareCalls = 0;
    });

    afterAll(async () => {
      await app.close();
    });

    it('should run the middleware for the root route of a controller', async () => {
      await request(app.getHttpServer())
        .get(`${base}/health`)
        .expect(403, 'blocked');
      expect(middlewareCalls).toBe(1);
    });

    it('should run the middleware for a route declared with a trailing slash', async () => {
      await request(app.getHttpServer())
        .get(`${base}/health/deep`)
        .expect(403, 'blocked');
      expect(middlewareCalls).toBe(1);
    });

    it('should still skip the middleware for an excluded root route', async () => {
      await request(app.getHttpServer())
        .get(`${base}/open`)
        .expect(200, 'open');
      expect(middlewareCalls).toBe(0);
    });
  },
);
