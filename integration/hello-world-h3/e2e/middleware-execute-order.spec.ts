import { Global, MiddlewareConsumer, Module } from '@nestjs/common';
import { H3Adapter, NestH3Application } from '@nestjs/platform-h3';
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
      .apply((req: any, res: any, next: () => void) => {
        res.statusCode = 200;
        res.end(RETURN_VALUE_GLOBAL);
      })
      .forRoutes('ping');
  }
}

@Global()
@Module({})
class GlobalModule2 {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: any, res: any, next: () => void) => {
        res.statusCode = 200;
        res.end(RETURN_VALUE_GLOBAL + '2');
      })
      .forRoutes('ping');
  }
}

@Module({ imports: [GlobalModule, GlobalModule2] })
class ModuleX {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: any, res: any, next: () => void) => {
        res.statusCode = 200;
        res.end(RETURN_VALUE_X);
      })
      .forRoutes('hello')
      .apply((req: any, res: any, next: () => void) => {
        res.statusCode = 200;
        res.end(RETURN_VALUE_X);
      })
      .forRoutes('ping');
  }
}

@Module({ imports: [ModuleX] })
class ModuleA {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: any, res: any, next: () => void) => {
        res.statusCode = 200;
        res.end(RETURN_VALUE_A);
      })
      .forRoutes('hello')
      .apply((req: any, res: any, next: () => void) => {
        res.statusCode = 200;
        res.end(RETURN_VALUE_A);
      })
      .forRoutes('ping');
  }
}

@Module({
  imports: [ModuleA],
})
class ModuleB {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: any, res: any, next: () => void) => {
        res.statusCode = 200;
        res.end(RETURN_VALUE_B);
      })
      .forRoutes('hello')
      .apply((req: any, res: any, next: () => void) => {
        res.statusCode = 200;
        res.end(RETURN_VALUE_B);
      })
      .forRoutes('ping');
  }
}

@Module({
  imports: [ModuleB],
})
class TestModule {}

describe('Middleware execution order (H3 adapter)', () => {
  let app: NestH3Application;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should execute middleware in topological order', () => {
    return request(app.getHttpServer())
      .get('/hello')
      .expect(200, RETURN_VALUE_B);
  });

  it('should execute global middleware first', () => {
    return request(app.getHttpServer())
      .get('/ping')
      .expect(200, RETURN_VALUE_GLOBAL);
  });
});
