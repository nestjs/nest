import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
} from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

const RETURN_VALUE = 'test';
const MIDDLEWARE_VALUE = 'middleware';

@Controller('tail/')
class TrailingSlashController {
  @Get('child')
  child() {
    return RETURN_VALUE;
  }
}

@Controller('cats')
class CatsController {
  @Get()
  findAll() {
    return RETURN_VALUE;
  }
}

@Module({
  controllers: [TrailingSlashController, CatsController],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.send(MIDDLEWARE_VALUE))
      .forRoutes(TrailingSlashController, CatsController);
  }
}

// The routes themselves are registered with their slashes normalized, so the
// paths `forRoutes(Controller)` derives must be normalized the same way or the
// middleware never matches the route it was bound to.
describe('Middleware bound to a controller (path joining)', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  async function createApp(imports: any[] = []) {
    app = (
      await Test.createTestingModule({
        imports: [TestModule, ...imports],
      }).compile()
    ).createNestApplication();
    await listenOnLoopback(app);
  }

  it('runs for a controller path ending in a slash', async () => {
    await createApp();

    await request(app.getHttpServer())
      .get('/tail/child')
      .expect(200, MIDDLEWARE_VALUE);
  });

  it('runs for a controller mounted at the RouterModule root', async () => {
    await createApp([
      RouterModule.register([{ path: '/', module: TestModule }]),
    ]);

    await request(app.getHttpServer())
      .get('/cats')
      .expect(200, MIDDLEWARE_VALUE);
  });

  it('runs for a controller path ending in a slash under a RouterModule path', async () => {
    await createApp([
      RouterModule.register([{ path: 'parent', module: TestModule }]),
    ]);

    await request(app.getHttpServer())
      .get('/parent/tail/child')
      .expect(200, MIDDLEWARE_VALUE);
  });
});
