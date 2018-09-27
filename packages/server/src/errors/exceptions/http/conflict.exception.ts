import { createHttpExceptionBody } from '../../../helpers';
import { HttpException } from './http.exception';
import { HttpStatus } from '../../../enums';

export class ConflictException extends HttpException {
  constructor(message?: any, error = 'Conflict') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.CONFLICT),
      HttpStatus.CONFLICT,
    );
  }
}
