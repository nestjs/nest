import {
  ArgumentsHost,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  HttpException,
  Injectable,
  MiddlewareConsumer,
  Module,
  NestMiddleware,
  NestModule,
} from '@nestjs/common';
import { join } from 'path';

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
 * Answers the `HttpException` that a client error from a middleware is mapped
 * to with 499 and what it saw of the exception and of its cause, the original
 * error, writing to the raw response so that it works the same on every
 * adapter.
 */
@Catch(HttpException)
export class CsrfErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const raw = response.raw ?? response;
    const cause = exception.cause as CsrfError | undefined;
    raw.writeHead(499, { 'Content-Type': 'application/json' });
    raw.end(
      JSON.stringify({
        status: exception.getStatus(),
        cause: cause?.constructor.name,
        code: cause?.code,
        isCsrfError: cause instanceof CsrfError,
      }),
    );
  }
}

/**
 * Answers every exception with an error page sent through res.sendFile(), as
 * applications do for their own 404 page, and counts its calls.
 */
@Catch()
export class ErrorPageFilter implements ExceptionFilter {
  calls = 0;

  catch(_exception: unknown, host: ArgumentsHost) {
    this.calls++;
    host
      .switchToHttp()
      .getResponse()
      .status(404)
      .sendFile(join(process.cwd(), 'Readme.md'));
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
