import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

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

describe('Middleware', () => {
  let app: INestApplication;

  it(`forRoutes(*)`, async () => {
    app = await createApp();
    await request(app.getHttpServer()).get('/hello').expect(200, RETURN_VALUE);
    await request(app.getHttpServer())
      .get('/exclude')
      .expect(200, EXCLUDE_VALUE);
  });

  it(`forRoutes(*) with global prefix`, async () => {
    app = await createApp(app => app.setGlobalPrefix('api'));
    await request(app.getHttpServer())
      .get('/api/hello')
      .expect(200, RETURN_VALUE);
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
