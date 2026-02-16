import { INestApplication, Injectable, Scope } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { NestedTransientModule } from '../src/nested-transient/nested-transient.module';
import { Guard } from '../src/transient/guards/request-scoped.guard';
import { HelloController } from '../src/transient/hello.controller';
import { HelloModule } from '../src/transient/hello.module';
import { Interceptor } from '../src/transient/interceptors/logging.interceptor';
import { UserByIdPipe } from '../src/transient/users/user-by-id.pipe';
import { UsersService } from '../src/transient/users/users.service';

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

    before(async () => {
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
      before(async () => {
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
        expect(HelloController.COUNTER).to.be.eql(3);
      });

      it(`should create service for each request`, () => {
        expect(UsersService.COUNTER).to.be.eql(3);
      });

      it(`should create provider for each inquirer`, () => {
        expect(Meta.COUNTER).to.be.eql(7);
      });

      it(`should create transient pipe for each controller (3 requests, 1 static)`, () => {
        expect(UserByIdPipe.COUNTER).to.be.eql(4);
      });

      it(`should create transient interceptor for each controller (3 requests, 1 static)`, () => {
        expect(Interceptor.COUNTER).to.be.eql(4);
      });

      it(`should create transient guard for each controller (3 requests, 1 static)`, () => {
        expect(Guard.COUNTER).to.be.eql(4);
      });
    });

    after(async () => {
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

    before(async () => {
      const module = await Test.createTestingModule({
        providers: [FirstService, SecondService, LoggerService, DeepTransient],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    it('should create a new instance of the transient provider for each provider', async () => {
      const firstService1 = app.get(FirstService);

      expect(firstService1.secondService.loggerService.context).to.equal(
        'SecondService',
      );
      expect(firstService1.loggerService.context).to.equal('FirstService');
      expect(firstService1.deepTransient.initialized).to.be.true;
    });

    after(async () => {
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

    before(async () => {
      DeepNestedTransient.constructorCalled = false;

      const module = await Test.createTestingModule({
        providers: [RootService, MiddleTransient, DeepNestedTransient],
      }).compile();

      app = module.createNestApplication();
      await app.init();
    });

    it('should call constructor of deeply nested TRANSIENT provider', () => {
      const rootService = app.get(RootService);

      expect(DeepNestedTransient.constructorCalled).to.be.true;
      expect(rootService.middle.nested).to.be.instanceOf(DeepNestedTransient);
    });

    after(async () => {
      await app.close();
    });
  });

  describe('when nested transient providers are used in request scope', () => {
    let server: any;
    let app: INestApplication;

    before(async () => {
      const module = await Test.createTestingModule({
        imports: [NestedTransientModule],
      }).compile();

      app = module.createNestApplication();
      server = app.getHttpServer();
      await app.init();
    });

    describe('when handling HTTP requests', () => {
      let response: any;

      before(async () => {
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
        expect(response.body.firstServiceContext).to.equal(
          'NESTED-FirstService',
        );
        expect(response.body.secondServiceContext).to.equal(
          'NESTED-SecondService',
        );
        expect(response.body.firstServiceNestedId).to.not.equal(
          response.body.secondServiceNestedId,
        );
      });
    });

    after(async () => {
      await app.close();
    });
  });
});
