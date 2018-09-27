import { createHttpExceptionBody } from '../../../helpers';
import { HttpException } from './http.exception';
import { HttpStatus } from '../../../enums';

export class ForbiddenException extends HttpException {
  constructor(message?: any, error = 'Forbidden') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.FORBIDDEN),
      HttpStatus.FORBIDDEN,
    );
  }
}
