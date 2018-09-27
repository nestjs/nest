import { createHttpExceptionBody } from '../../../helpers';
import { HttpException } from './http.exception';
import { HttpStatus } from '../../../enums';

export class GoneException extends HttpException {
  constructor(message?: any, error = 'Gone') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.GONE),
      HttpStatus.GONE,
    );
  }
}
