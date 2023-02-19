import { INestApplication, MiddlewareConsumer, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

@Module({
  imports: [],
})
class ModuleC {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => {
        res.append('x-trace', 'module-c');
        next();
      })
      .forRoutes('*');
  }
}

@Module({
  imports: [],
})
class ModuleB {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => {
        res.append('x-trace', 'module-b');
        next();
      })
      .forRoutes('*');
  }
}
@Module({ imports: [ModuleB] })
class ModuleA {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => {
        res.append('x-trace', 'module-a');
        next();
      })
      .forRoutes('*');
  }
}

@Module({
  imports: [ModuleA, ModuleC],
})
class TestModule {}

describe('Middleware (execution order)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = (
      await Test.createTestingModule({
        imports: [TestModule],
      }).compile()
    ).createNestApplication();

    app.use((req, res, next) => {
      res.append('x-trace', 'global');
      next();
    });

    await app.init();
  });

  it(`should execute middleware in topological order`, () => {
    return request(app.getHttpServer())
      .get('/')
      .expect('x-trace', 'global, module-a, module-b, module-c');
  });

  afterEach(async () => {
    await app.close();
  });
});
