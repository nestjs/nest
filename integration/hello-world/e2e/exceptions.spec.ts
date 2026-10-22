import {
  ArgumentsHost,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  HttpException,
  HttpStatus,
  INestApplication,
  InternalServerErrorException,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
  RouteSchema,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { RawServerDefault } from 'fastify';
import createError from 'http-errors';
import request from 'supertest';
import { ErrorsController } from '../src/errors/errors.controller.js';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

@Controller()
class ErrorBodyController {
  @Get('error-body')
  findAll() {
    throw new UnauthorizedException(new Error('invalid signature'));
  }
}

@Controller()
class ErrorCauseController {
  @Get('error-cause')
  findAll() {
    throw new InternalServerErrorException('Oops', { cause: createError(404) });
  }
}

@Catch(HttpException)
class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse()
      .status(exception.getStatus())
      .send({ caught: exception.getStatus() });
  }
}

@Controller()
class SchemaController {
  @RouteSchema({ body: { type: 'object', required: ['name'] } })
  @Post('schema')
  create() {}
}

@Controller()
class SlowController {
  @Get('slow')
  findAll() {
    return new Promise(() => {});
  }
}

describe('Error messages', () => {
  let server: RawServerDefault;

  describe('Express', () => {
    let app: INestApplication;
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [
          ErrorsController,
          ErrorBodyController,
          ErrorCauseController,
        ],
      }).compile();

      app = module.createNestApplication();
      app.use('/middleware-error', (req, res, next) =>
        next(createError(503, 'connect ECONNREFUSED 127.0.0.1:6379')),
      );
      server = app.getHttpServer();
      await listenOnLoopback(app);
    });

    it(`/GET`, () => {
      return request(server)
        .get('/sync')
        .expect(HttpStatus.BAD_REQUEST)
        .expect({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Integration test',
        });
    });

    it(`/GET (Promise/async)`, () => {
      return request(server)
        .get('/async')
        .expect(HttpStatus.BAD_REQUEST)
        .expect({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Integration test',
        });
    });

    it(`/GET (InternalServerError despite custom content-type)`, async () => {
      return request(server)
        .get('/unexpected-error')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .expect({
          statusCode: 500,
          message: 'Internal server error',
        });
    });

    it(`/GET (InternalServerError when Error instance has statusCode)`, async () => {
      return request(server)
        .get('/error-with-status-code')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .expect({
          statusCode: 500,
          message: 'Internal server error',
        });
    });

    it(`/GET (Unauthorized when the body of the HttpException is an Error)`, async () => {
      return request(server)
        .get('/error-body')
        .expect(HttpStatus.UNAUTHORIZED)
        .expect({
          statusCode: 401,
          message: 'Unauthorized',
        });
    });

    it(`/GET (ServiceUnavailable logged when a middleware passes an "http-errors" error to next())`, async () => {
      const logError = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      await request(server)
        .get('/middleware-error')
        .expect(HttpStatus.SERVICE_UNAVAILABLE)
        .expect({
          statusCode: 503,
          message: 'Service Unavailable',
        });
      expect(logError).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          statusCode: 503,
          message: 'connect ECONNREFUSED 127.0.0.1:6379',
        }),
      );
    });

    it(`/GET (InternalServerError not logged when its cause is a 4xx "http-errors" error)`, async () => {
      const logError = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      await request(server)
        .get('/error-cause')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .expect({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Oops',
        });
      expect(logError).not.toHaveBeenCalled();
    });

    afterEach(async () => {
      await app.close();
      vi.restoreAllMocks();
    });
  });

  describe('Fastify', () => {
    let app: NestFastifyApplication;
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [ErrorsController, SchemaController, ErrorBodyController],
      }).compile();

      app = module.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );
      app.use('/middleware-error', (req, res, next) =>
        next(createError(503, 'connect ECONNREFUSED 127.0.0.1:6379')),
      );
      server = app.getHttpServer();
      await listenOnLoopback(app);
    });

    it(`/GET`, async () => {
      return app
        .inject({
          method: 'GET',
          url: '/sync',
        })
        .then(({ payload, statusCode }) => {
          expect(statusCode).toBe(HttpStatus.BAD_REQUEST);
          expect(JSON.parse(payload)).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Integration test',
          });
        });
    });

    it(`/GET (Promise/async)`, async () => {
      return app
        .inject({
          method: 'GET',
          url: '/async',
        })
        .then(({ payload, statusCode }) => {
          expect(statusCode).toBe(HttpStatus.BAD_REQUEST);
          expect(JSON.parse(payload)).toEqual({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Integration test',
          });
        });
    });

    it(`/GET (InternalServerError despite custom content-type)`, async () => {
      return app
        .inject({
          method: 'GET',
          url: '/unexpected-error',
        })
        .then(({ payload, statusCode }) => {
          expect(statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect(JSON.parse(payload)).toEqual({
            statusCode: 500,
            message: 'Internal server error',
          });
        });
    });

    it(`/GET (InternalServerError when Error instance has statusCode)`, async () => {
      return app
        .inject({
          method: 'GET',
          url: '/error-with-status-code',
        })
        .then(({ payload, statusCode }) => {
          expect(statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect(JSON.parse(payload)).toEqual({
            statusCode: 500,
            message: 'Internal server error',
          });
        });
    });

    it(`/GET (Unauthorized when the body of the HttpException is an Error)`, async () => {
      return app
        .inject({
          method: 'GET',
          url: '/error-body',
        })
        .then(({ payload, statusCode }) => {
          expect(statusCode).toBe(HttpStatus.UNAUTHORIZED);
          expect(JSON.parse(payload)).toEqual({
            statusCode: 401,
            message: 'Unauthorized',
          });
        });
    });

    it(`/POST (BadRequest when the route schema rejects the body)`, async () => {
      return app
        .inject({
          method: 'POST',
          url: '/schema',
          payload: {},
        })
        .then(({ payload, statusCode }) => {
          expect(statusCode).toBe(HttpStatus.BAD_REQUEST);
          expect(JSON.parse(payload)).toEqual({
            statusCode: 400,
            message: "body must have required property 'name'",
          });
        });
    });

    it(`/GET (ServiceUnavailable logged when a middleware passes an "http-errors" error to next())`, async () => {
      const logError = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      const { payload, statusCode } = await app.inject({
        method: 'GET',
        url: '/middleware-error',
      });
      expect(statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(JSON.parse(payload)).toEqual({
        statusCode: 503,
        message: 'Service Unavailable',
      });
      expect(logError).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          statusCode: 503,
          message: 'connect ECONNREFUSED 127.0.0.1:6379',
        }),
      );
    });

    afterEach(async () => {
      await app.close();
      vi.restoreAllMocks();
    });
  });
  describe('Fastify (HttpException filter)', () => {
    let app: NestFastifyApplication;
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [ErrorsController, SchemaController],
      }).compile();

      app = module.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );
      app.useGlobalFilters(new HttpExceptionFilter());
      app.use('/middleware-error', (req, res, next) =>
        next(createError(413, 'request entity too large')),
      );
      await listenOnLoopback(app);
    });

    it(`/GET (a 4xx "http-errors" error from a middleware reaches the filter)`, async () => {
      const { payload, statusCode } = await app.inject({
        method: 'GET',
        url: '/middleware-error',
      });
      expect(statusCode).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
      expect(JSON.parse(payload)).toEqual({ caught: 413 });
    });

    it(`/POST (a 4xx FastifyError reaches the filter)`, async () => {
      const { payload, statusCode } = await app.inject({
        method: 'POST',
        url: '/schema',
        headers: { 'content-type': 'text/foo' },
        payload: 'name',
      });
      expect(statusCode).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      expect(JSON.parse(payload)).toEqual({ caught: 415 });
    });

    afterEach(async () => {
      await app.close();
    });
  });
  describe('Fastify (handlerTimeout)', () => {
    let app: NestFastifyApplication;
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [SlowController],
      }).compile();

      app = module.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter({ handlerTimeout: 50 }),
      );
      await listenOnLoopback(app);
    });

    it(`/GET (ServiceUnavailable logged when the route exceeds "handlerTimeout")`, async () => {
      const logError = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      const { payload, statusCode } = await app.inject({
        method: 'GET',
        url: '/slow',
      });
      expect(statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(JSON.parse(payload)).toEqual({
        statusCode: 503,
        message: "Request timed out after 50 ms on route '/slow'",
      });
      expect(logError).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          code: 'FST_ERR_HANDLER_TIMEOUT',
          statusCode: 503,
        }),
      );
    });

    afterEach(async () => {
      await app.close();
      vi.restoreAllMocks();
    });
  });
});
