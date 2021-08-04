import {
  Controller,
  Get,
  MiddlewareConsumer,
  Module,
  Query,
  RequestMethod,
} from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { ApplicationModule } from '../src/app.module';

const FOR_ROUTE_VALUE = 'test_for_route';
const INCLUDED_VALUE = 'test_included';
const MATCH_ALL_VALUE = 'test_match_all';
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

@Controller()
class ForRouteController {
  @Get('for_route/controller')
  test() {
    return RETURN_VALUE;
  }
}

@Controller()
class ForRouteNestedController {
  @Get('for_route/controller/nested')
  test() {
    return RETURN_VALUE;
  }
}

@Module({
  imports: [ApplicationModule],
  controllers: [
    TestController,
    TestQueryController,
    ForRouteController,
    ForRouteNestedController,
  ],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => res.end(INCLUDED_VALUE))
      .forRoutes({ path: 'tests/included', method: RequestMethod.POST })
      .apply((req, res, next) => res.end(`${REQ_URL_VALUE}${req.url}`))
      .forRoutes('req/url/')
      .apply((req, res, next) => res.end(WILDCARD_VALUE))
      .forRoutes('express_style_wildcard/*', 'tests/(.*)')
      .apply((req, res, next) => res.end(QUERY_VALUE))
      .forRoutes('query')
      .apply((req, res, next) => next())
      .forRoutes(TestQueryController)
      .apply((req, res, next) => res.end(SCOPED_VALUE))
      .forRoutes(TestController)
      .apply((req, res, next) => res.end(FOR_ROUTE_VALUE))
      .forRoutes(ForRouteController)
      .apply((req, res, next) => res.end(MATCH_ALL_VALUE))
      .exclude({ path: QUERY_VALUE, method: -1 })
      .forRoutes('(.*)');
  }
}

describe('Middleware (FastifyAdapter)', () => {
  let app: NestFastifyApplication;

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
      .then(({ payload }) => expect(payload).to.be.eql(MATCH_ALL_VALUE));
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

  it(`forRoutes(req/url/)`, () => {
    const reqUrl = '/test';
    return app
      .inject({
        method: 'GET',
        url: `/req/url${reqUrl}`,
      })
      .then(({ payload }) =>
        expect(payload).to.be.eql(`${REQ_URL_VALUE}${reqUrl}`),
      );
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

  it(`GET /for_route/controller forRoutes(TestForRouteController)`, () => {
    return app
      .inject({
        method: 'GET',
        url: '/for_route/controller',
      })
      .then(({ payload }) => expect(payload).to.be.eql(FOR_ROUTE_VALUE));
  });

  it(`GET /for_route/controller/nested forRoutes((.*))`, () => {
    return app
      .inject({
        method: 'GET',
        url: '/for_route/controller/nested',
      })
      .then(({ payload }) => expect(payload).to.be.eql(MATCH_ALL_VALUE));
  });

  afterEach(async () => {
    await app.close();
  });
});
