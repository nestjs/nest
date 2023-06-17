import {
  Controller,
  Get,
  MiddlewareConsumer,
  Module,
  NestMiddleware,
  NestModule,
  Query,
  Req,
  RequestMethod,
} from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { AppModule } from '../src/app.module';

describe('Middleware (FastifyAdapter)', () => {
  let app: NestFastifyApplication;

  describe('should return expected values depending on the route', () => {
    const INCLUDED_VALUE = 'test_included';
    const QUERY_VALUE = 'test_query';
    const REQ_URL_VALUE = 'test_req_url';
    const RETURN_VALUE = 'test';
    const SCOPED_VALUE = 'test_scoped';
    const WILDCARD_VALUE = 'test_wildcard';

    @Controller()
    class TestController {
      @Get('express_style_wildcard/wildcard_nested')
      express_style_wildcard() {
        return RETURN_VALUE;
      }

      @Get('test')
      test() {
        return RETURN_VALUE;
      }

      @Get('query')
      query() {
        return RETURN_VALUE;
      }

      @Get('tests/wildcard_nested')
      wildcard_nested() {
        return RETURN_VALUE;
      }

      @Get('tests/included')
      included() {
        return RETURN_VALUE;
      }
    }

    @Controller(QUERY_VALUE)
    class TestQueryController {
      @Get()
      [QUERY_VALUE](@Query('test') test: string) {
        return test;
      }
    }

    @Module({
      imports: [AppModule],
      controllers: [TestController, TestQueryController],
    })
    class TestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer
          .apply((req, res, next) => res.end(INCLUDED_VALUE))
          .forRoutes({ path: 'tests/included', method: RequestMethod.POST })
          .apply((req, res, next) => res.end(REQ_URL_VALUE))
          .forRoutes('req/url/(.*)')
          .apply((req, res, next) => res.end(WILDCARD_VALUE))
          .forRoutes('express_style_wildcard/*', 'tests/(.*)')
          .apply((req, res, next) => res.end(QUERY_VALUE))
          .forRoutes('query')
          .apply((req, res, next) => next())
          .forRoutes(TestQueryController)
          .apply((req, res, next) => res.end(SCOPED_VALUE))
          .forRoutes(TestController)
          .apply((req, res, next) => res.end(RETURN_VALUE))
          .exclude({ path: QUERY_VALUE, method: -1 as any })
          .forRoutes('(.*)');
      }
    }

    beforeEach(async () => {
      app = (
        await Test.createTestingModule({
          imports: [TestModule],
        }).compile()
      ).createNestApplication<NestFastifyApplication>(new FastifyAdapter());

      await app.init();
    });

    it(`forRoutes((.*))`, () => {
      return app
        .inject({
          method: 'GET',
          url: '/hello',
        })
        .then(({ payload }) => expect(payload).to.be.eql(RETURN_VALUE));
    });

    it(`forRoutes(TestController)`, () => {
      return app
        .inject({
          method: 'GET',
          url: '/test',
        })
        .then(({ payload }) => expect(payload).to.be.eql(SCOPED_VALUE));
    });

    it(`query?test=${QUERY_VALUE} forRoutes(query)`, () => {
      return app
        .inject({
          method: 'GET',
          url: '/query',
          query: {
            test: QUERY_VALUE,
          },
        })
        .then(({ payload }) => expect(payload).to.be.eql(QUERY_VALUE));
    });

    it(`${QUERY_VALUE}?test=${QUERY_VALUE} forRoutes(${QUERY_VALUE})`, () => {
      return app
        .inject({
          method: 'GET',
          url: QUERY_VALUE,
          query: {
            test: QUERY_VALUE,
          },
        })
        .then(({ payload }) => expect(payload).to.be.eql(QUERY_VALUE));
    });

    it(`forRoutes(tests/(.*))`, () => {
      return app
        .inject({
          method: 'GET',
          url: '/tests/wildcard_nested',
        })
        .then(({ payload }) => expect(payload).to.be.eql(WILDCARD_VALUE));
    });

    it(`forRoutes(express_style_wildcard/*)`, () => {
      return app
        .inject({
          method: 'GET',
          url: '/express_style_wildcard/wildcard_nested',
        })
        .then(({ payload }) => expect(payload).to.be.eql(WILDCARD_VALUE));
    });

    it(`forRoutes(req/url/)`, () => {
      const reqUrl = '/test';
      return app
        .inject({
          method: 'GET',
          url: `/req/url${reqUrl}`,
        })
        .then(({ payload }) => expect(payload).to.be.eql(REQ_URL_VALUE));
    });

    it(`GET forRoutes(POST tests/included)`, () => {
      return app
        .inject({
          method: 'GET',
          url: '/tests/included',
        })
        .then(({ payload }) => expect(payload).to.be.eql(WILDCARD_VALUE));
    });

    it(`POST forRoutes(POST tests/included)`, () => {
      return app
        .inject({
          method: 'POST',
          url: '/tests/included',
        })
        .then(({ payload }) => expect(payload).to.be.eql(INCLUDED_VALUE));
    });

    afterEach(async () => {
      await app.close();
    });
  });

  describe('should execute middleware only once for given routes', () => {
    class Middleware implements NestMiddleware {
      use(request: any, reply: any, next: () => void) {
        if (request.middlewareExecutionCount === undefined) {
          request.middlewareExecutionCount = 1;
        } else {
          request.middlewareExecutionCount++;
        }
        next();
      }
    }

    @Controller()
    class AbcController {
      @Get('/a')
      async a(@Req() request: any) {
        return this.validateExecutionCount({
          request,
          expected: 1,
        });
      }

      @Get('/a/b')
      async ab(@Req() request: any) {
        return this.validateExecutionCount({
          request,
          expected: 1,
        });
      }

      @Get('/a/b/c')
      async abc(@Req() request: any) {
        return this.validateExecutionCount({
          request,
          expected: 1,
        });
      }

      @Get('/similar')
      async withSimilar(@Req() request: any) {
        return this.validateExecutionCount({
          request,
          expected: 1,
        });
      }

      @Get('/similar/test')
      async withSimilarTest(@Req() request: any) {
        return this.validateExecutionCount({
          request,
          expected: 1,
        });
      }

      @Get('/similar/:id')
      async withSimilarId(@Req() request: any) {
        return this.validateExecutionCount({
          request,
          expected: 1,
        });
      }

      private validateExecutionCount({
        request,
        expected,
      }: {
        request: any;
        expected: number;
      }) {
        let actual: number | undefined;
        actual = request.raw.middlewareExecutionCount;
        actual ??= 0;

        return {
          success: actual === expected,
          actual,
          expected,
        };
      }
    }

    @Module({
      controllers: [AbcController],
    })
    class TestModule implements NestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer.apply(Middleware).forRoutes(AbcController);
      }
    }

    beforeEach(async () => {
      app = (
        await Test.createTestingModule({
          imports: [TestModule],
        }).compile()
      ).createNestApplication<NestFastifyApplication>(new FastifyAdapter());

      await app.init();
    });

    it(`GET forRoutes(/a/b/c)`, () => {
      return app
        .inject({
          method: 'GET',
          url: '/a/b/c',
        })
        .then(({ payload }) => {
          expect(payload).to.be.eql(
            JSON.stringify({
              success: true,
              actual: 1,
              expected: 1,
            }),
          );
        });
    });

    it(`GET forRoutes(/a/b)`, () => {
      return app
        .inject({
          method: 'GET',
          url: '/a/b',
        })
        .then(({ payload }) =>
          expect(payload).to.be.eql(
            JSON.stringify({
              success: true,
              actual: 1,
              expected: 1,
            }),
          ),
        );
    });

    it(`GET forRoutes(/a)`, () => {
      return app
        .inject({
          method: 'GET',
          url: '/a',
        })
        .then(({ payload }) =>
          expect(payload).to.be.eql(
            JSON.stringify({
              success: true,
              actual: 1,
              expected: 1,
            }),
          ),
        );
    });

    it(`GET forRoutes(/similar)`, () => {
      return app
        .inject({
          method: 'GET',
          url: '/similar',
        })
        .then(({ payload }) =>
          expect(payload).to.be.eql(
            JSON.stringify({
              success: true,
              actual: 1,
              expected: 1,
            }),
          ),
        );
    });

    it(`GET forRoutes(/similar/test)`, () => {
      return app
        .inject({
          method: 'GET',
          url: '/similar/test',
        })
        .then(({ payload }) =>
          expect(payload).to.be.eql(
            JSON.stringify({
              success: true,
              actual: 1,
              expected: 1,
            }),
          ),
        );
    });

    it(`GET forRoutes(/similar/arbitrary)`, () => {
      return app
        .inject({
          method: 'GET',
          url: '/similar/arbitrary',
        })
        .then(({ payload }) =>
          expect(payload).to.be.eql(
            JSON.stringify({
              success: true,
              actual: 1,
              expected: 1,
            }),
          ),
        );
    });

    afterEach(async () => {
      await app.close();
    });
  });
});
