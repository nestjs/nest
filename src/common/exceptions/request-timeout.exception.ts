import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from './../utils/http-exception-body.util';

export class RequestTimeoutException extends HttpException {
  constructor(message?: string | object | any, error = 'Request Timeout') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.REQUEST_TIMEOUT),
      HttpStatus.REQUEST_TIMEOUT
    );
  }
}
