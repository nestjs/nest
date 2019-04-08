import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from '../utils/http-exception-body.util';

export class TooManyRequestsException extends HttpException {
  constructor(message?: string | object | any, error = 'Too Many Request') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.TOO_MANY_REQUESTS),
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
