import {
  ArgumentsHost,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  Injectable,
  MiddlewareConsumer,
  Module,
  NestMiddleware,
  NestModule,
} from '@nestjs/common';

/**
 * An http-errors-style error, as csrf, body-parser and many Express
 * middleware raise: a status, a message that may be exposed, and a code.
 */
export class CsrfError extends Error {
  readonly status = 403;
  readonly statusCode = 403;
  readonly expose = true;
  readonly code = 'EBADCSRFTOKEN';

  constructor() {
    super('invalid csrf token');
  }
}

/**
 * Answers a `CsrfError` with 499 and what it saw of the error, writing to the
 * raw response so that it works the same on every adapter.
 */
@Catch(CsrfError)
export class CsrfErrorFilter implements ExceptionFilter {
  catch(error: CsrfError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const raw = response.raw ?? response;
    raw.writeHead(499, { 'Content-Type': 'application/json' });
    raw.end(
      JSON.stringify({
        caught: error.constructor.name,
        code: error.code,
        isCsrfError: error instanceof CsrfError,
      }),
    );
  }
}

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(_req: unknown, _res: unknown, next: (error?: unknown) => void) {
    next(new CsrfError());
  }
}

@Controller()
export class ErrorsController {
  @Get('ok')
  ok() {
    return 'ok';
  }

  @Get('guarded')
  guarded() {
    return 'guarded';
  }
}

@Module({ controllers: [ErrorsController] })
export class ErrorsModule {}

@Module({ controllers: [ErrorsController] })
export class ClassMiddlewareErrorsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).forRoutes('guarded');
  }
}
