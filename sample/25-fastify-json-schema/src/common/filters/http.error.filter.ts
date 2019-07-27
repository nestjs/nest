import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = exception.getStatus
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    if ((exception as any).validation) {
      status = 400;
    }
    const errorResponse = {
      code: status,
      timestamp: new Date().toLocaleDateString(),
      path: request.raw.url,
      method: request.raw.method,
      message:
        status !== HttpStatus.INTERNAL_SERVER_ERROR
          ? exception.message.message ||
          exception.message.error ||
          exception.message ||
          null
          : 'Internal server error',
      validation: (exception as any).validation || {},
    };

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      Logger.error(
        `${request.raw.method} ${request.raw.url} ${
          request.raw.method === 'POST' || request.raw.method === 'PUT'
            ? request.raw.body
            : ''
          }`,
        exception.stack,
        'ExceptionFilter',
      );
    } else {
      Logger.error(
        `${request.raw.method} ${request.raw.url} ${
          request.raw.method === 'POST' || request.raw.method === 'PUT'
            ? request.raw.body
            : ''
          }`,
        JSON.stringify(errorResponse),
        'ExceptionFilter',
      );
    }
    response.status(status).send(errorResponse);
  }
}
