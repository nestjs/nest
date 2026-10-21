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
import { expect } from 'chai';
import * as express from 'express';
import * as request from 'supertest';

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

for (const prefix of ['', 'api']) {
  describe(`Middleware with strict routing (global prefix "${prefix}")`, () => {
    let app: INestApplication;
    const base = prefix ? `/${prefix}` : '';

    before(async () => {
      const server = express();
      server.set('strict routing', true);
      app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
        logger: false,
      });
      if (prefix) {
        app.setGlobalPrefix(prefix);
      }
      await app.listen(0, '127.0.0.1');
    });

    beforeEach(() => {
      middlewareCalls = 0;
    });

    after(async () => {
      await app.close();
    });

    it('should run the middleware for the root route of a controller', async () => {
      await request(app.getHttpServer())
        .get(`${base}/health`)
        .expect(403, 'blocked');
      expect(middlewareCalls).to.equal(1);
    });

    it('should run the middleware for a route declared with a trailing slash', async () => {
      await request(app.getHttpServer())
        .get(`${base}/health/deep`)
        .expect(403, 'blocked');
      expect(middlewareCalls).to.equal(1);
    });

    it('should still skip the middleware for an excluded root route', async () => {
      await request(app.getHttpServer())
        .get(`${base}/open`)
        .expect(200, 'open');
      expect(middlewareCalls).to.equal(0);
    });
  });
}
