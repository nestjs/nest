import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();

    const body = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: exception.message,
      custom: true,
    };

    if (response.status && response.json) {
      // Express-like
      response.status(status).json(body);
    } else if (response.statusCode !== undefined) {
      // Node/H3 response
      response.statusCode = status;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(body));
    }
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof Error ? exception.message : 'Unknown error';

    const body = {
      statusCode: status,
      message,
      allExceptionsFilter: true,
    };

    if (response.status && response.json) {
      response.status(status).json(body);
    } else if (response.statusCode !== undefined) {
      response.statusCode = status;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(body));
    }
  }
}
