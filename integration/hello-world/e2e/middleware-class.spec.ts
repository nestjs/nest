import {
  Controller,
  Get,
  INestApplication,
  Injectable,
  MiddlewareConsumer,
  Module,
  Param,
  RequestMethod,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { ApplicationModule } from '../src/app.module';
import { Response } from 'express';

const OPTIONAL_PARAM_VALUE = 'test_optional_param';
const FOR_ROUTE_CONTROLLER_VALUE = 'test_for_route_controller';
const FOR_ROUTE_PATH_VALUE = 'test_for_route_path';
const INCLUDED_VALUE = 'test_included';
const RETURN_VALUE = 'test';
const WILDCARD_VALUE = 'test_wildcard';

@Injectable()
class Middleware {
  use(req, res, next) {
    res.send(WILDCARD_VALUE);
  }
}

@Controller()
class TestController {
  @Get('test')
  test() {
    return RETURN_VALUE;
  }
}

@Controller(OPTIONAL_PARAM_VALUE)
class TestParamController {
  @Get(':test')
  [OPTIONAL_PARAM_VALUE]() {
    return RETURN_VALUE;
  }
}

@Controller()
class ForRouteController {
  @Get('for_route_controller')
  forRouteController() {
    return RETURN_VALUE;
  }

  @Get('for_route_controller/required_param/:param')
  requiredParam() {
    return RETURN_VALUE;
  }
}

@Module({
  imports: [ApplicationModule],
  controllers: [TestController, TestParamController, ForRouteController],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res: Response, next) => res.status(201).end(INCLUDED_VALUE))
      .forRoutes({ path: 'tests/included', method: RequestMethod.POST })
      .apply((req, res: Response, next) => res.end(FOR_ROUTE_PATH_VALUE))
      .forRoutes({
        path: 'for_route_path',
        method: RequestMethod.GET,
        isRequestMapping: false,
      })
      .apply((req, res: Response, next) => res.end(FOR_ROUTE_CONTROLLER_VALUE))
      .forRoutes(ForRouteController)
      .apply((req, res, next) => res.end(OPTIONAL_PARAM_VALUE))
      .forRoutes({
        path: `${OPTIONAL_PARAM_VALUE}/(:test)?`,
        method: RequestMethod.GET,
      })
      .apply(Middleware)
      .exclude({
        path: `${OPTIONAL_PARAM_VALUE}/(.*)`,
        method: RequestMethod.ALL,
      })
      .forRoutes('*');
  }
}

describe('Middleware (class)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = (
      await Test.createTestingModule({
        imports: [TestModule],
      }).compile()
    ).createNestApplication();

    await app.init();
  });

  it(`forRoutes(*)`, () => {
    return request(app.getHttpServer())
      .get('/hello')
      .expect(200, WILDCARD_VALUE);
  });

  it(`/test forRoutes(*)`, () => {
    return request(app.getHttpServer())
      .get('/test')
      .expect(200, WILDCARD_VALUE);
  });

  it(`GET forRoutes(POST tests/included)`, () => {
    return request(app.getHttpServer())
      .get('/tests/included')
      .expect(200, WILDCARD_VALUE);
  });

  it(`POST forRoutes(POST tests/included)`, () => {
    return request(app.getHttpServer())
      .post('/tests/included')
      .expect(201, INCLUDED_VALUE);
  });

  it(`/for_route_path forRoutes(/for_route_path)`, () => {
    return request(app.getHttpServer())
      .get('/for_route_path')
      .expect(200, FOR_ROUTE_PATH_VALUE);
  });

  it(`/for_route_path/test forRoutes(/for_route_path)`, () => {
    return request(app.getHttpServer())
      .get('/for_route_path/test')
      .expect(200, FOR_ROUTE_PATH_VALUE);
  });

  it(`/for_route_controller forRoutes(ForRouteController)`, () => {
    return request(app.getHttpServer())
      .get('/for_route_controller')
      .expect(200, FOR_ROUTE_CONTROLLER_VALUE);
  });

  it(`/for_route_controller/test forRoutes(ForRouteController)`, () => {
    return request(app.getHttpServer())
      .get('/for_route_controller/test')
      .expect(200, WILDCARD_VALUE);
  });

  it(`/for_route_controller/required_param/ forRoutes(ForRouteController)`, () => {
    return request(app.getHttpServer())
      .get('/for_route_controller/required_param/')
      .expect(200, WILDCARD_VALUE);
  });

  it(`/for_route_controller/required_param/test forRoutes(ForRouteController)`, () => {
    return request(app.getHttpServer())
      .get('/for_route_controller/required_param/test')
      .expect(200, FOR_ROUTE_CONTROLLER_VALUE);
  });

  it(`/${OPTIONAL_PARAM_VALUE}/ forRoutes(${OPTIONAL_PARAM_VALUE}/(:test)?)`, () => {
    return request(app.getHttpServer())
      .get(`/${OPTIONAL_PARAM_VALUE}/`)
      .expect(200, OPTIONAL_PARAM_VALUE);
  });

  it(`/${OPTIONAL_PARAM_VALUE}/test forRoutes(${OPTIONAL_PARAM_VALUE}/(:test)?)`, () => {
    return request(app.getHttpServer())
      .get(`/${OPTIONAL_PARAM_VALUE}/test`)
      .expect(200, OPTIONAL_PARAM_VALUE);
  });

  afterEach(async () => {
    await app.close();
  });
});
