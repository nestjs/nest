import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from '../utils/http-exception-body.util';

export class BadRequestException extends HttpException {
  constructor(message?: string | object | any, error = 'Bad Request') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.BAD_REQUEST),
      HttpStatus.BAD_REQUEST,
    );
  }
}
