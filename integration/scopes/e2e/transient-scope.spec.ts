import { INestApplication, Injectable, Scope } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { NestedTransientModule } from '../src/nested-transient/nested-transient.module.js';
import { Guard } from '../src/transient/guards/request-scoped.guard.js';
import { HelloController } from '../src/transient/hello.controller.js';
import { HelloModule } from '../src/transient/hello.module.js';
import { Interceptor } from '../src/transient/interceptors/logging.interceptor.js';
import { UserByIdPipe } from '../src/transient/users/user-by-id.pipe.js';
import { UsersService } from '../src/transient/users/users.service.js';

class Meta {
  static COUNTER = 0;
  constructor() {
    Meta.COUNTER++;
  }
}

describe('Transient scope', () => {
  describe('when transient scope is used', () => {
    let server: any;
    let app: INestApplication;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [
          HelloModule.forRoot({
            provide: 'META',
            useClass: Meta,
            scope: Scope.TRANSIENT,
          }),
        ],
      }).compile();

      app = module.createNestApplication();
      server = app.getHttpServer();
      await app.init();
    });

    describe('and when one service is request scoped', () => {
      beforeAll(async () => {
        const performHttpCall = end =>
          request(server)
            .get('/hello')
            .end(err => {
              if (err) return end(err);
              end();
            });
        await new Promise<any>(resolve => performHttpCall(resolve));
        await new Promise<any>(resolve => performHttpCall(resolve));
        await new Promise<any>(resolve => performHttpCall(resolve));
      });

      it(`should create controller for each request`, () => {
        expect(HelloController.COUNTER).toEqual(3);
      });

      it(`should create service for each request`, () => {
        expect(UsersService.COUNTER).toEqual(3);
      });

      it(`should create provider for each inquirer`, () => {
        expect(Meta.COUNTER).toEqual(7);
      });

      it(`should create transient pipe for each controller (3 requests, 1 static)`, () => {
        expect(UserByIdPipe.COUNTER).toEqual(4);
      });

      it(`should create transient interceptor for each controller (3 requests, 1 static)`, () => {
        expect(Interceptor.COUNTER).toEqual(4);
      });

      it(`should create transient guard for each controller (3 requests, 1 static)`, () => {
        expect(Guard.COUNTER).toEqual(4);
      });
    });

    afterAll(async () => {
      await app.close();
    });
  });

  describe('when there is a nested structure of transient providers', () => {
    let app: INestApplication;

    @Injectable({ scope: Scope.TRANSIENT })
    class DeepTransient {
      public initialized = false;

      constructor() {
        this.initialized = true;
      }
    }

    @Injectable({ scope: Scope.TRANSIENT })
    class LoggerService {
      public context?: string;
    }

    @Injectable({ scope: Scope.TRANSIENT })
    class SecondService {
      constructor(public readonly loggerService: LoggerService) {
        this.loggerService.context = 'SecondService';
      }
    }

    @Injectable()
    class FirstService {
      constructor(
        public readonly secondService: SecondService,
        public readonly loggerService: LoggerService,
        public readonly deepTransient: DeepTransient,
      ) {
        this.loggerService.context = 'FirstService';
      }
    }

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        providers: [FirstService, SecondService, LoggerService, DeepTransient],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    it('should create a new instance of the transient provider for each provider', async () => {
      const firstService1 = app.get(FirstService);

      expect(firstService1.secondService.loggerService.context).toBe(
        'SecondService',
      );
      expect(firstService1.loggerService.context).toBe('FirstService');
      expect(firstService1.deepTransient.initialized).toBe(true);
    });

    afterAll(async () => {
      await app.close();
    });
  });

  describe('when DEFAULT scoped provider has deeply nested TRANSIENT chain', () => {
    let app: INestApplication;

    @Injectable({ scope: Scope.TRANSIENT })
    class DeepNestedTransient {
      public static constructorCalled = false;

      constructor() {
        DeepNestedTransient.constructorCalled = true;
      }
    }

    @Injectable({ scope: Scope.TRANSIENT })
    class MiddleTransient {
      constructor(public readonly nested: DeepNestedTransient) {}
    }

    @Injectable()
    class RootService {
      constructor(public readonly middle: MiddleTransient) {}
    }

    beforeAll(async () => {
      DeepNestedTransient.constructorCalled = false;

      const module = await Test.createTestingModule({
        providers: [RootService, MiddleTransient, DeepNestedTransient],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    it('should call constructor of deeply nested TRANSIENT provider', () => {
      const rootService = app.get(RootService);

      expect(DeepNestedTransient.constructorCalled).toBe(true);
      expect(rootService.middle.nested).toBeInstanceOf(DeepNestedTransient);
    });

    afterAll(async () => {
      await app.close();
    });
  });

  describe('when multiple DEFAULT parents inject the same TRANSIENT -> TRANSIENT chain', () => {
    let app: INestApplication;

    @Injectable({ scope: Scope.TRANSIENT })
    class IsolatedNestedTransient {
      public static instanceCount = 0;
      public readonly instanceId: number;

      constructor() {
        IsolatedNestedTransient.instanceCount++;
        this.instanceId = IsolatedNestedTransient.instanceCount;
      }
    }

    @Injectable({ scope: Scope.TRANSIENT })
    class IsolatedTransientLogger {
      public static instanceCount = 0;
      public readonly instanceId: number;

      constructor(public readonly nested: IsolatedNestedTransient) {
        IsolatedTransientLogger.instanceCount++;
        this.instanceId = IsolatedTransientLogger.instanceCount;
      }
    }

    @Injectable()
    class ServiceA {
      constructor(public readonly logger: IsolatedTransientLogger) {}
    }

    @Injectable()
    class ServiceB {
      constructor(public readonly logger: IsolatedTransientLogger) {}
    }

    beforeAll(async () => {
      IsolatedNestedTransient.instanceCount = 0;
      IsolatedTransientLogger.instanceCount = 0;

      const module = await Test.createTestingModule({
        providers: [
          ServiceA,
          ServiceB,
          IsolatedTransientLogger,
          IsolatedNestedTransient,
        ],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    it('should create separate TransientLogger instances for each DEFAULT parent', () => {
      const serviceA = app.get(ServiceA);
      const serviceB = app.get(ServiceB);

      expect(serviceA.logger.instanceId).to.not.equal(
        serviceB.logger.instanceId,
      );
    });

    it('should create separate nested TRANSIENT instances for each DEFAULT parent', () => {
      const serviceA = app.get(ServiceA);
      const serviceB = app.get(ServiceB);

      expect(serviceA.logger.nested.instanceId).to.not.equal(
        serviceB.logger.nested.instanceId,
      );
    });

    afterAll(async () => {
      await app.close();
    });
  });

  describe('when multiple DEFAULT parents inject a deeply nested TRANSIENT chain', () => {
    let app: INestApplication;

    @Injectable({ scope: Scope.TRANSIENT })
    class DepthSixTransient {
      public static constructorCalled = false;
      public static instanceCount = 0;
      public readonly instanceId: number;
      public readonly initialized = true;

      constructor() {
        DepthSixTransient.constructorCalled = true;
        DepthSixTransient.instanceCount++;
        this.instanceId = DepthSixTransient.instanceCount;
      }
    }

    @Injectable({ scope: Scope.TRANSIENT })
    class DepthFiveTransient {
      public static constructorCalled = false;
      public static instanceCount = 0;
      public readonly instanceId: number;

      constructor(public readonly next: DepthSixTransient) {
        DepthFiveTransient.constructorCalled = true;
        DepthFiveTransient.instanceCount++;
        this.instanceId = DepthFiveTransient.instanceCount;
      }
    }

    @Injectable({ scope: Scope.TRANSIENT })
    class DepthFourTransient {
      public static constructorCalled = false;

      constructor(public readonly next: DepthFiveTransient) {
        DepthFourTransient.constructorCalled = true;
      }
    }

    @Injectable({ scope: Scope.TRANSIENT })
    class DepthThreeTransient {
      public static constructorCalled = false;

      constructor(public readonly next: DepthFourTransient) {
        DepthThreeTransient.constructorCalled = true;
      }
    }

    @Injectable({ scope: Scope.TRANSIENT })
    class DepthTwoTransient {
      public static constructorCalled = false;

      constructor(public readonly next: DepthThreeTransient) {
        DepthTwoTransient.constructorCalled = true;
      }
    }

    @Injectable({ scope: Scope.TRANSIENT })
    class DepthOneTransient {
      public static constructorCalled = false;

      constructor(public readonly next: DepthTwoTransient) {
        DepthOneTransient.constructorCalled = true;
      }
    }

    @Injectable()
    class DeepServiceA {
      constructor(public readonly chain: DepthOneTransient) {}
    }

    @Injectable()
    class DeepServiceB {
      constructor(public readonly chain: DepthOneTransient) {}
    }

    beforeAll(async () => {
      DepthOneTransient.constructorCalled = false;
      DepthTwoTransient.constructorCalled = false;
      DepthThreeTransient.constructorCalled = false;
      DepthFourTransient.constructorCalled = false;
      DepthFiveTransient.constructorCalled = false;
      DepthSixTransient.constructorCalled = false;
      DepthFiveTransient.instanceCount = 0;
      DepthSixTransient.instanceCount = 0;

      const module = await Test.createTestingModule({
        providers: [
          DeepServiceA,
          DeepServiceB,
          DepthOneTransient,
          DepthTwoTransient,
          DepthThreeTransient,
          DepthFourTransient,
          DepthFiveTransient,
          DepthSixTransient,
        ],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    it('should create separate level-5 transient instances for each DEFAULT parent', () => {
      const serviceA = app.get(DeepServiceA);
      const serviceB = app.get(DeepServiceB);

      expect(serviceA.chain.next.next.next.next.instanceId).to.not.equal(
        serviceB.chain.next.next.next.next.instanceId,
      );
    });

    it('should create separate level-6 transient instances for each DEFAULT parent', () => {
      const serviceA = app.get(DeepServiceA);
      const serviceB = app.get(DeepServiceB);

      expect(serviceA.chain.next.next.next.next.next.instanceId).to.not.equal(
        serviceB.chain.next.next.next.next.next.instanceId,
      );
      expect(serviceA.chain.next.next.next.next.next.initialized).to.be.true;
      expect(serviceB.chain.next.next.next.next.next.initialized).to.be.true;
    });

    it('should call constructors for every transient provider in the deep chain', () => {
      app.get(DeepServiceA);
      app.get(DeepServiceB);

      expect(DepthOneTransient.constructorCalled).to.be.true;
      expect(DepthTwoTransient.constructorCalled).to.be.true;
      expect(DepthThreeTransient.constructorCalled).to.be.true;
      expect(DepthFourTransient.constructorCalled).to.be.true;
      expect(DepthFiveTransient.constructorCalled).to.be.true;
      expect(DepthSixTransient.constructorCalled).to.be.true;
    });

    afterAll(async () => {
      await app.close();
    });
  });

  describe('when nested transient providers are used in request scope', () => {
    let server: any;
    let app: INestApplication;

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        imports: [NestedTransientModule],
      }).compile();

      app = module.createNestApplication();
      server = app.getHttpServer();
      await app.init();
    });

    describe('when handling HTTP requests', () => {
      let response: any;

      beforeAll(async () => {
        const performHttpCall = () =>
          new Promise<any>((resolve, reject) => {
            request(server)
              .get('/nested-transient')
              .end((err, res) => {
                if (err) return reject(err);
                resolve(res);
              });
          });

        response = await performHttpCall();
      });

      it('should isolate nested transient instances for each parent service', () => {
        expect(response.body.firstServiceContext).toBe('NESTED-FirstService');
        expect(response.body.secondServiceContext).toBe('NESTED-SecondService');
        expect(response.body.firstServiceNestedId).not.toBe(
          response.body.secondServiceNestedId,
        );
      });
    });

    afterAll(async () => {
      await app.close();
    });
  });
});
