import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from './../utils/http-exception-body.util';

export class ServiceUnavailableException extends HttpException {
  constructor(message?: string | object | any, error = 'Service Unavailable') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.SERVICE_UNAVAILABLE),
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }
}
