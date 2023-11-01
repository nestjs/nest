import {
  Injectable,
  MiddlewareConsumer,
  Module,
  NestMiddleware,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { expect } from 'chai';

describe('Middleware overriding', () => {
  @Injectable()
  class MiddlewareA implements NestMiddleware {
    use(req, res, next) {
      middlewareAApplied = true;
      next();
    }
  }

  function MiddlewareAOverride(req, res, next) {
    middlewareAOverrideApplied = true;
    next();
  }

  function MiddlewareB(req, res, next) {
    middlewareBApplied = true;
    next();
  }

  @Injectable()
  class MiddlewareBOverride implements NestMiddleware {
    use(req, res, next) {
      middlewareBOverrideApplied = true;
      next();
    }
  }

  @Injectable()
  class MiddlewareC implements NestMiddleware {
    use(req, res, next) {
      middlewareCApplied = true;
      next();
    }
  }

  @Injectable()
  class MiddlewareC1Override implements NestMiddleware {
    use(req, res, next) {
      middlewareC1OverrideApplied = true;
      next();
    }
  }

  function MiddlewareC2Override(req, res, next) {
    middlewareC2OverrideApplied = true;
    next();
  }

  @Module({})
  class AppModule {
    configure(consumer: MiddlewareConsumer) {
      return consumer
        .apply(MiddlewareA)
        .forRoutes('a')
        .apply(MiddlewareB)
        .forRoutes('b')
        .apply(MiddlewareC)
        .forRoutes('c');
    }
  }

  let middlewareAApplied: boolean;
  let middlewareAOverrideApplied: boolean;

  let middlewareBApplied: boolean;
  let middlewareBOverrideApplied: boolean;

  let middlewareCApplied: boolean;
  let middlewareC1OverrideApplied: boolean;
  let middlewareC2OverrideApplied: boolean;

  const resetMiddlewareApplicationFlags = () => {
    middlewareAApplied =
      middlewareAOverrideApplied =
      middlewareBApplied =
      middlewareBOverrideApplied =
      middlewareCApplied =
      middlewareC1OverrideApplied =
      middlewareC2OverrideApplied =
        false;
  };

  beforeEach(() => {
    resetMiddlewareApplicationFlags();
  });
  
  it('should override class middleware', async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideMiddleware(MiddlewareA)
      .use(MiddlewareAOverride)
      .overrideMiddleware(MiddlewareC)
      .use(MiddlewareC1Override, MiddlewareC2Override)
      .compile();

    const app = testingModule.createNestApplication();
    await app.init();

    await request(app.getHttpServer()).get('/a');

    expect(middlewareAApplied).to.be.false;
    expect(middlewareAOverrideApplied).to.be.true;
    expect(middlewareBApplied).to.be.false;
    expect(middlewareBOverrideApplied).to.be.false;
    expect(middlewareCApplied).to.be.false;
    expect(middlewareC1OverrideApplied).to.be.false;
    expect(middlewareC2OverrideApplied).to.be.false;
    resetMiddlewareApplicationFlags();

    await request(app.getHttpServer()).get('/b');

    expect(middlewareAApplied).to.be.false;
    expect(middlewareAOverrideApplied).to.be.false;
    expect(middlewareBApplied).to.be.true;
    expect(middlewareBOverrideApplied).to.be.false;
    expect(middlewareCApplied).to.be.false;
    expect(middlewareC1OverrideApplied).to.be.false;
    expect(middlewareC2OverrideApplied).to.be.false;
    resetMiddlewareApplicationFlags();

    await request(app.getHttpServer()).get('/c');

    expect(middlewareAApplied).to.be.false;
    expect(middlewareAOverrideApplied).to.be.false;
    expect(middlewareBApplied).to.be.false;
    expect(middlewareBOverrideApplied).to.be.false;
    expect(middlewareCApplied).to.be.false;
    expect(middlewareC1OverrideApplied).to.be.true;
    expect(middlewareC2OverrideApplied).to.be.true;
    resetMiddlewareApplicationFlags();

    await app.close();
  });

  it('should override functional middleware', async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideMiddleware(MiddlewareB)
      .use(MiddlewareBOverride)
      .compile();

    const app = testingModule.createNestApplication();
    await app.init();

    await request(app.getHttpServer()).get('/a');

    expect(middlewareAApplied).to.be.true;
    expect(middlewareAOverrideApplied).to.be.false;
    expect(middlewareBApplied).to.be.false;
    expect(middlewareBOverrideApplied).to.be.false;
    expect(middlewareCApplied).to.be.false;
    expect(middlewareC1OverrideApplied).to.be.false;
    expect(middlewareC2OverrideApplied).to.be.false;
    resetMiddlewareApplicationFlags();

    await request(app.getHttpServer()).get('/b');

    expect(middlewareAApplied).to.be.false;
    expect(middlewareAOverrideApplied).to.be.false;
    expect(middlewareBApplied).to.be.false;
    expect(middlewareBOverrideApplied).to.be.true;
    expect(middlewareCApplied).to.be.false;
    expect(middlewareC1OverrideApplied).to.be.false;
    expect(middlewareC2OverrideApplied).to.be.false;
    resetMiddlewareApplicationFlags();

    await request(app.getHttpServer()).get('/c');

    expect(middlewareAApplied).to.be.false;
    expect(middlewareAOverrideApplied).to.be.false;
    expect(middlewareBApplied).to.be.false;
    expect(middlewareBOverrideApplied).to.be.false;
    expect(middlewareCApplied).to.be.true;
    expect(middlewareC1OverrideApplied).to.be.false;
    expect(middlewareC2OverrideApplied).to.be.false;
    resetMiddlewareApplicationFlags();

    await app.close();
  });
});
