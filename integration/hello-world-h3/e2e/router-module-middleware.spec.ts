import { Controller, Get, MiddlewareConsumer, Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { H3Adapter, NestH3Application } from '@nestjs/platform-h3';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

const RETURN_VALUE = 'test';
const SCOPED_VALUE = 'test_scoped';

@Controller()
class TestController {
  @Get('test')
  test() {
    return RETURN_VALUE;
  }

  @Get('test2')
  test2() {
    return RETURN_VALUE;
  }
}

@Module({
  imports: [AppModule],
  controllers: [TestController],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: any, res: any, next: () => void) => {
        res.statusCode = 200;
        res.end(SCOPED_VALUE);
      })
      .forRoutes(TestController);
  }
}

describe('RouterModule with Middleware (H3 adapter)', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        TestModule,
        RouterModule.register([
          {
            path: '/module-path/',
            module: TestModule,
          },
        ]),
      ],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('forRoutes(TestController) - /test', () => {
    return request(app.getHttpServer())
      .get('/module-path/test')
      .expect(200, SCOPED_VALUE);
  });

  it('forRoutes(TestController) - /test2', () => {
    return request(app.getHttpServer())
      .get('/module-path/test2')
      .expect(200, SCOPED_VALUE);
  });
});
