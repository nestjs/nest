import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from '../utils/http-exception-body.util';

export class NotImplementedException extends HttpException {
  constructor(message?: string | object | any, error = 'Not Implemented') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.NOT_IMPLEMENTED),
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
