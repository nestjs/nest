import { createHttpExceptionBody } from '../../../helpers';
import { HttpException } from './http.exception';
import { HttpStatus } from '../../../enums';

export class BadRequestException extends HttpException {
  constructor(message?: any, error = 'Bad Request') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.BAD_REQUEST),
      HttpStatus.BAD_REQUEST,
    );
  }
}
