import {
  Global,
  INestApplication,
  MiddlewareConsumer,
  Module,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

const RETURN_VALUE_A = 'test_A';
const RETURN_VALUE_B = 'test_B';
const RETURN_VALUE_X = 'test_X';
const RETURN_VALUE_GLOBAL = 'test_GLOBAL';

@Global()
@Module({})
class GlobalModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.send(RETURN_VALUE_GLOBAL))
      .forRoutes('ping');
  }
}

@Global()
@Module({})
class GlobalModule2 {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.send(RETURN_VALUE_GLOBAL + '2'))
      .forRoutes('ping');
  }
}

@Module({ imports: [GlobalModule, GlobalModule2] })
class ModuleX {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.send(RETURN_VALUE_X))
      .forRoutes('hello')
      .apply((req, res, next) => res.send(RETURN_VALUE_X))
      .forRoutes('ping');
  }
}

@Module({ imports: [ModuleX] })
class ModuleA {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.send(RETURN_VALUE_A))
      .forRoutes('hello')
      .apply((req, res, next) => res.send(RETURN_VALUE_A))
      .forRoutes('ping');
  }
}

@Module({
  imports: [ModuleA],
})
class ModuleB {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.send(RETURN_VALUE_B))
      .forRoutes('hello')
      .apply((req, res, next) => res.send(RETURN_VALUE_B))
      .forRoutes('ping');
  }
}

@Module({
  imports: [ModuleB],
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

    await app.init();
  });

  it(`should execute middleware in topological order`, () => {
    return request(app.getHttpServer())
      .get('/hello')
      .expect(200, RETURN_VALUE_B);
  });

  it('should execute global middleware first', () => {
    return request(app.getHttpServer())
      .get('/ping')
      .expect(200, RETURN_VALUE_GLOBAL);
  });

  afterEach(async () => {
    await app.close();
  });
});
