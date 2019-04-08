import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from '../utils/http-exception-body.util';

export class CanceledException extends HttpException {
  constructor(
    message?: string | object | any,
    error = 'Client Closed Request',
  ) {
    super(
      createHttpExceptionBody(message, error, HttpStatus.CLIENT_CLOSED_REQUEST),
      HttpStatus.CLIENT_CLOSED_REQUEST,
    );
  }
}
