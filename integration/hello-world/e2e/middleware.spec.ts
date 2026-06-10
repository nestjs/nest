import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
  Req,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Middleware', () => {
  describe('should return expected values depending on the route', () => {
    let app: INestApplication;

    const RETURN_VALUE = 'test';
    const SCOPED_VALUE = 'test_scoped';
    const WILDCARD_VALUE = 'test_wildcard';
    const EXCLUDE_VALUE = 'test_exclude';

    @Controller()
    class TestController {
      @Get('test')
      test() {
        return RETURN_VALUE;
      }

      @Get('tests/wildcard_nested')
      wildcard_nested() {
        return RETURN_VALUE;
      }

      @Get('legacy-wildcard/overview')
      legacyWildcard() {
        return RETURN_VALUE;
      }

      @Get('exclude')
      exclude() {
        return EXCLUDE_VALUE;
      }
    }

    @Module({
      imports: [AppModule],
      controllers: [TestController],
    })
    class TestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer
          .apply((req, res, next) => res.send(WILDCARD_VALUE))
          .forRoutes('tests/*path', 'legacy-wildcard/*')
          .apply((req, res, next) => res.send(SCOPED_VALUE))
          .exclude('exclude')
          .forRoutes(TestController)
          .apply((req, res, next) => res.send(RETURN_VALUE))
          .exclude('exclude')
          .forRoutes('*');
      }
    }

    async function createApp(
      beforeInit?: (app: INestApplication) => void,
    ): Promise<INestApplication> {
      const app = (
        await Test.createTestingModule({
          imports: [TestModule],
        }).compile()
      ).createNestApplication();

      if (beforeInit) {
        beforeInit(app);
      }
      await app.init();

      return app;
    }

    it(`forRoutes(*)`, async () => {
      app = await createApp();
      await request(app.getHttpServer())
        .get('/hello')
        .expect(200, RETURN_VALUE);
      await request(app.getHttpServer())
        .get('/exclude')
        .expect(200, EXCLUDE_VALUE);
    });

    it(`forRoutes(*) with global prefix`, async () => {
      app = await createApp(app => app.setGlobalPrefix('api'));
      await request(app.getHttpServer())
        .get('/api/hello')
        .expect(200, RETURN_VALUE);
      await request(app.getHttpServer()).get('/api').expect(200, RETURN_VALUE);
      await request(app.getHttpServer())
        .get('/api/exclude')
        .expect(200, EXCLUDE_VALUE);
    });

    it(`forRoutes(TestController)`, async () => {
      app = await createApp();
      await request(app.getHttpServer()).get('/test').expect(200, SCOPED_VALUE);
      await request(app.getHttpServer())
        .get('/exclude')
        .expect(200, EXCLUDE_VALUE);
    });

    it(`forRoutes(tests/*)`, async () => {
      app = await createApp();
      return request(app.getHttpServer())
        .get('/tests/wildcard')
        .expect(200, WILDCARD_VALUE);
    });

    it(`forRoutes(legacy-wildcard/*)`, async () => {
      app = await createApp();
      return request(app.getHttpServer())
        .get('/legacy-wildcard/overview')
        .expect(200, WILDCARD_VALUE);
    });

    afterEach(async () => {
      await app.close();
    });
  });

  describe('should have data attached in middleware', () => {
    let app: INestApplication;

    @Controller()
    class DataController {
      @Get('data')
      data(@Req() req: any) {
        return {
          success: true,
          extras: req?.extras,
          pong: req?.headers?.ping,
        };
      }

      @Get('pong')
      pong(@Req() req: any) {
        return { success: true, pong: req?.headers?.ping };
      }

      @Get('')
      rootPath() {
        return { success: true, root: true };
      }
    }

    @Module({
      controllers: [DataController],
    })
    class DataModule implements NestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer
          .apply((req, res, next) => {
            req.extras = { data: 'Data attached in middleware' };
            req.headers['ping'] = 'pong';

            if (req.originalUrl === '/api') {
              return res.json({
                success: true,
                extras: req.extras,
                pong: req.headers.ping,
              });
            }

            next();
          })
          .forRoutes('*');
      }
    }

    beforeEach(async () => {
      app = (
        await Test.createTestingModule({
          imports: [DataModule],
        }).compile()
      ).createNestApplication();
    });

    it(`GET forRoutes('*') with global prefix`, async () => {
      app.setGlobalPrefix('/api');
      await app.init();

      await request(app.getHttpServer()).get('/api/pong').expect(200, {
        success: true,
        pong: 'pong',
      });

      await request(app.getHttpServer())
        .get('/api')
        .expect(200, {
          success: true,
          extras: { data: 'Data attached in middleware' },
          pong: 'pong',
        });
    });

    it(`GET forRoutes('*') without prefix config`, async () => {
      await app.init();

      await request(app.getHttpServer()).get('/pong').expect(200, {
        success: true,
        pong: 'pong',
      });
    });

    it(`GET forRoutes('*') with global prefix and exclude patterns`, async () => {
      app.setGlobalPrefix('/api', { exclude: ['/'] });
      await app.init();

      await request(app.getHttpServer())
        .get('/')
        .expect(200, { success: true, root: true });
    });

    it(`GET forRoutes('*') with global prefix and global prefix options`, async () => {
      app.setGlobalPrefix('/api', { exclude: ['/'] });
      await app.init();

      await request(app.getHttpServer())
        .get('/api/data')
        .expect(200, {
          success: true,
          extras: { data: 'Data attached in middleware' },
          pong: 'pong',
        });

      await request(app.getHttpServer())
        .get('/')
        .expect(200, { success: true, root: true });
    });

    it(`GET forRoutes('*') with global prefix that not starts with /`, async () => {
      app.setGlobalPrefix('api');
      await app.init();

      await request(app.getHttpServer())
        .get('/api/data')
        .expect(200, {
          success: true,
          extras: { data: 'Data attached in middleware' },
          pong: 'pong',
        });

      await request(app.getHttpServer()).get('/').expect(404);
    });

    afterEach(async () => {
      await app.close();
    });
  });
});
